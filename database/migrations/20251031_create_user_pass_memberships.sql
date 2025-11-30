-- Migration: Criar tabela de associação de usuários aos passes
-- Data: 2025-10-31
-- Descrição: Permite que usuários ingressem em passes mensais ou sazonais

CREATE TABLE IF NOT EXISTS user_pass_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    season_pass_id UUID REFERENCES season_passes(id) ON DELETE CASCADE,
    monthly_pass_id UUID REFERENCES monthly_passes(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'active',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, monthly_pass_id),
    UNIQUE (user_id, season_pass_id),
    CHECK (season_pass_id IS NOT NULL OR monthly_pass_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_user_pass_memberships_user_id
    ON user_pass_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_user_pass_memberships_monthly
    ON user_pass_memberships(monthly_pass_id);

CREATE INDEX IF NOT EXISTS idx_user_pass_memberships_status
    ON user_pass_memberships(status);
