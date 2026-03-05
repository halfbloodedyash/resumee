"""Database layer — re-exports from Supabase backend.

All code that does ``from app.database import db`` will now get the
Supabase-backed implementation without changing their import paths.
"""

from app.supabase_db import SupabaseDatabase, db  # noqa: F401

__all__ = ["SupabaseDatabase", "db"]

