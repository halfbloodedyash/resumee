"""Health check and status endpoints."""

from fastapi import APIRouter, Depends

from app.auth import get_user_id
from app.database import db
from app.llm import check_llm_health, get_llm_config
from app.schemas import HealthResponse, StatusResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Basic health check endpoint."""
    llm_status = await check_llm_health()

    return HealthResponse(
        status="healthy" if llm_status["healthy"] else "degraded",
        llm=llm_status,
    )


@router.get("/status", response_model=StatusResponse)
async def get_status(user_id: str = Depends(get_user_id)) -> StatusResponse:
    """Get comprehensive application status.

    Returns:
        - LLM configuration status
        - Master resume existence
        - Database statistics
    """
    config = get_llm_config()
    llm_status = await check_llm_health(config)
    db_stats = db.get_stats(user_id)

    # API key is managed server-side via environment variables, always configured
    llm_configured = True

    return StatusResponse(
        status="ready",
        llm_configured=llm_configured,
        llm_healthy=llm_status["healthy"],
        has_master_resume=db_stats["has_master_resume"],
        database_stats=db_stats,
    )
