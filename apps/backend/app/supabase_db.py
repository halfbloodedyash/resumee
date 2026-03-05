"""Supabase database layer — drop-in replacement for the TinyDB Database class.

All methods accept a ``user_id`` parameter so data is scoped per user.
Row-Level-Security (RLS) in Supabase provides an additional server-side
guarantee, but we also filter by ``user_id`` explicitly for defense-in-depth.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from supabase import create_client, Client

from app.config import settings

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class SupabaseDatabase:
    """Supabase-backed database that mirrors the TinyDB Database interface."""

    _master_resume_lock = asyncio.Lock()

    def __init__(self) -> None:
        self._client: Client | None = None

    @property
    def client(self) -> Client:
        """Lazy-initialised Supabase client."""
        if self._client is None:
            self._client = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key,
            )
        return self._client

    def client_for_user(self, access_token: str) -> Client:
        """Return a Supabase client scoped to the user's JWT.

        This ensures RLS policies are enforced on behalf of the user.
        """
        from supabase import create_client as _create

        client = _create(settings.supabase_url, settings.supabase_anon_key)
        client.auth.set_session(access_token, "")
        return client

    def close(self) -> None:
        """No-op for Supabase (HTTP client, no persistent connection)."""
        self._client = None

    # ------------------------------------------------------------------ #
    # Resume operations
    # ------------------------------------------------------------------ #

    def create_resume(
        self,
        user_id: str,
        content: str,
        content_type: str = "md",
        filename: str | None = None,
        is_master: bool = False,
        parent_id: str | None = None,
        processed_data: dict[str, Any] | None = None,
        processing_status: str = "pending",
        cover_letter: str | None = None,
        outreach_message: str | None = None,
        title: str | None = None,
    ) -> dict[str, Any]:
        """Create a new resume entry."""
        resume_id = str(uuid4())
        now = _now_iso()

        doc = {
            "user_id": user_id,
            "resume_id": resume_id,
            "content": content,
            "content_type": content_type,
            "filename": filename,
            "is_master": is_master,
            "parent_id": parent_id,
            "processed_data": processed_data,
            "processing_status": processing_status,
            "cover_letter": cover_letter,
            "outreach_message": outreach_message,
            "title": title,
            "created_at": now,
            "updated_at": now,
        }

        result = self.client.table("resumes").insert(doc).execute()
        return result.data[0]

    async def create_resume_atomic_master(
        self,
        user_id: str,
        content: str,
        content_type: str = "md",
        filename: str | None = None,
        processed_data: dict[str, Any] | None = None,
        processing_status: str = "pending",
        cover_letter: str | None = None,
        outreach_message: str | None = None,
    ) -> dict[str, Any]:
        """Create a new resume with atomic master assignment."""
        async with self._master_resume_lock:
            current_master = self.get_master_resume(user_id)
            is_master = current_master is None

            if current_master and current_master.get("processing_status") == "failed":
                self.client.table("resumes").update({"is_master": False}).eq(
                    "resume_id", current_master["resume_id"]
                ).eq("user_id", user_id).execute()
                is_master = True

            return self.create_resume(
                user_id=user_id,
                content=content,
                content_type=content_type,
                filename=filename,
                is_master=is_master,
                processed_data=processed_data,
                processing_status=processing_status,
                cover_letter=cover_letter,
                outreach_message=outreach_message,
            )

    def get_resume(self, resume_id: str, user_id: str) -> dict[str, Any] | None:
        """Get resume by ID scoped to user."""
        result = (
            self.client.table("resumes")
            .select("*")
            .eq("resume_id", resume_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_master_resume(self, user_id: str) -> dict[str, Any] | None:
        """Get the master resume for a user."""
        result = (
            self.client.table("resumes")
            .select("*")
            .eq("user_id", user_id)
            .eq("is_master", True)
            .execute()
        )
        return result.data[0] if result.data else None

    def update_resume(
        self, resume_id: str, updates: dict[str, Any], user_id: str
    ) -> dict[str, Any]:
        """Update resume by ID."""
        updates["updated_at"] = _now_iso()
        result = (
            self.client.table("resumes")
            .update(updates)
            .eq("resume_id", resume_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise ValueError(f"Resume not found: {resume_id}")
        return result.data[0]

    def delete_resume(self, resume_id: str, user_id: str) -> bool:
        """Delete resume by ID."""
        result = (
            self.client.table("resumes")
            .delete()
            .eq("resume_id", resume_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(result.data)

    def list_resumes(self, user_id: str) -> list[dict[str, Any]]:
        """List all resumes for a user."""
        result = (
            self.client.table("resumes")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return result.data

    def set_master_resume(self, resume_id: str, user_id: str) -> bool:
        """Set a resume as the master, unsetting any existing master."""
        # Verify target exists
        target = (
            self.client.table("resumes")
            .select("resume_id")
            .eq("resume_id", resume_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not target.data:
            logger.warning("Cannot set master: resume %s not found", resume_id)
            return False

        # Unset current master(s)
        self.client.table("resumes").update({"is_master": False}).eq(
            "user_id", user_id
        ).eq("is_master", True).execute()

        # Set new master
        result = (
            self.client.table("resumes")
            .update({"is_master": True})
            .eq("resume_id", resume_id)
            .eq("user_id", user_id)
            .execute()
        )
        return bool(result.data)

    async def set_master_resume_safe(self, resume_id: str, user_id: str) -> bool:
        """Async-safe version with locking."""
        async with self._master_resume_lock:
            return self.set_master_resume(resume_id, user_id)

    # ------------------------------------------------------------------ #
    # Job operations
    # ------------------------------------------------------------------ #

    def create_job(
        self, content: str, user_id: str, resume_id: str | None = None
    ) -> dict[str, Any]:
        """Create a new job description entry."""
        job_id = str(uuid4())
        now = _now_iso()
        doc = {
            "user_id": user_id,
            "job_id": job_id,
            "content": content,
            "resume_id": resume_id,
            "created_at": now,
        }
        result = self.client.table("jobs").insert(doc).execute()
        return result.data[0]

    def get_job(self, job_id: str, user_id: str) -> dict[str, Any] | None:
        """Get job by ID."""
        result = (
            self.client.table("jobs")
            .select("*")
            .eq("job_id", job_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None

    def update_job(
        self, job_id: str, updates: dict[str, Any], user_id: str
    ) -> dict[str, Any] | None:
        """Update a job by ID."""
        result = (
            self.client.table("jobs")
            .update(updates)
            .eq("job_id", job_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None

    # ------------------------------------------------------------------ #
    # Improvement operations
    # ------------------------------------------------------------------ #

    def create_improvement(
        self,
        user_id: str,
        original_resume_id: str,
        tailored_resume_id: str,
        job_id: str,
        improvements: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Create an improvement result entry."""
        request_id = str(uuid4())
        now = _now_iso()
        doc = {
            "user_id": user_id,
            "request_id": request_id,
            "original_resume_id": original_resume_id,
            "tailored_resume_id": tailored_resume_id,
            "job_id": job_id,
            "improvements": improvements,
            "created_at": now,
        }
        result = self.client.table("improvements").insert(doc).execute()
        return result.data[0]

    def get_improvement_by_tailored_resume(
        self, tailored_resume_id: str, user_id: str
    ) -> dict[str, Any] | None:
        """Get improvement record by tailored resume ID."""
        result = (
            self.client.table("improvements")
            .select("*")
            .eq("tailored_resume_id", tailored_resume_id)
            .eq("user_id", user_id)
            .execute()
        )
        return result.data[0] if result.data else None

    # ------------------------------------------------------------------ #
    # Stats & admin
    # ------------------------------------------------------------------ #

    def get_stats(self, user_id: str) -> dict[str, Any]:
        """Get database statistics for a user."""
        resumes = (
            self.client.table("resumes")
            .select("resume_id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        jobs = (
            self.client.table("jobs")
            .select("job_id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        improvements = (
            self.client.table("improvements")
            .select("request_id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        return {
            "total_resumes": resumes.count or 0,
            "total_jobs": jobs.count or 0,
            "total_improvements": improvements.count or 0,
            "has_master_resume": self.get_master_resume(user_id) is not None,
        }

    def reset_database(self, user_id: str) -> None:
        """Reset all data for a specific user."""
        self.client.table("improvements").delete().eq("user_id", user_id).execute()
        self.client.table("jobs").delete().eq("user_id", user_id).execute()
        self.client.table("resumes").delete().eq("user_id", user_id).execute()
        self.client.table("user_config").delete().eq("user_id", user_id).execute()

    # ------------------------------------------------------------------ #
    # User config (stores API keys, feature flags per user)
    # ------------------------------------------------------------------ #

    def get_user_config(self, user_id: str) -> dict[str, Any]:
        """Get user config, creating default if not exists."""
        result = (
            self.client.table("user_config")
            .select("config")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0].get("config", {})
        # Create default config
        self.client.table("user_config").insert(
            {"user_id": user_id, "config": {}}
        ).execute()
        return {}

    def save_user_config(self, user_id: str, config: dict[str, Any]) -> None:
        """Save user config (upsert)."""
        self.client.table("user_config").upsert(
            {"user_id": user_id, "config": config, "updated_at": _now_iso()},
            on_conflict="user_id",
        ).execute()


# Global database instance
db = SupabaseDatabase()
