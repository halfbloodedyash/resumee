"""JD analysis endpoints – ATS scoring and resume recommendations."""

import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.auth import get_user_id
from app.database import db
from app.schemas.jd_analysis import JDAnalysisRequest, JDAnalysisResponse
from app.services.jd_analyzer import analyze_jd
from app.services.parser import parse_document
from app.utils import get_content_language

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jd-analysis", tags=["JD Analysis"])

# Allowed file types for JD document upload
_JD_ALLOWED_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
_JD_MAX_FILE_SIZE = 4 * 1024 * 1024  # 4 MB


@router.post("/analyze", response_model=JDAnalysisResponse)
async def analyze_job_description(request: JDAnalysisRequest, user_id: str = Depends(get_user_id)) -> JDAnalysisResponse:
    """Analyze a job description against the user's resume.

    Returns ATS score, matching/missing skills & keywords,
    experience gap analysis, and prioritized change recommendations.
    """
    # Fetch the resume
    resume = db.get_resume(request.resume_id, user_id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    processed_data = resume.get("processed_data")
    if not processed_data:
        raise HTTPException(
            status_code=400,
            detail="Resume has not been processed yet. Please wait for processing to complete.",
        )

    language = get_content_language()

    try:
        analysis = await analyze_jd(
            job_description=request.job_description,
            resume_data=processed_data,
            language=language,
        )
        return analysis
    except Exception as e:
        logger.error("JD analysis failed: %s", e)
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze job description. Please try again.",
        )


@router.post("/parse-document")
async def parse_jd_document(file: UploadFile = File(...)) -> dict[str, str]:
    """Parse a PDF or DOCX job-description document and return its text.

    The extracted text can then be sent to ``/analyze``.
    """
    if file.content_type not in _JD_ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type: {file.content_type}. Allowed: PDF, DOC, DOCX",
        )

    content = await file.read()

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Empty file")

    if len(content) > _JD_MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {_JD_MAX_FILE_SIZE // (1024 * 1024)}MB",
        )

    try:
        text = await parse_document(content, file.filename or "document.pdf")
    except Exception as e:
        logger.error("JD document parsing failed: %s", e)
        raise HTTPException(
            status_code=422,
            detail="Failed to parse document. Please ensure it's a valid PDF or DOCX file.",
        )

    if not text or not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No text could be extracted from the document.",
        )

    return {"text": text.strip()}
