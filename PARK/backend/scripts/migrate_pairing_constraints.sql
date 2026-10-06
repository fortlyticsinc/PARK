-- Run once against an existing database before deploying duplicate checks.
-- The checks intentionally stop if existing rows violate the new rules.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pairings
        WHERE status = 'active' AND deleted_at IS NULL
        GROUP BY student_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Resolve students with multiple active pairings before applying pairing indexes';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pairings
        WHERE project_title IS NOT NULL AND trim(project_title) <> '' AND deleted_at IS NULL
        GROUP BY institution_id, lower(regexp_replace(trim(project_title), '\s+', ' ', 'g'))
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Resolve duplicate project topics within each institution before applying pairing indexes';
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pairings_active_student
    ON pairings(student_id)
    WHERE status = 'active' AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pairings_institution_topic
    ON pairings(institution_id, lower(regexp_replace(trim(project_title), '\s+', ' ', 'g')))
    WHERE project_title IS NOT NULL AND trim(project_title) <> '' AND deleted_at IS NULL;