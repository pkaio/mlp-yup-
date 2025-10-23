-- Add XP-related columns and tables for gamification rollout

-- Videos table adjustments
ALTER TABLE videos
  ADD COLUMN IF NOT EXISTS trick_id UUID,
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS exp_awarded INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'::jsonb;

-- Ensure sensible defaults for existing rows
UPDATE videos SET metrics = '[]'::jsonb WHERE metrics IS NULL;
UPDATE videos SET score_breakdown = '{}'::jsonb WHERE score_breakdown IS NULL;
UPDATE videos SET exp_awarded = 0 WHERE exp_awarded IS NULL;

-- Foreign key enforcing relationship with tricks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'videos'
      AND constraint_name = 'videos_trick_id_fkey'
  ) THEN
    ALTER TABLE videos
      ADD CONSTRAINT videos_trick_id_fkey
      FOREIGN KEY (trick_id) REFERENCES tricks(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- Users table adjustments
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS xp_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xp_current INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

UPDATE users
  SET xp_total = COALESCE(xp_total, 0),
      xp_current = COALESCE(xp_current, 0),
      level = COALESCE(level, 1);

ALTER TABLE users
  ALTER COLUMN xp_total SET DEFAULT 0,
  ALTER COLUMN xp_current SET DEFAULT 0,
  ALTER COLUMN level SET DEFAULT 1;

-- User XP log table (auditing)
CREATE TABLE IF NOT EXISTS user_exp_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    exp_awarded INTEGER NOT NULL,
    breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index to speed up lookups by user
CREATE INDEX IF NOT EXISTS idx_user_exp_log_user_id ON user_exp_log(user_id);
