'use client';

import { SwissGrid } from '@/components/home/swiss-grid';
import { ResumeUploadDialog } from '@/components/dashboard/resume-upload-dialog';
import { SterlingGateKineticNavigation } from '@/components/ui/sterling-gate-kinetic-navigation';
import { UserMenu } from '@/components/common/user-menu';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { useTranslations } from '@/lib/i18n';

// Optimized Imports for Performance (No Barrel Imports)
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Plus from 'lucide-react/dist/esm/icons/plus';
import FileSearch from 'lucide-react/dist/esm/icons/file-search';

import {
  fetchResume,
  fetchResumeList,
  deleteResume,
  retryProcessing,
  fetchJobDescription,
  type ResumeListItem,
} from '@/lib/api/resume';
import { useStatusCache } from '@/lib/context/status-cache';

type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'failed' | 'loading';

export default function DashboardPage() {
  const { t, locale } = useTranslations();
  const [masterResumeId, setMasterResumeId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('loading');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tailoredResumes, setTailoredResumes] = useState<ResumeListItem[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const router = useRouter();

  // Status cache for optimistic counter updates and LLM status check
  const {
    status: systemStatus,
    isLoading: statusLoading,
    incrementResumes,
    decrementResumes,
    setHasMasterResume,
  } = useStatusCache();

  // Request id guard for concurrent loadTailoredResumes invocations
  const loadRequestIdRef = useRef(0);
  // Lightweight in-memory cache for job snippets to avoid N+1 refetches
  const jobSnippetCacheRef = useRef<Record<string, string>>({});

  // Check if LLM is configured (API key is set)
  const isLlmConfigured = !statusLoading && systemStatus?.llm_configured;

  const isTailorEnabled =
    Boolean(masterResumeId) && processingStatus === 'ready' && isLlmConfigured;

  const formatDate = (value: string) => {
    if (!value) return t('common.unknown');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('common.unknown');

    const dateLocale =
      locale === 'es' ? 'es-ES' : locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US';

    return date.toLocaleDateString(dateLocale, {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const checkResumeStatus = useCallback(async (resumeId: string) => {
    try {
      setProcessingStatus('loading');
      const data = await fetchResume(resumeId);
      const status = data.raw_resume?.processing_status || 'pending';
      setProcessingStatus(status as ProcessingStatus);
    } catch (err: unknown) {
      console.error('Failed to check resume status:', err);
      // If resume not found (404), clear the stale localStorage
      if (err instanceof Error && err.message.includes('404')) {
        localStorage.removeItem('master_resume_id');
        setMasterResumeId(null);
        return;
      }
      setProcessingStatus('failed');
    }
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem('master_resume_id');
    if (storedId) {
      setMasterResumeId(storedId);
      checkResumeStatus(storedId);
    }
  }, [checkResumeStatus]);

  const loadTailoredResumes = useCallback(async () => {
    try {
      const data = await fetchResumeList(true);
      const masterFromList = data.find((r) => r.is_master);
      const storedId = localStorage.getItem('master_resume_id');
      const resolvedMasterId = masterFromList?.resume_id || storedId;

      if (resolvedMasterId) {
        localStorage.setItem('master_resume_id', resolvedMasterId);
        setMasterResumeId(resolvedMasterId);
        checkResumeStatus(resolvedMasterId);
      } else {
        localStorage.removeItem('master_resume_id');
        setMasterResumeId(null);
      }

      const filtered = data.filter((r) => r.resume_id !== resolvedMasterId);
      setTailoredResumes(filtered);

      // Only fetch job descriptions for resumes that are actually tailored
      // (identified by having a non-null parent_id). This avoids N+1 calls
      // for untailored resumes.
      const tailoredWithParent = filtered.filter((r) => r.parent_id);

      // Guard against concurrent invocations overwriting each other
      const requestId = ++loadRequestIdRef.current;

      // Fetch job description snippets for tailored resumes in parallel and attach to state
      // Use a small in-memory cache to avoid re-fetching the same snippet repeatedly.
      const jobSnippets: Record<string, string> = {};
      await Promise.all(
        tailoredWithParent.map(async (r) => {
          // Use cached snippet when available
          if (jobSnippetCacheRef.current[r.resume_id]) {
            jobSnippets[r.resume_id] = jobSnippetCacheRef.current[r.resume_id];
            return;
          }
          try {
            const jd = await fetchJobDescription(r.resume_id);
            const snippet = (jd?.content || '').slice(0, 80);
            jobSnippetCacheRef.current[r.resume_id] = snippet;
            jobSnippets[r.resume_id] = snippet;
          } catch {
            // ignore missing job descriptions and cache empty result
            jobSnippetCacheRef.current[r.resume_id] = '';
            jobSnippets[r.resume_id] = '';
          }
        })
      );

      // Only apply results if this invocation is the latest (prevents stale overwrite)
      if (requestId === loadRequestIdRef.current) {
        setTailoredResumes((prev) =>
          prev.map((r) => ({ ...r, jobSnippet: jobSnippets[r.resume_id] || '' }))
        );
      }
    } catch (err) {
      console.error('Failed to load tailored resumes:', err);
    }
  }, [checkResumeStatus]);

  useEffect(() => {
    loadTailoredResumes();
  }, [loadTailoredResumes]);

  // Refresh list when window gains focus (e.g., returning from viewer after delete)
  useEffect(() => {
    const handleFocus = () => {
      loadTailoredResumes();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadTailoredResumes, checkResumeStatus]);

  const handleUploadComplete = (resumeId: string) => {
    localStorage.setItem('master_resume_id', resumeId);
    setMasterResumeId(resumeId);
    // Check status after upload completes
    checkResumeStatus(resumeId);
    // Update cached counters
    incrementResumes();
    setHasMasterResume(true);
  };

  const handleRetryProcessing = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!masterResumeId) return;
    setIsRetrying(true);
    try {
      const result = await retryProcessing(masterResumeId);
      if (result.processing_status === 'ready') {
        setProcessingStatus('ready');
      } else if (
        result.processing_status === 'processing' ||
        result.processing_status === 'pending'
      ) {
        setProcessingStatus(result.processing_status);
      } else {
        setProcessingStatus('failed');
      }
    } catch (err) {
      console.error('Retry processing failed:', err);
      setProcessingStatus('failed');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDeleteAndReupload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const confirmDeleteAndReupload = async () => {
    if (!masterResumeId) return;
    try {
      await deleteResume(masterResumeId);
      decrementResumes();
      setHasMasterResume(false);
      localStorage.removeItem('master_resume_id');
      setMasterResumeId(null);
      setProcessingStatus('loading');
      setIsUploadDialogOpen(true);
      await loadTailoredResumes();
    } catch (err) {
      console.error('Failed to delete resume:', err);
    }
  };

  const getStatusDisplay = () => {
    switch (processingStatus) {
      case 'loading':
        return {
          text: t('dashboard.status.checking'),
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          color: 'text-muted-foreground',
        };
      case 'processing':
        return {
          text: t('dashboard.status.processing'),
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          color: 'text-blue-700',
        };
      case 'ready':
        return { text: t('dashboard.status.ready'), icon: null, color: 'text-green-700' };
      case 'failed':
        return {
          text: t('dashboard.status.failed'),
          icon: <AlertCircle className="w-3 h-3" />,
          color: 'text-red-600',
        };
      default:
        return { text: t('dashboard.status.pending'), icon: null, color: 'text-muted-foreground' };
    }
  };

  const getMonogram = (title: string): string => {
    const words = title.split(/\s+/).filter((w) => /^[a-zA-Z]/.test(w));
    return words
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase())
      .join('');
  };

  // Warm palette that complements the modern theme
  const cardPalette = [
    { bg: '#c4704b', fg: '#FFFFFF' }, // Terracotta
    { bg: '#2563eb', fg: '#FFFFFF' }, // Blue
    { bg: '#15803D', fg: '#FFFFFF' }, // Green
    { bg: '#7C3AED', fg: '#FFFFFF' }, // Violet
    { bg: '#0E7490', fg: '#FFFFFF' }, // Teal
    { bg: '#B45309', fg: '#FFFFFF' }, // Amber
    { bg: '#BE185D', fg: '#FFFFFF' }, // Rose
    { bg: '#4338CA', fg: '#FFFFFF' }, // Indigo
  ];

  const hashTitle = (title: string): number => {
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      hash = (hash << 5) - hash + title.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const totalCards = 1 + tailoredResumes.length + 1 + 1;
  const fillerCount = Math.max(0, (5 - (totalCards % 5)) % 5);
  const extraFillerCount = 5;
  // Use Tailwind classes for fillers now that we have them in config or use specific hex if needed
  // Using the hex values from before to maintain exact look, or we could map them to variants
  const fillerPalette = ['bg-muted/30', 'bg-muted/50', 'bg-muted/50', 'bg-muted/30'];

  return (
    <div className="space-y-6">
      {/* ---- Dashboard Navbar ---- */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 md:px-8 md:py-4 bg-background/80 backdrop-blur-md border-b border-border/40">
        <Link
          href="/"
          className="text-base font-bold tracking-tight text-foreground hover:text-primary transition-colors select-none"
        >
          Resume&thinsp;Matcher
        </Link>
        <div className="flex items-center gap-3">
          <UserMenu />
          <SterlingGateKineticNavigation inline />
        </div>
      </nav>

      <SwissGrid>
        {/* 1. Master Resume Logic */}
        {!masterResumeId ? (
          <ResumeUploadDialog
              open={isUploadDialogOpen}
              onOpenChange={setIsUploadDialogOpen}
              onUploadComplete={handleUploadComplete}
              trigger={
                <Card variant="interactive" className="aspect-square h-full hover:bg-primary/10">
                  <div className="flex-1 flex flex-col justify-between pointer-events-none">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <span className="text-xl text-primary leading-none">+</span>
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {t('dashboard.initializeMasterResume')}
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {t('dashboard.initializeSequence')}
                      </CardDescription>
                    </div>
                  </div>
                </Card>
              }
            />
        ) : (
          // Master Resume Exists
          <Card
            variant="interactive"
            className="aspect-square h-full"
            onClick={() => router.push(`/resumes/${masterResumeId}`)}
          >
            <div className="flex-1 flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 rounded-lg bg-primary flex items-center justify-center">
                  <span className="font-semibold text-primary-foreground text-lg">M</span>
                </div>
                <div className="flex gap-1">
                  {(processingStatus === 'failed' || processingStatus === 'processing') && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-primary/10 hover:text-primary z-10 relative"
                        onClick={handleRetryProcessing}
                        disabled={isRetrying}
                        title={t('dashboard.retryProcessing')}
                      >
                        {isRetrying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <CardTitle className="text-lg group-hover:text-primary">
                {t('dashboard.masterResume')}
              </CardTitle>

              <div
                className={`text-xs mt-auto pt-4 flex flex-col gap-2 ${getStatusDisplay().color}`}
              >
                <div className="flex items-center gap-1">
                  {getStatusDisplay().icon}
                  {t('dashboard.statusLine', { status: getStatusDisplay().text })}
                </div>
                {(processingStatus === 'failed' || processingStatus === 'processing') && (
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={handleRetryProcessing}
                      disabled={isRetrying}
                    >
                      {isRetrying
                        ? t('dashboard.retryingProcessing')
                        : t('dashboard.retryProcessing')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={handleDeleteAndReupload}
                    >
                      {t('dashboard.deleteAndReupload')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* 2. Tailored Resumes */}
        {tailoredResumes.map((resume) => {
          const title =
            resume.title || resume.jobSnippet || resume.filename || t('dashboard.tailoredResume');
          const color = cardPalette[hashTitle(title) % cardPalette.length];
          return (
            <Card
              key={resume.resume_id}
              variant="interactive"
              className="aspect-square h-full"
              onClick={() => router.push(`/resumes/${resume.resume_id}`)}
            >
              <div className="flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-6">
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: color.bg, color: color.fg }}
                  >
                    <span className="font-semibold text-sm">{getMonogram(title)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{resume.processing_status}</span>
                </div>
                <CardTitle className="text-base">
                  <span className="block font-semibold text-sm leading-tight mb-1 w-full line-clamp-2">
                    {title}
                  </span>
                </CardTitle>
                <CardDescription className="mt-auto pt-4">
                  {t('dashboard.edited', {
                    date: formatDate(resume.updated_at || resume.created_at),
                  })}{' '}
                </CardDescription>
              </div>
            </Card>
          );
        })}

        {/* 3. Create Tailored Resume */}
        <Card className="aspect-square h-full" variant="default">
          <div className="flex-1 flex flex-col items-center justify-center text-center h-full">
            <Button
              onClick={() => router.push('/tailor')}
              disabled={!isTailorEnabled}
              className="w-16 h-16 rounded-xl bg-primary text-primary-foreground shadow-sm hover:shadow-md hover:bg-primary/90 transition-all"
            >
              <Plus className="w-7 h-7" />
            </Button>
            <p className="text-xs mt-3 text-muted-foreground">{t('dashboard.createResume')}</p>
          </div>
        </Card>

        {/* 4. JD Analysis */}
        <Card
          variant="interactive"
          className="aspect-square h-full"
          onClick={() => router.push('/jd-analysis')}
        >
          <div className="flex-1 flex flex-col justify-between">
            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
              <FileSearch className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-base">{t('jdAnalysis.title')}</CardTitle>
              <CardDescription className="mt-2">{t('jdAnalysis.subtitle')}</CardDescription>
            </div>
          </div>
        </Card>

        {/* 5. Fillers */}
        {Array.from({ length: fillerCount }).map((_, index) => (
          <Card
            key={`filler-${index}`}
            variant="ghost"
            noPadding
            className="hidden md:block bg-transparent aspect-square h-full opacity-50 pointer-events-none"
          />
        ))}

        {Array.from({ length: extraFillerCount }).map((_, index) => (
          <Card
            key={`extra-filler-${index}`}
            variant="ghost"
            noPadding
            className={`hidden md:block ${fillerPalette[index % fillerPalette.length]} aspect-square h-full opacity-70 pointer-events-none`}
          />
        ))}

        <ConfirmDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          title={t('confirmations.deleteMasterResumeTitle')}
          description={t('confirmations.deleteMasterResumeDescription')}
          confirmLabel={t('dashboard.deleteAndReupload')}
          cancelLabel={t('confirmations.keepResumeCancelLabel')}
          onConfirm={confirmDeleteAndReupload}
          variant="danger"
        />
      </SwissGrid>
    </div>
  );
}
