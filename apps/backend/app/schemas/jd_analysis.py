"""Pydantic models for JD analysis and ATS scoring."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class ScoreBreakdown(BaseModel):
    """Breakdown of ATS score components."""

    keyword_match: int = Field(ge=0, le=100)
    skills_alignment: int = Field(ge=0, le=100)
    experience_relevance: int = Field(ge=0, le=100)
    education_fit: int = Field(ge=0, le=100)
    formatting_score: int = Field(ge=0, le=100)


class ExperienceGap(BaseModel):
    """Experience requirement gap analysis."""

    required_years: int | None = None
    candidate_years: int | None = None
    meets_requirement: bool = True
    assessment: str = ""


class PriorityChange(BaseModel):
    """A single prioritized change recommendation."""

    priority: Literal["high", "medium", "low"]
    section: str
    current_text: str = ""
    suggested_change: str
    reason: str


class JDAnalysisRequest(BaseModel):
    """Request to analyze a job description against a resume."""

    job_description: str = Field(min_length=50)
    resume_id: str


class JDAnalysisResponse(BaseModel):
    """Full JD analysis and ATS scoring response."""

    ats_score: int = Field(ge=0, le=100)
    score_breakdown: ScoreBreakdown
    matching_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    matching_keywords: list[str] = Field(default_factory=list)
    missing_keywords: list[str] = Field(default_factory=list)
    experience_gap: ExperienceGap
    priority_changes: list[PriorityChange] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    job_title: str = ""
    company_name: str = ""
    seniority_level: str = "unknown"
    overall_assessment: str = ""
