-- Migration: Add Specialization System
-- Created: 2025-11-09
-- Description: Adds RPG-style specialization system with 3 tracks (slider, kicker, surface)

-- Create user_specializations table
CREATE TABLE IF NOT EXISTS user_specializations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    specialization_type VARCHAR(20) NOT NULL CHECK (specialization_type IN ('slider', 'kicker', 'surface')),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 10),
    xp_current INTEGER NOT NULL DEFAULT 0,
    xp_total INTEGER NOT NULL DEFAULT 0,
    tricks_completed INTEGER NOT NULL DEFAULT 0,
    best_trick_id UUID REFERENCES tricks(id) ON DELETE SET NULL,
    best_trick_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, specialization_type)
);

-- Add specialization field to tricks table
ALTER TABLE tricks
ADD COLUMN IF NOT EXISTS specialization VARCHAR(20) CHECK (specialization IN ('slider', 'kicker', 'surface'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_specializations_user_id ON user_specializations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_specializations_type ON user_specializations(specialization_type);
CREATE INDEX IF NOT EXISTS idx_user_specializations_level ON user_specializations(level);
CREATE INDEX IF NOT EXISTS idx_tricks_specialization ON tricks(specialization);

-- Populate existing tricks with specialization based on obstacle type
-- This is a best-effort mapping based on common wakeboard terminology
UPDATE tricks
SET specialization = CASE
    WHEN LOWER(obstaculo) LIKE '%slider%' OR LOWER(obstaculo) LIKE '%rail%' THEN 'slider'
    WHEN LOWER(obstaculo) LIKE '%kicker%' OR LOWER(obstaculo) LIKE '%ramp%' THEN 'kicker'
    WHEN LOWER(obstaculo) LIKE '%surface%' OR LOWER(obstaculo) LIKE '%air%' OR LOWER(tipo) LIKE '%air%' THEN 'surface'
    ELSE NULL
END
WHERE specialization IS NULL;

-- Initialize specializations for all existing users (starts at level 1 with 0 XP)
INSERT INTO user_specializations (user_id, specialization_type, level, xp_current, xp_total, tricks_completed)
SELECT u.id, spec_type, 1, 0, 0, 0
FROM users u
CROSS JOIN (VALUES ('slider'), ('kicker'), ('surface')) AS spec_types(spec_type)
ON CONFLICT (user_id, specialization_type) DO NOTHING;

-- Add updated_at trigger for user_specializations
CREATE OR REPLACE FUNCTION update_user_specializations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_specializations_updated_at
    BEFORE UPDATE ON user_specializations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_specializations_updated_at();

-- Add comment documentation
COMMENT ON TABLE user_specializations IS 'Tracks RPG-style specialization progression for each user across 3 specialization types';
COMMENT ON COLUMN user_specializations.specialization_type IS 'Type of specialization: slider (🛹), kicker (🚀), or surface (🌊)';
COMMENT ON COLUMN user_specializations.level IS 'Current level (1-10) for this specialization';
COMMENT ON COLUMN user_specializations.xp_current IS 'XP earned in current level (resets each level)';
COMMENT ON COLUMN user_specializations.xp_total IS 'Total XP earned for this specialization (cumulative)';
COMMENT ON COLUMN user_specializations.tricks_completed IS 'Number of tricks completed for this specialization';
COMMENT ON COLUMN user_specializations.best_trick_id IS 'Reference to the best (highest XP) trick performed in this specialization';
COMMENT ON COLUMN user_specializations.best_trick_xp IS 'XP earned from the best trick';
COMMENT ON COLUMN tricks.specialization IS 'Specialization category this trick belongs to (slider/kicker/surface)';
