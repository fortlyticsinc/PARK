-- Run once in Supabase SQL Editor to accelerate ILIKE '%term%' searches.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm
    ON users USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm
    ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_matric_trgm
    ON users USING gin (matric_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pairings_project_title_trgm
    ON pairings USING gin (project_title gin_trgm_ops);