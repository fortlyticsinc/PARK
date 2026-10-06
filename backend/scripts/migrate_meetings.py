"""Migrate the original meetings table to the scheduled-meeting model."""

import asyncio
from sqlalchemy import text
from backend.app.core.database import engine


SQL = """
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS venue VARCHAR(255);
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS agenda TEXT;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
UPDATE meetings SET supervisor_id = logged_by WHERE supervisor_id IS NULL;
UPDATE meetings SET scheduled_at = meeting_date WHERE scheduled_at IS NULL;
UPDATE meetings SET venue = COALESCE(meeting_link, 'Not specified') WHERE venue IS NULL;
UPDATE meetings SET agenda = COALESCE(topics_discussed, notes, 'Meeting') WHERE agenda IS NULL;
ALTER TABLE meetings ALTER COLUMN supervisor_id SET NOT NULL;
ALTER TABLE meetings ALTER COLUMN scheduled_at SET NOT NULL;
ALTER TABLE meetings ALTER COLUMN venue SET NOT NULL;
ALTER TABLE meetings ALTER COLUMN agenda SET NOT NULL;
ALTER TABLE meetings ALTER COLUMN pairing_id DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN logged_by DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN meeting_date DROP NOT NULL;
ALTER TABLE meetings ALTER COLUMN meeting_type SET DEFAULT 'physical';
"""


async def main():
    async with engine.begin() as conn:
        for statement in SQL.split(";"):
            if statement.strip():
                await conn.execute(text(statement))
    print("Meetings table migrated successfully.")


if __name__ == "__main__":
    asyncio.run(main())