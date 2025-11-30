-- ========================================
-- SISTEMA DE COMPONENTES DE MANOBRAS
-- ========================================
-- Cria a tabela de componentes que define as 6 divisões
-- de XP: approach, entry, spins, grabs, base_moves, modifiers
-- ========================================

-- Tabela de componentes de manobras
CREATE TABLE maneuver_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    component_id VARCHAR(80) UNIQUE NOT NULL,
    division VARCHAR(20) NOT NULL CHECK (division IN ('approach', 'entry', 'spins', 'grabs', 'base_moves', 'modifiers')),
    display_name VARCHAR(120) NOT NULL,
    description TEXT,
    xp_value INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_components_division ON maneuver_components(division);
CREATE INDEX idx_components_active ON maneuver_components(is_active);
CREATE INDEX idx_components_component_id ON maneuver_components(component_id);

-- Adicionar colunas relacionadas a componentes na tabela videos
ALTER TABLE videos
ADD COLUMN component_breakdown JSONB DEFAULT '{}'::jsonb,
ADD COLUMN maneuver_xp INTEGER DEFAULT 0,
ADD COLUMN bonus_xp INTEGER DEFAULT 0,
ADD COLUMN bonus_reason VARCHAR(255);

-- Adicionar coluna bonus_xp na tabela challenges
ALTER TABLE challenges
ADD COLUMN bonus_xp INTEGER DEFAULT 0;

-- Adicionar coluna bonus_xp na tabela skill_tree_nodes (se não existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'skill_tree_nodes' AND column_name = 'bonus_xp'
    ) THEN
        ALTER TABLE skill_tree_nodes ADD COLUMN bonus_xp INTEGER DEFAULT 0;
    END IF;
END $$;

-- Comentários para documentação
COMMENT ON TABLE maneuver_components IS 'Componentes de manobras divididos em 6 categorias que compõem o XP total';
COMMENT ON COLUMN maneuver_components.component_id IS 'Código único do componente (ex: hs, fs360, mute)';
COMMENT ON COLUMN maneuver_components.division IS 'Divisão do componente: approach, entry, spins, grabs, base_moves, modifiers';
COMMENT ON COLUMN maneuver_components.xp_value IS 'Valor de XP que este componente contribui';
COMMENT ON COLUMN maneuver_components.metadata IS 'Dados adicionais como spin_dir, spin_deg, family, etc';
COMMENT ON COLUMN videos.component_breakdown IS 'Breakdown detalhado dos componentes usados na manobra';
COMMENT ON COLUMN videos.maneuver_xp IS 'XP total da manobra (soma das 6 divisões)';
COMMENT ON COLUMN videos.bonus_xp IS 'XP bônus adicional (challenges, quests, eventos)';
COMMENT ON COLUMN videos.bonus_reason IS 'Razão do bônus (ex: "Desafio: Backroll Challenge")';

-- Log da criação
DO $$
BEGIN
    RAISE NOTICE 'Tabela maneuver_components criada com sucesso';
    RAISE NOTICE 'Colunas adicionadas em videos, challenges e skill_tree_nodes';
END $$;
