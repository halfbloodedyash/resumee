/**
 * JD Analysis API client
 *
 * Calls the backend /api/v1/jd-analysis endpoints.
 */

import { apiFetch, apiPost } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScoreBreakdown {
  keyword_match: number;
  skills_alignment: number;
  experience_relevance: number;
  education_fit: number;
  formatting_score: number;
}

export interface ExperienceGap {
  required_years: number | null;
  candidate_years: number | null;
  meets_requirement: boolean;
  assessment: string;
}

export interface PriorityChange {
  priority: 'high' | 'medium' | 'low';
  section: string;
  current_text: string;
  suggested_change: string;
  reason: string;
}

export interface JDAnalysisResult {
  ats_score: number;
  score_breakdown: ScoreBreakdown;
  matching_skills: string[];
  missing_skills: string[];
  matching_keywords: string[];
  missing_keywords: string[];
  experience_gap: ExperienceGap;
  priority_changes: PriorityChange[];
  strengths: string[];
  weaknesses: string[];
  job_title: string;
  company_name: string;
  seniority_level: string;
  overall_assessment: string;
}

// ---------------------------------------------------------------------------
// API Functions
// ---------------------------------------------------------------------------

/**
 * Analyze a job description against a resume and get ATS scoring.
 */
export async function analyzeJD(
  jobDescription: string,
  resumeId: string
): Promise<JDAnalysisResult> {
  const res = await apiPost('/jd-analysis/analyze', {
    job_description: jobDescription,
    resume_id: resumeId,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `JD analysis failed (status ${res.status}).`);
  }

  return res.json();
}

/**
 * Upload a PDF/DOCX job-description document and extract its text.
 */
export async function parseJDDocument(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await apiFetch('/jd-analysis/parse-document', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Document parsing failed (status ${res.status}).`);
  }

  const data: { text: string } = await res.json();
  return data.text;
}
