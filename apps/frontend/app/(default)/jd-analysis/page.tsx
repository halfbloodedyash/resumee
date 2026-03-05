'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dropdown } from '@/components/ui/dropdown';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { DiffPreviewModal } from '@/components/tailor/diff-preview-modal';
import { useStatusCache } from '@/lib/context/status-cache';
import { useResumePreview } from '@/components/common/resume_previewer_context';
import type { ImprovedResult } from '@/components/common/resume_previewer_context';
import type { ResumeData } from '@/components/dashboard/resume-component';
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Target,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  X,
  Wand2,
} from 'lucide-react';
import { useTranslations } from '@/lib/i18n';
import { analyzeJD, parseJDDocument, type JDAnalysisResult } from '@/lib/api/jd-analysis';
import {
  uploadJobDescriptions,
  previewImproveResume,
  confirmImproveResume,
} from '@/lib/api/resume';
import { fetchPromptConfig, type PromptOption } from '@/lib/api/config';

// ---------------------------------------------------------------------------
// Score ring component
// ---------------------------------------------------------------------------
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color = score >= 75 ? '#15803D' : score >= 50 ? '#F97316' : '#DC2626';

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E5E5"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="butt"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score bar component
// ---------------------------------------------------------------------------
function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? 'bg-green-700' : score >= 50 ? 'bg-orange-500' : 'bg-red-600';

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-xs">{label}</span>
        <span className="text-xs font-bold">{score}%</span>
      </div>
      <div className="h-2 bg-muted w-full">
        <div
          className={`h-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tag chip component
// ---------------------------------------------------------------------------
function TagChip({ text, variant }: { text: string; variant: 'green' | 'red' | 'blue' | 'gray' }) {
  const styles = {
    green: 'bg-green-50 text-green-800 border-green-300',
    red: 'bg-red-50 text-red-800 border-red-300',
    blue: 'bg-primary/10 text-blue-800 border-blue-300',
    gray: 'bg-muted/50 text-foreground border-border',
  };

  return (
    <span className={`inline-block px-2 py-0.5 text-xs border rounded-lg ${styles[variant]}`}>
      {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Priority badge
// ---------------------------------------------------------------------------
function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const styles = {
    high: 'bg-red-100 text-red-800 border-red-400',
    medium: 'bg-orange-100 text-orange-800 border-orange-400',
    low: 'bg-blue-100 text-blue-800 border-blue-400',
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-bold border rounded-lg ${styles[priority]}`}
    >
      {priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------
function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  count,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border bg-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <span className="text-sm font-bold flex items-center gap-2">
          {title}
          {count !== undefined && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-lg">{count}</span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-border">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results panel
// ---------------------------------------------------------------------------
function AnalysisResults({
  result,
  t,
  onAnalyzeAnother,
  onTailorResume,
  isTailoring,
  promptOptions,
  selectedPromptId,
  onPromptChange,
  promptLoading,
}: {
  result: JDAnalysisResult;
  t: (key: string, params?: Record<string, string | number>) => string;
  onAnalyzeAnother: () => void;
  onTailorResume: () => void;
  isTailoring: boolean;
  promptOptions: PromptOption[];
  selectedPromptId: string;
  onPromptChange: (value: string) => void;
  promptLoading: boolean;
}) {
  const r = result;
  const tr = (key: string, params?: Record<string, string | number>) =>
    t(`jdAnalysis.results.${key}`, params);

  return (
    <div className="space-y-6">
      {/* Header with score */}
      <div className="border border-border bg-card shadow-sm p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ScoreRing score={r.ats_score} />
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight">{tr('atsScore')}</h2>
            {r.job_title && (
              <p className="text-sm text-primary mt-1">
                {tr('jobTitle')}: {r.job_title}
                {r.company_name ? ` @ ${r.company_name}` : ''}
              </p>
            )}
            {r.seniority_level && r.seniority_level !== 'unknown' && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {tr('seniorityLevel')}: {r.seniority_level}
              </p>
            )}
            <p className="font-sans text-sm text-foreground mt-3 leading-relaxed">
              {r.overall_assessment}
            </p>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="border border-border bg-card shadow-sm p-6">
        <h3 className="text-lg font-bold tracking-tight mb-4">{tr('scoreBreakdown')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoreBar label={tr('keywordMatch')} score={r.score_breakdown.keyword_match} />
          <ScoreBar label={tr('skillsAlignment')} score={r.score_breakdown.skills_alignment} />
          <ScoreBar
            label={tr('experienceRelevance')}
            score={r.score_breakdown.experience_relevance}
          />
          <ScoreBar label={tr('educationFit')} score={r.score_breakdown.education_fit} />
          <ScoreBar label={tr('formattingScore')} score={r.score_breakdown.formatting_score} />
        </div>
      </div>

      {/* Experience Gap */}
      <div className="border border-border bg-card shadow-sm p-6">
        <h3 className="text-lg font-bold tracking-tight mb-3">{tr('experienceGap')}</h3>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-sm">
            <span className="text-muted-foreground">{tr('requiredYears')}: </span>
            <span className="font-bold">
              {r.experience_gap.required_years !== null
                ? tr('years', { count: r.experience_gap.required_years })
                : tr('notSpecified')}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">{tr('candidateYears')}: </span>
            <span className="font-bold">
              {r.experience_gap.candidate_years !== null
                ? tr('years', { count: r.experience_gap.candidate_years })
                : tr('notSpecified')}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {r.experience_gap.meets_requirement ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-green-700" />
                <span className="text-xs text-green-700 font-bold">{tr('meetsRequirement')}</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600 font-bold">{tr('doesNotMeet')}</span>
              </>
            )}
          </div>
        </div>
        {r.experience_gap.assessment && (
          <p className="font-sans text-sm text-muted-foreground mt-2">
            {r.experience_gap.assessment}
          </p>
        )}
      </div>

      {/* Skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CollapsibleSection title={tr('matchingSkills')} count={r.matching_skills.length}>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {r.matching_skills.map((s) => (
              <TagChip key={s} text={s} variant="green" />
            ))}
            {r.matching_skills.length === 0 && (
              <span className="text-xs text-muted-foreground/60">None found</span>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={tr('missingSkills')} count={r.missing_skills.length}>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {r.missing_skills.map((s) => (
              <TagChip key={s} text={s} variant="red" />
            ))}
            {r.missing_skills.length === 0 && (
              <span className="text-xs text-muted-foreground/60">None</span>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Keywords */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CollapsibleSection
          title={tr('matchingKeywords')}
          count={r.matching_keywords.length}
          defaultOpen={false}
        >
          <div className="flex flex-wrap gap-1.5 mt-3">
            {r.matching_keywords.map((k) => (
              <TagChip key={k} text={k} variant="blue" />
            ))}
            {r.matching_keywords.length === 0 && (
              <span className="text-xs text-muted-foreground/60">None found</span>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title={tr('missingKeywords')}
          count={r.missing_keywords.length}
          defaultOpen={false}
        >
          <div className="flex flex-wrap gap-1.5 mt-3">
            {r.missing_keywords.map((k) => (
              <TagChip key={k} text={k} variant="red" />
            ))}
            {r.missing_keywords.length === 0 && (
              <span className="text-xs text-muted-foreground/60">None</span>
            )}
          </div>
        </CollapsibleSection>
      </div>

      {/* Priority Changes */}
      {r.priority_changes.length > 0 && (
        <CollapsibleSection title={tr('priorityChanges')} count={r.priority_changes.length}>
          <div className="space-y-3 mt-3">
            {r.priority_changes.map((change, idx) => (
              <div key={idx} className="border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={change.priority} />
                  <span className="text-[10px] text-muted-foreground">{change.section}</span>
                </div>
                {change.current_text && (
                  <div>
                    <span className="text-[10px] text-muted-foreground/60">
                      {tr('currentText')}:
                    </span>
                    <p className="font-sans text-sm text-muted-foreground line-through">
                      {change.current_text}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] text-green-700">{tr('suggestedChange')}:</span>
                  <p className="font-sans text-sm text-foreground font-medium">
                    {change.suggested_change}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-primary">{tr('reason')}:</span>
                  <p className="font-sans text-xs text-muted-foreground">{change.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {r.strengths.length > 0 && (
          <CollapsibleSection title={tr('strengths')} count={r.strengths.length}>
            <ul className="space-y-1.5 mt-3">
              {r.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-green-700 mt-0.5 shrink-0" />
                  <span className="font-sans text-sm text-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {r.weaknesses.length > 0 && (
          <CollapsibleSection title={tr('weaknesses')} count={r.weaknesses.length}>
            <ul className="space-y-1.5 mt-3">
              {r.weaknesses.map((w, i) => (
                <li key={i} className="flex items-start gap-2">
                  <TrendingDown className="w-3.5 h-3.5 text-red-600 mt-0.5 shrink-0" />
                  <span className="font-sans text-sm text-foreground">{w}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}
      </div>

      {/* Tailor Resume Section */}
      <div className="border border-primary bg-primary/10 shadow-sm p-6">
        <h3 className="text-lg font-bold tracking-tight mb-2">{tr('tailorSection')}</h3>
        <p className="font-sans text-sm text-muted-foreground mb-4">{tr('tailorDescription')}</p>

        <Dropdown
          options={
            promptOptions.length > 0
              ? promptOptions.map((opt) => ({
                  id: opt.id,
                  label: t(`tailor.promptOptions.${opt.id}.label`),
                  description: t(`tailor.promptOptions.${opt.id}.description`),
                }))
              : [
                  {
                    id: 'nudge',
                    label: t('tailor.promptOptions.nudge.label'),
                    description: t('tailor.promptOptions.nudge.description'),
                  },
                  {
                    id: 'keywords',
                    label: t('tailor.promptOptions.keywords.label'),
                    description: t('tailor.promptOptions.keywords.description'),
                  },
                  {
                    id: 'full',
                    label: t('tailor.promptOptions.full.label'),
                    description: t('tailor.promptOptions.full.description'),
                  },
                ]
          }
          value={selectedPromptId}
          onChange={onPromptChange}
          label={t('tailor.promptLabel')}
          description={t('tailor.promptDescription')}
          disabled={isTailoring || promptLoading}
        />

        <Button
          size="lg"
          onClick={onTailorResume}
          disabled={isTailoring}
          className="w-full mt-4 bg-primary hover:bg-blue-800 text-white"
        >
          {isTailoring ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {tr('tailoring')}
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              {tr('tailorNow')}
            </>
          )}
        </Button>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" className="flex-1" onClick={onAnalyzeAnother}>
          <Target className="w-4 h-4" />
          {tr('analyzeAnother')}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function JDAnalysisPage() {
  const { t } = useTranslations();
  const router = useRouter();
  const [jobDescription, setJobDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [masterResumeId, setMasterResumeId] = useState<string | null>(null);
  const [result, setResult] = useState<JDAnalysisResult | null>(null);
  const [inputMode, setInputMode] = useState<'paste' | 'upload'>('paste');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Tailor state
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [promptOptions, setPromptOptions] = useState<PromptOption[]>([]);
  const [selectedPromptId, setSelectedPromptId] = useState('keywords');
  const [promptLoading, setPromptLoading] = useState(false);
  const hasUserSelectedPrompt = useRef(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [pendingResult, setPendingResult] = useState<ImprovedResult | null>(null);
  const [diffConfirmError, setDiffConfirmError] = useState<string | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showMissingDiffDialog, setShowMissingDiffDialog] = useState(false);
  const [missingDiffResult, setMissingDiffResult] = useState<ImprovedResult | null>(null);
  const [missingDiffError, setMissingDiffError] = useState<string | null>(null);
  const missingDiffConfirmInFlight = useRef(false);

  const { setImprovedData } = useResumePreview();
  const {
    status: systemStatus,
    isLoading: statusLoading,
    incrementJobs,
    incrementImprovements,
    incrementResumes,
  } = useStatusCache();

  useEffect(() => {
    const storedId = localStorage.getItem('master_resume_id');
    setMasterResumeId(storedId);
  }, []);

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') e.stopPropagation();
  };

  const ACCEPTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  const handleFileSelect = async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('jdAnalysis.errors.invalidFileType'));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError(t('jdAnalysis.errors.fileTooLarge'));
      return;
    }

    setUploadedFile(file);
    setError(null);
    setIsParsing(true);

    try {
      const text = await parseJDDocument(file);
      setJobDescription(text);
      setInputMode('paste'); // Switch to paste view to show extracted text
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '';
      setError(msg || t('jdAnalysis.errors.parseFailed'));
      setUploadedFile(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset so selecting the same file again works
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const clearUploadedFile = () => {
    setUploadedFile(null);
    setJobDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    const trimmed = jobDescription.trim();
    if (!trimmed || !masterResumeId) return;

    if (trimmed.length < 50) {
      setError(t('jdAnalysis.errors.jobDescriptionTooShort'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const analysis = await analyzeJD(trimmed, masterResumeId);
      setResult(analysis);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '';
      if (
        msg.toLowerCase().includes('api key') ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.includes('401')
      ) {
        setError(t('jdAnalysis.errors.apiKeyError'));
      } else if (msg.toLowerCase().includes('rate limit') || msg.includes('429')) {
        setError(t('jdAnalysis.errors.rateLimit'));
      } else {
        setError(t('jdAnalysis.errors.analysisFailedGeneric'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalyzeAnother = () => {
    setResult(null);
    setJobDescription('');
    setError(null);
    setUploadedFile(null);
    setInputMode('paste');
    setTailorError(null);
  };

  // Load prompt config for tailor dropdown
  useEffect(() => {
    let cancelled = false;
    const loadPromptConfig = async () => {
      setPromptLoading(true);
      try {
        const config = await fetchPromptConfig();
        if (!cancelled) {
          setPromptOptions(config.prompt_options || []);
          if (!hasUserSelectedPrompt.current) {
            setSelectedPromptId(config.default_prompt_id || 'keywords');
          }
        }
      } catch (err) {
        console.error('Failed to load prompt config', err);
      } finally {
        if (!cancelled) setPromptLoading(false);
      }
    };
    loadPromptConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  // Tailor helpers (mirrors tailor/page.tsx logic)
  const buildConfirmPayload = (tailorResult: ImprovedResult) => {
    if (!masterResumeId) throw new Error('Master resume ID is missing.');
    const resumePreview = tailorResult.data.resume_preview;
    if (!resumePreview || typeof resumePreview !== 'object' || Array.isArray(resumePreview)) {
      throw new Error('Resume preview data is invalid.');
    }
    const previewRecord = resumePreview as unknown as Record<string, unknown>;
    if (
      !previewRecord.personalInfo ||
      typeof previewRecord.personalInfo !== 'object' ||
      Array.isArray(previewRecord.personalInfo)
    ) {
      throw new Error('Resume preview data is invalid.');
    }
    return {
      resume_id: masterResumeId,
      job_id: tailorResult.data.job_id,
      improved_data: resumePreview as ResumeData,
      improvements:
        tailorResult.data.improvements?.map((item) => ({
          suggestion: item.suggestion,
          lineNumber: typeof item.lineNumber === 'number' ? item.lineNumber : null,
        })) ?? [],
    };
  };

  const confirmAndNavigate = async (tailorResult: ImprovedResult) => {
    const confirmed = await confirmImproveResume(buildConfirmPayload(tailorResult));
    incrementImprovements();
    incrementResumes();
    setImprovedData(confirmed);
    const newResumeId = confirmed?.data?.resume_id;
    if (newResumeId) {
      router.push(`/resumes/${newResumeId}`);
    } else {
      router.push('/builder');
    }
  };

  const handleTailorResume = async () => {
    const trimmed = jobDescription.trim();
    if (!trimmed || !masterResumeId) return;

    setIsTailoring(true);
    setTailorError(null);

    try {
      // 1. Upload JD
      const jobId = await uploadJobDescriptions([trimmed], masterResumeId);
      incrementJobs();

      // 2. Preview improvement
      const previewResult = await previewImproveResume(masterResumeId, jobId, selectedPromptId);

      if (!previewResult?.data?.diff_summary || !previewResult?.data?.detailed_changes) {
        // No diff data - show confirm dialog
        setDiffConfirmError(null);
        setPendingResult(null);
        setShowDiffModal(false);
        setMissingDiffError(null);
        setMissingDiffResult(previewResult);
        setShowMissingDiffDialog(true);
        return;
      }

      // 3. Show diff preview modal
      setDiffConfirmError(null);
      setMissingDiffError(null);
      setPendingResult(previewResult);
      setShowDiffModal(true);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '';
      if (
        msg.toLowerCase().includes('api key') ||
        msg.toLowerCase().includes('unauthorized') ||
        msg.includes('401')
      ) {
        setTailorError(t('tailor.errors.apiKeyError'));
      } else if (msg.toLowerCase().includes('rate limit') || msg.includes('429')) {
        setTailorError(t('tailor.errors.rateLimit'));
      } else {
        setTailorError(t('tailor.errors.failedToPreview'));
      }
    } finally {
      setIsTailoring(false);
    }
  };

  const handleConfirmChanges = async () => {
    if (!pendingResult || isTailoring) return;
    setIsTailoring(true);
    setDiffConfirmError(null);
    try {
      await confirmAndNavigate(pendingResult);
      setShowDiffModal(false);
      setPendingResult(null);
    } catch (err) {
      console.error(err);
      const errorMessage = t('tailor.errors.failedToConfirm');
      setTailorError(errorMessage);
      setDiffConfirmError(errorMessage);
    } finally {
      setIsTailoring(false);
    }
  };

  const handleRejectChanges = () => {
    setShowDiffModal(false);
    setPendingResult(null);
    setDiffConfirmError(null);
    setShowRegenerateDialog(true);
  };

  const handleCloseDiffModal = () => {
    setShowDiffModal(false);
    setPendingResult(null);
    setDiffConfirmError(null);
  };

  const handleCloseMissingDiffDialog = () => {
    setShowMissingDiffDialog(false);
    setMissingDiffResult(null);
    setMissingDiffError(null);
    missingDiffConfirmInFlight.current = false;
  };

  const handleMissingDiffConfirm = async () => {
    if (!missingDiffResult || isTailoring || missingDiffConfirmInFlight.current) return;
    missingDiffConfirmInFlight.current = true;
    setIsTailoring(true);
    setMissingDiffError(null);
    try {
      await confirmAndNavigate(missingDiffResult);
      handleCloseMissingDiffDialog();
    } catch (err) {
      console.error(err);
      const errorMessage = t('tailor.errors.failedToConfirm');
      setTailorError(errorMessage);
      setMissingDiffError(errorMessage);
    } finally {
      missingDiffConfirmInFlight.current = false;
      setIsTailoring(false);
    }
  };

  const handleRegenerateConfirm = async () => {
    setShowRegenerateDialog(false);
    if (!masterResumeId || !jobDescription.trim()) return;
    await handleTailorResume();
  };

  // No master resume
  if (!masterResumeId && !statusLoading) {
    return (
      <div className="min-h-screen w-full bg-muted/50 flex flex-col items-center justify-center p-4 md:p-8 font-sans">
        <div className="w-full max-w-lg bg-card border border-border shadow-sm p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('jdAnalysis.noMasterResume')}</h2>
          <Link href="/dashboard">
            <Button className="mt-4">
              <ArrowRight className="w-4 h-4" />
              {t('jdAnalysis.goToDashboard')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-muted/50 flex flex-col items-center justify-start p-4 md:p-8 font-sans">
      <div className="w-full max-w-4xl">
        {/* Input card (hide when showing results) */}
        {!result && (
          <div className="bg-card border border-border shadow-sm p-8 md:p-12 lg:p-14 relative">
            {/* Back Button */}
            <Button variant="link" className="absolute top-4 left-4" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Button>

            <div className="mb-8 mt-4 text-center">
              <h1 className="text-4xl font-bold tracking-tight mb-2">
                {t('jdAnalysis.heroTitle')}
              </h1>
              <p className="text-sm text-primary font-bold">
                {'// '}
                {t('jdAnalysis.pasteJobDescription')}
              </p>
            </div>


            <div className="space-y-6">
              {/* Input mode tabs */}
              <div className="flex border-b-2 border-border">
                <button
                  onClick={() => setInputMode('paste')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                    inputMode === 'paste'
                      ? 'bg-black text-white'
                      : 'bg-transparent text-muted-foreground hover:bg-accent'
                  }`}
                  disabled={isParsing}
                >
                  <FileText className="w-4 h-4" />
                  {t('jdAnalysis.tabPasteText')}
                </button>
                <button
                  onClick={() => setInputMode('upload')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors ${
                    inputMode === 'upload'
                      ? 'bg-black text-white'
                      : 'bg-transparent text-muted-foreground hover:bg-accent'
                  }`}
                  disabled={isParsing}
                >
                  <Upload className="w-4 h-4" />
                  {t('jdAnalysis.tabUploadDocument')}
                </button>
              </div>

              {/* Paste text mode */}
              {inputMode === 'paste' && (
                <div className="relative">
                  <Textarea
                    placeholder={t('jdAnalysis.jobDescriptionPlaceholder')}
                    className="min-h-[300px] text-sm bg-card border border-border focus:ring-0 focus:border-primary resize-none p-4 rounded-lg"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    disabled={isLoading}
                  />
                  <div className="absolute bottom-2 right-2 text-xs text-muted-foreground/60 pointer-events-none">
                    {t('jdAnalysis.charactersCount', { count: jobDescription.length })}
                  </div>
                </div>
              )}

              {/* Upload document mode */}
              {inputMode === 'upload' && (
                <div>
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  {isParsing ? (
                    /* Parsing in progress */
                    <div className="min-h-[300px] border border-border bg-card flex flex-col items-center justify-center gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">
                        {t('jdAnalysis.parsingDocument')}
                      </p>
                      {uploadedFile && (
                        <p className="text-xs text-muted-foreground/60">{uploadedFile.name}</p>
                      )}
                    </div>
                  ) : uploadedFile && jobDescription ? (
                    /* File uploaded and parsed successfully */
                    <div className="min-h-[200px] border border-green-600 bg-green-50 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 border border-green-600 bg-card flex items-center justify-center">
                            <FileText className="w-5 h-5 text-green-700" />
                          </div>
                          <div>
                            <p className="text-sm font-bold">{uploadedFile.name}</p>
                            <p className="text-xs text-green-700">
                              {t('jdAnalysis.documentParsed', {
                                chars: jobDescription.length,
                              })}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={clearUploadedFile}
                          className="w-8 h-8 flex items-center justify-center border border-border hover:border-red-400 hover:bg-red-50 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="bg-card border border-green-200 p-3 max-h-[200px] overflow-y-auto">
                        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-[12]">
                          {jobDescription.slice(0, 800)}
                          {jobDescription.length > 800 ? '...' : ''}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 mt-2">
                        {t('jdAnalysis.switchToPasteToEdit')}
                      </p>
                    </div>
                  ) : (
                    /* Drop zone */
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`min-h-[300px] border border-dashed cursor-pointer flex flex-col items-center justify-center gap-4 transition-colors ${
                        isDragging
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-card hover:border-primary hover:bg-primary/10/30'
                      }`}
                    >
                      <div
                        className={`w-16 h-16 border flex items-center justify-center transition-colors ${
                          isDragging ? 'border-primary bg-blue-100' : 'border-border bg-card'
                        }`}
                      >
                        <Upload
                          className={`w-8 h-8 transition-colors ${
                            isDragging ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        />
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold">{t('jdAnalysis.dropZoneTitle')}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('jdAnalysis.dropZoneSubtitle')}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60">
                        {t('jdAnalysis.acceptedFormats')}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                  <span>!</span> {error}
                </div>
              )}

              <Button
                size="lg"
                onClick={handleAnalyze}
                disabled={isLoading || statusLoading || !jobDescription.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('jdAnalysis.analyzing')}
                  </>
                ) : statusLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('common.checking')}
                  </>
                ) : (
                  <>
                    <Target className="w-5 h-5" />
                    {t('jdAnalysis.analyzeButton')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-2">
            <Button variant="link" className="mb-4" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </Button>
            <AnalysisResults
              result={result}
              t={t}
              onAnalyzeAnother={handleAnalyzeAnother}
              onTailorResume={handleTailorResume}
              isTailoring={isTailoring}
              promptOptions={promptOptions}
              selectedPromptId={selectedPromptId}
              onPromptChange={(value) => {
                hasUserSelectedPrompt.current = true;
                setSelectedPromptId(value);
              }}
              promptLoading={promptLoading}
            />

            {/* Tailor error */}
            {tailorError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <span>!</span> {tailorError}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Diff preview modal */}
      {showDiffModal && pendingResult && (
        <DiffPreviewModal
          isOpen={showDiffModal}
          onClose={handleCloseDiffModal}
          onReject={handleRejectChanges}
          onConfirm={handleConfirmChanges}
          diffSummary={pendingResult?.data?.diff_summary}
          detailedChanges={pendingResult?.data?.detailed_changes}
          errorMessage={diffConfirmError ?? undefined}
        />
      )}

      <ConfirmDialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        title={t('tailor.regenerateDialog.title')}
        description={t('tailor.regenerateDialog.description')}
        confirmLabel={t('tailor.regenerateDialog.confirmLabel')}
        cancelLabel={t('common.cancel')}
        variant="warning"
        onConfirm={handleRegenerateConfirm}
      />

      <ConfirmDialog
        open={showMissingDiffDialog}
        onOpenChange={(open) => {
          if (!open) handleCloseMissingDiffDialog();
        }}
        title={t('tailor.missingDiffDialog.title')}
        description={t('tailor.missingDiffDialog.description')}
        confirmLabel={t('tailor.missingDiffDialog.confirmLabel')}
        cancelLabel={t('common.cancel')}
        variant="warning"
        closeOnConfirm={false}
        onConfirm={handleMissingDiffConfirm}
        onCancel={handleCloseMissingDiffDialog}
        confirmDisabled={isTailoring || !missingDiffResult}
        errorMessage={missingDiffError ?? undefined}
      />
    </div>
  );
}
