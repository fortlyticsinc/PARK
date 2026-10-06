-- Run once against an existing database before deploying forced first-login
-- password changes for provisioned staff accounts.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;