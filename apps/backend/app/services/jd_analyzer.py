"""JD Analysis service – ATS scoring and resume gap analysis."""

import json
import logging
from typing import Any

from app.llm import complete_json
from app.prompts.jd_analysis import ANALYZE_JD_PROMPT
from app.prompts.templates import get_language_name
from app.schemas.jd_analysis import JDAnalysisResponse
from app.utils import sanitize_user_input

logger = logging.getLogger(__name__)


async def analyze_jd(
    job_description: str,
    resume_data: dict[str, Any],
    language: str = "en",
) -> JDAnalysisResponse:
    """Analyze a job description against a resume and return ATS scoring.

    Args:
        job_description: Raw job description text.
        resume_data: Parsed resume data dict (ResumeData-compatible).
        language: Output language code.

    Returns:
        JDAnalysisResponse with full ATS analysis.
    """
    sanitized_jd = sanitize_user_input(job_description)
    output_language = get_language_name(language)
    resume_json = json.dumps(resume_data, indent=2, default=str)

    prompt = ANALYZE_JD_PROMPT.format(
        job_description=sanitized_jd,
        resume_data=resume_json,
        output_language=output_language,
    )

    result = await complete_json(
        prompt=prompt,
        system_prompt="You are an expert ATS analyzer and career coach. Output only valid JSON.",
        max_tokens=4096,
    )

    # Validate through Pydantic
    analysis = JDAnalysisResponse.model_validate(result)
    return analysis
