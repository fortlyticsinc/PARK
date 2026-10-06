-- =============================================================
-- PARK — Complete Supabase Setup (Production-Ready)
-- Run ONCE in Supabase SQL Editor → New Query.
-- Safe to re-run: every CREATE uses IF NOT EXISTS.
-- Expected result: final SELECT returns table_count = 11
-- =============================================================

-- -------------------------------------------------------
-- EXTENSIONS
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- -------------------------------------------------------
-- ENUMS
-- Each wrapped in DO block so re-running doesn't error.
-- -------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student','supervisor','coordinator','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE pairing_status AS ENUM ('active','completed','suspended','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE chapter_status AS ENUM (
        'submitted','under_review','revision_requested',
        'resubmitted','approved','rejected'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE meeting_type AS ENUM ('physical','virtual','phone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE repo_status AS ENUM ('published','hidden','withdrawn');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -------------------------------------------------------
-- INSTITUTIONS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS institutions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(200) NOT NULL,
    code        VARCHAR(20) UNIQUE,
    address     TEXT,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    logo_url    VARCHAR(500),
    settings    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- -------------------------------------------------------
-- DEPARTMENTS
-- coordinator_id FK added after users table exists.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id  UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(20),
    coordinator_id  UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_departments_institution ON departments(institution_id);

-- -------------------------------------------------------
-- USERS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supabase_uid    UUID UNIQUE,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    full_name       VARCHAR(200) NOT NULL,
    avatar_url      VARCHAR(500),
    role            user_role NOT NULL DEFAULT 'student',
    matric_number   VARCHAR(50),
    department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
    institution_id  UUID REFERENCES institutions(id) ON DELETE SET NULL,
    is_active       BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified  BOOLEAN DEFAULT FALSE,
    phone_verified  BOOLEAN DEFAULT FALSE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role         ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department   ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_institution  ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_users_matric       ON users(matric_number) WHERE matric_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_full_name_trgm ON users USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm     ON users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_matric_trgm    ON users USING gin (matric_number gin_trgm_ops);

-- Wire coordinator FK now that users table exists.
-- DO block needed because ADD CONSTRAINT IF NOT EXISTS is NOT
-- valid standard Postgres syntax — this is the safe alternative.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_departments_coordinator'
          AND table_name = 'departments'
    ) THEN
        ALTER TABLE departments
            ADD CONSTRAINT fk_departments_coordinator
            FOREIGN KEY (coordinator_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- -------------------------------------------------------
-- PAIRINGS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS pairings (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    supervisor_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id     UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    institution_id    UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    academic_year     VARCHAR(9) NOT NULL,
    project_title     VARCHAR(500),
    status            pairing_status NOT NULL DEFAULT 'active',
    chapter_count     INTEGER DEFAULT 0,
    last_meeting_date TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ,
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_pairing_student_year UNIQUE (student_id, academic_year),
    CONSTRAINT chk_pairing_different_users CHECK (student_id != supervisor_id)
);

CREATE INDEX IF NOT EXISTS idx_pairings_student           ON pairings(student_id);
CREATE INDEX IF NOT EXISTS idx_pairings_supervisor        ON pairings(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_pairings_dept_year         ON pairings(department_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_pairings_institution       ON pairings(institution_id);
CREATE INDEX IF NOT EXISTS idx_pairings_status            ON pairings(status);
CREATE INDEX IF NOT EXISTS idx_pairings_supervisor_status ON pairings(supervisor_id, status);
CREATE INDEX IF NOT EXISTS idx_pairings_project_title_trgm ON pairings USING gin (project_title gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pairings_active_student
    ON pairings(student_id) WHERE status = 'active' AND deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pairings_institution_topic
    ON pairings(institution_id, lower(regexp_replace(trim(project_title), '\s+', ' ', 'g')))
    WHERE project_title IS NOT NULL AND trim(project_title) <> '' AND deleted_at IS NULL;

-- -------------------------------------------------------
-- CHAPTERS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pairing_id          UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES users(id),
    supervisor_id       UUID NOT NULL REFERENCES users(id),
    chapter_number      INTEGER NOT NULL CHECK (chapter_number BETWEEN 1 AND 5),
    title               VARCHAR(500),
    file_url            VARCHAR(500),
    file_public_id      VARCHAR(200),
    file_size_bytes     INTEGER,
    mime_type           VARCHAR(100),
    status              chapter_status NOT NULL DEFAULT 'submitted',
    version             INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
    supervisor_comment  TEXT,
    reviewed_at         TIMESTAMPTZ,
    supervisor_notified VARCHAR(20) DEFAULT 'pending',
    submitted_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_chapter_pairing_number_version UNIQUE (pairing_id, chapter_number, version)
);

CREATE INDEX IF NOT EXISTS idx_chapters_pairing        ON chapters(pairing_id);
CREATE INDEX IF NOT EXISTS idx_chapters_pairing_status ON chapters(pairing_id, status);
CREATE INDEX IF NOT EXISTS idx_chapters_student        ON chapters(student_id);
CREATE INDEX IF NOT EXISTS idx_chapters_supervisor     ON chapters(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_chapters_status         ON chapters(status);
CREATE INDEX IF NOT EXISTS idx_chapters_submitted_at   ON chapters(submitted_at DESC);

-- -------------------------------------------------------
-- CHAPTER COMMENTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapter_comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id  UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    author_id   UUID NOT NULL REFERENCES users(id),
    author_role VARCHAR(20) NOT NULL,
    content     TEXT NOT NULL,
    page_number INTEGER,
    line_number INTEGER,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- This index was missing from the previous version of this SQL.
CREATE INDEX IF NOT EXISTS idx_chapter_comments_chapter ON chapter_comments(chapter_id);

-- -------------------------------------------------------
-- MEETINGS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pairing_id       UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
    logged_by        UUID NOT NULL REFERENCES users(id),
    meeting_date     TIMESTAMPTZ NOT NULL,
    meeting_type     meeting_type NOT NULL DEFAULT 'physical',
    duration_minutes INTEGER,
    notes            TEXT,
    topics_discussed TEXT,
    meeting_link     VARCHAR(500),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_pairing      ON meetings(pairing_id);
CREATE INDEX IF NOT EXISTS idx_meetings_pairing_date ON meetings(pairing_id, meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_date         ON meetings(meeting_date DESC);

-- -------------------------------------------------------
-- MESSAGES (1:1 DMs per pairing)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pairing_id UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
    sender_id  UUID NOT NULL REFERENCES users(id),
    content    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT FALSE,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_pairing         ON messages(pairing_id);
CREATE INDEX IF NOT EXISTS idx_messages_pairing_created ON messages(pairing_id, created_at DESC);
-- Partial index: only indexes unread rows — makes unread-count queries fast.
-- This was missing from the previous version of this SQL.
CREATE INDEX IF NOT EXISTS idx_messages_unread
    ON messages(pairing_id, is_read) WHERE is_read = FALSE;

-- -------------------------------------------------------
-- BROADCAST MESSAGES (supervisor → all paired students)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS broadcast_messages (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supervisor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content       TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_supervisor ON broadcast_messages(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created    ON broadcast_messages(created_at DESC);

-- -------------------------------------------------------
-- REPOSITORY
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS repository_projects (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pairing_id       UUID REFERENCES pairings(id) ON DELETE SET NULL,
    student_name     VARCHAR(200) NOT NULL,
    student_matric   VARCHAR(50) NOT NULL,
    student_email    VARCHAR(255) NOT NULL,
    supervisor_name  VARCHAR(200) NOT NULL,
    supervisor_email VARCHAR(255) NOT NULL,
    title            VARCHAR(500) NOT NULL,
    abstract         TEXT,
    keywords         TEXT[],
    department_id    UUID NOT NULL REFERENCES departments(id),
    institution_id   UUID NOT NULL REFERENCES institutions(id),
    academic_year    VARCHAR(9) NOT NULL,
    chapter_files    TEXT[] NOT NULL DEFAULT '{}',
    full_thesis_url  VARCHAR(500),
    search_vector    TSVECTOR,
    view_count       INTEGER DEFAULT 0 NOT NULL,
    download_count   INTEGER DEFAULT 0 NOT NULL,
    status           repo_status NOT NULL DEFAULT 'published',
    approved_at      TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_repo_matric_year UNIQUE (student_matric, academic_year)
);

CREATE INDEX IF NOT EXISTS idx_repo_search        ON repository_projects USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_repo_dept_year     ON repository_projects(department_id, academic_year);
CREATE INDEX IF NOT EXISTS idx_repo_institution   ON repository_projects(institution_id);
CREATE INDEX IF NOT EXISTS idx_repo_status        ON repository_projects(status);
CREATE INDEX IF NOT EXISTS idx_repo_student_matric ON repository_projects(student_matric);
CREATE INDEX IF NOT EXISTS idx_repo_approved_at   ON repository_projects(approved_at DESC);

-- Download audit log
CREATE TABLE IF NOT EXISTS repository_download_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id      UUID NOT NULL REFERENCES repository_projects(id) ON DELETE CASCADE,
    downloaded_at   TIMESTAMPTZ DEFAULT NOW(),
    ip_hash         VARCHAR(64),
    user_agent_hash VARCHAR(64)
);

-- This index was missing from the previous version of this SQL.
CREATE INDEX IF NOT EXISTS idx_download_logs_project
    ON repository_download_logs(project_id, downloaded_at DESC);

-- -------------------------------------------------------
-- CERTIFICATES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificates (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pairing_id          UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
    certificate_number  VARCHAR(50) NOT NULL UNIQUE,
    student_name        VARCHAR(200) NOT NULL,
    student_matric      VARCHAR(50),
    supervisor_name     VARCHAR(200) NOT NULL,
    department_name     VARCHAR(200) NOT NULL,
    institution_name    VARCHAR(200) NOT NULL,
    project_title       VARCHAR(500) NOT NULL,
    academic_year       VARCHAR(9) NOT NULL,
    confirmed_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    issued_at           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_certificate_pairing UNIQUE (pairing_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_pairing ON certificates(pairing_id);

CREATE TABLE IF NOT EXISTS certificate_applications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pairing_id          UUID NOT NULL REFERENCES pairings(id) ON DELETE CASCADE,
    student_id          UUID NOT NULL REFERENCES users(id),
    supervisor_id       UUID NOT NULL REFERENCES users(id),
    final_copy_url      VARCHAR(500) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    supervisor_comment  TEXT,
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
    applied_at          TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at         TIMESTAMPTZ,
    CONSTRAINT uq_certificate_application_pairing UNIQUE (pairing_id)
);

CREATE INDEX IF NOT EXISTS idx_certificate_applications_supervisor
    ON certificate_applications(supervisor_id, status);

-- -------------------------------------------------------
-- FULL-TEXT SEARCH TRIGGER
-- Keeps search_vector in sync whenever title/abstract/keywords
-- are inserted or updated. Required for repository search to work.
-- -------------------------------------------------------
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

DROP TRIGGER IF EXISTS trg_repo_search_vector ON repository_projects;
CREATE TRIGGER trg_repo_search_vector
    BEFORE INSERT OR UPDATE OF title, abstract, keywords ON repository_projects
    FOR EACH ROW EXECUTE FUNCTION update_repo_search_vector();

-- -------------------------------------------------------
-- ROW LEVEL SECURITY
-- Our FastAPI backend connects with the service role key,
-- which bypasses RLS entirely — so RLS does NOT affect
-- normal API operation. It exists purely as a defence
-- against anyone who gets hold of your anon key and tries
-- to query Supabase directly, bypassing the API.
-- -------------------------------------------------------
ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE pairings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_comments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE repository_projects ENABLE ROW LEVEL SECURITY;

-- Block ALL direct client access to sensitive tables.
-- Only the service role (our FastAPI backend) can access these.
-- Public tables (institutions, departments, repository_projects)
-- get their own more permissive policies below.

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY['users','pairings','chapters','chapter_comments',
                            'meetings','messages','broadcast_messages'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE tablename = tbl AND policyname = 'deny_direct_client_access'
        ) THEN
            EXECUTE format(
                'CREATE POLICY deny_direct_client_access ON %I
                 AS RESTRICTIVE FOR ALL USING (FALSE)', tbl
            );
        END IF;
    END LOOP;
END $$;

-- Repository: public read for published projects only.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'repository_projects' AND policyname = 'repo_public_read'
    ) THEN
        CREATE POLICY repo_public_read ON repository_projects
            FOR SELECT USING (status = 'published');
    END IF;
END $$;

-- -------------------------------------------------------
-- VERIFICATION
-- Should return table_count = 11
-- -------------------------------------------------------
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'institutions','departments','users','pairings',
    'chapters','chapter_comments','meetings','messages',
        'broadcast_messages','repository_projects','repository_download_logs','certificates','certificate_applications'
  );
