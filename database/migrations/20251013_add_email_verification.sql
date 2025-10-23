-- Add email verification support to existing databases

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_code_hash VARCHAR(255);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_verification_email_at TIMESTAMP;

-- Backfill existing records
UPDATE users
SET email_verified = true
WHERE email_verified IS NULL;

UPDATE users
SET is_active = COALESCE(is_active, true);
