"""
PARK — Create Tables
==========================
Generates all tables directly from the SQLAlchemy models (models are
the source of truth — see the schema-drift discussion). Run this
once against a fresh database before seeding.

Run with: python -m scripts.create_tables

NOTE: This does NOT create the repository full-text search trigger
(update_repo_search_vector) — that's Postgres-specific logic SQLAlchemy
can't express as a column default. Run the SQL block printed at the
end of this script separately in Supabase's SQL editor (or via psql)
after this completes, or repository search won't return results.
"""

import asyncio
from app.core.database import engine, Base
from app.models import *  # noqa: F401,F403 — registers every model on Base.metadata

SEARCH_TRIGGER_SQL = """
CREATE OR REPLACE FUNCTION update_repo_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        to_tsvector('english',
            COALESCE(NEW.title, '') || ' ' ||
            COALESCE(NEW.abstract, '') || ' ' ||
            COALESCE(array_to_string(NEW.keywords, ' '), '')
        );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_repo_search_vector
    BEFORE INSERT OR UPDATE OF title, abstract, keywords ON repository_projects
    FOR EACH ROW EXECUTE FUNCTION update_repo_search_vector();

CREATE INDEX IF NOT EXISTS idx_repo_search ON repository_projects USING gin(search_vector);
"""


async def create_all():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created from SQLAlchemy models.")
    print("\n⚠️  One manual step left — run this SQL once in Supabase's SQL editor")
    print("   (or via psql if testing locally) to enable repository search:\n")
    print(SEARCH_TRIGGER_SQL)


if __name__ == "__main__":
    asyncio.run(create_all())
