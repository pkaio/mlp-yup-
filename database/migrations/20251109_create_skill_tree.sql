-- Migration: Create Skill Tree System
-- Created: 2025-11-09
-- Description: Creates gamified quest/skill tree system with progression tracking and evolution history

-- ===========================================
-- 1. SKILL TREE NODES (Quest Definitions)
-- ===========================================

CREATE TABLE IF NOT EXISTS skill_tree_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Tree Structure
    specialization VARCHAR(20) NOT NULL CHECK (specialization IN ('slider', 'kicker', 'surface')),
    tier INTEGER NOT NULL CHECK (tier >= 1 AND tier <= 10),
    position INTEGER NOT NULL DEFAULT 0, -- Horizontal position in tier

    -- Quest Information
    title VARCHAR(120) NOT NULL,
    description TEXT,
    trick_id UUID REFERENCES tricks(id) ON DELETE SET NULL,

    -- Educational Content
    tutorial_video_url TEXT,
    tips JSONB DEFAULT '[]'::jsonb, -- Array of tip strings
    common_mistakes JSONB DEFAULT '[]'::jsonb, -- Array of common mistake strings

    -- Requirements & Unlocking
    prerequisites JSONB DEFAULT '[]'::jsonb, -- Array of prerequisite node UUIDs
    required_for_unlock BOOLEAN DEFAULT false, -- If must complete to unlock next tier

    -- Rewards
    xp_bonus INTEGER DEFAULT 50, -- XP bonus for first completion
    badge_reward VARCHAR(120), -- Optional badge name

    -- Repeatability
    repeatable BOOLEAN DEFAULT true, -- If can be redone

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Uniqueness constraint
    UNIQUE(specialization, tier, position)
);

-- ===========================================
-- 2. USER QUEST COMPLETIONS (History)
-- ===========================================

CREATE TABLE IF NOT EXISTS user_quest_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,

    -- Quest Context
    attempt_number INTEGER NOT NULL DEFAULT 1,
    is_first_completion BOOLEAN DEFAULT false,

    -- XP Tracking
    xp_awarded INTEGER NOT NULL DEFAULT 0, -- Total XP from video
    xp_bonus_received INTEGER NOT NULL DEFAULT 0, -- Quest bonus (first time only)

    -- Timestamp
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for user_quest_completions
CREATE INDEX IF NOT EXISTS idx_user_quest_completions_user ON user_quest_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_completions_node ON user_quest_completions(node_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_completions_user_node ON user_quest_completions(user_id, node_id);
CREATE INDEX IF NOT EXISTS idx_user_quest_completions_history ON user_quest_completions(user_id, completed_at DESC);

-- ===========================================
-- 3. USER SKILL PROGRESS (Current State)
-- ===========================================

CREATE TABLE IF NOT EXISTS user_skill_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- References
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    node_id UUID NOT NULL REFERENCES skill_tree_nodes(id) ON DELETE CASCADE,

    -- Current Status
    status VARCHAR(20) DEFAULT 'locked' CHECK (status IN ('locked', 'available', 'in_progress', 'completed')),

    -- Completion Stats
    times_completed INTEGER DEFAULT 0,
    first_completed_at TIMESTAMP WITH TIME ZONE,
    last_completed_at TIMESTAMP WITH TIME ZONE,

    -- Best Performance
    best_video_id UUID REFERENCES videos(id) ON DELETE SET NULL, -- Video with highest XP
    best_video_xp INTEGER DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Uniqueness
    UNIQUE(user_id, node_id)
);

-- Indexes for user_skill_progress
CREATE INDEX IF NOT EXISTS idx_user_skill_progress_user ON user_skill_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_skill_progress_status ON user_skill_progress(user_id, status);

-- ===========================================
-- 4. UPDATE VIDEOS TABLE
-- ===========================================

-- Add quest tracking fields to videos table
ALTER TABLE videos
    ADD COLUMN IF NOT EXISTS quest_node_id UUID REFERENCES skill_tree_nodes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_quest_video BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS quest_attempt_number INTEGER;

-- Add index for quest video queries
CREATE INDEX IF NOT EXISTS idx_videos_quest ON videos(user_id, is_quest_video, quest_node_id) WHERE is_quest_video = true;

-- ===========================================
-- 5. UPDATE USERS TABLE
-- ===========================================

-- Add stance field for user profile
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS stance VARCHAR(10) CHECK (stance IN ('regular', 'goofy'));

-- ===========================================
-- 6. TRIGGERS
-- ===========================================

-- Auto-update updated_at timestamp for skill_tree_nodes
CREATE OR REPLACE FUNCTION update_skill_tree_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_skill_tree_nodes_updated_at
    BEFORE UPDATE ON skill_tree_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_skill_tree_nodes_updated_at();

-- Auto-update updated_at timestamp for user_skill_progress
CREATE OR REPLACE FUNCTION update_user_skill_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_skill_progress_updated_at
    BEFORE UPDATE ON user_skill_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_user_skill_progress_updated_at();

-- ===========================================
-- 7. HELPER FUNCTIONS
-- ===========================================

-- Function to initialize skill tree for new users
CREATE OR REPLACE FUNCTION initialize_user_skill_tree(p_user_id UUID)
RETURNS void AS $$
BEGIN
    -- Create progress entries for all tier 1 nodes (always unlocked)
    INSERT INTO user_skill_progress (user_id, node_id, status)
    SELECT p_user_id, id, 'available'
    FROM skill_tree_nodes
    WHERE tier = 1
    ON CONFLICT (user_id, node_id) DO NOTHING;

    -- Create locked entries for all other nodes
    INSERT INTO user_skill_progress (user_id, node_id, status)
    SELECT p_user_id, id, 'locked'
    FROM skill_tree_nodes
    WHERE tier > 1
    ON CONFLICT (user_id, node_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 8. SAMPLE DATA (Optional - for testing)
-- ===========================================

-- Example: Insert a few starter quests for Slider specialization
-- Tier 1: Beginner Quests (always unlocked)

INSERT INTO skill_tree_nodes (
    specialization, tier, position, title, description, trick_id,
    tutorial_video_url, tips, common_mistakes, xp_bonus, badge_reward, repeatable
) VALUES (
    'slider',
    1,
    0,
    'Seu Primeiro Slide',
    'Aprenda a executar seu primeiro boardslide. Esta é a manobra fundamental para todas as tricks de rail.',
    (SELECT id FROM tricks WHERE nome_curto = 'BSLD' OR LOWER(nome) LIKE '%boardslide%' LIMIT 1),
    'https://youtube.com/example1', -- Replace with real tutorial
    '["Aproxime paralelo ao obstáculo", "Rotacione 90° no momento do toque", "Mantenha o peso centralizado na prancha", "Olhe para onde vai sair do rail"]'::jsonb,
    '["Não force a rotação antes de tocar o obstáculo", "Evite se inclinar muito para frente", "Não olhe para baixo durante o slide"]'::jsonb,
    50,
    'Rail Starter',
    true
) ON CONFLICT (specialization, tier, position) DO NOTHING;

INSERT INTO skill_tree_nodes (
    specialization, tier, position, title, description, trick_id,
    tutorial_video_url, tips, common_mistakes, xp_bonus, badge_reward, repeatable
) VALUES (
    'slider',
    1,
    1,
    'Backside Control',
    'Domine o controle em backside. Aprenda a executar um BS Boardslide com confiança.',
    (SELECT id FROM tricks WHERE nome_curto LIKE '%BS%' AND LOWER(nome) LIKE '%boardslide%' LIMIT 1),
    'https://youtube.com/example2', -- Replace with real tutorial
    '["Gire o quadril primeiro", "Mantenha os ombros alinhados", "Use os joelhos para absorver impacto", "Foque no equilíbrio"]'::jsonb,
    '["Não rotacione os ombros demais", "Evite travar os joelhos", "Não saia muito cedo do rail"]'::jsonb,
    50,
    'BS Master',
    true
) ON CONFLICT (specialization, tier, position) DO NOTHING;

-- ===========================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ===========================================

COMMENT ON TABLE skill_tree_nodes IS 'Defines quest/skill nodes in the progression tree for each specialization';
COMMENT ON TABLE user_quest_completions IS 'Historical record of ALL quest completion attempts for tracking evolution over time';
COMMENT ON TABLE user_skill_progress IS 'Current state and stats for each user''s quest progress';

COMMENT ON COLUMN skill_tree_nodes.tier IS 'Vertical level in the skill tree (1-10), tier 1 is always unlocked';
COMMENT ON COLUMN skill_tree_nodes.position IS 'Horizontal position within the tier for visual layout';
COMMENT ON COLUMN skill_tree_nodes.prerequisites IS 'JSON array of node UUIDs that must be completed before this unlocks';
COMMENT ON COLUMN skill_tree_nodes.repeatable IS 'Whether user can redo this quest to track improvement';

COMMENT ON COLUMN user_quest_completions.attempt_number IS 'Which attempt this was (1st, 2nd, 3rd, etc)';
COMMENT ON COLUMN user_quest_completions.is_first_completion IS 'True only for the very first time completing this quest';
COMMENT ON COLUMN user_quest_completions.xp_bonus_received IS 'Quest bonus XP (only awarded on first completion)';

COMMENT ON COLUMN user_skill_progress.status IS 'locked=not available yet, available=can attempt now, in_progress=started but not completed, completed=finished at least once';
COMMENT ON COLUMN user_skill_progress.times_completed IS 'Total number of times user has completed this quest';
COMMENT ON COLUMN user_skill_progress.best_video_id IS 'Reference to the video with highest total XP for this quest';

COMMENT ON COLUMN videos.quest_node_id IS 'If this video was uploaded for a quest, reference to that quest node';
COMMENT ON COLUMN videos.is_quest_video IS 'Quick flag to filter quest videos in queries';
COMMENT ON COLUMN videos.quest_attempt_number IS 'Which attempt number this was for the quest (1st, 2nd, etc)';

COMMENT ON COLUMN users.stance IS 'User''s natural wakeboard stance: regular (left foot forward) or goofy (right foot forward)';
