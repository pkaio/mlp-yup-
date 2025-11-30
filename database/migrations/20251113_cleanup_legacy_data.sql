-- ========================================
-- LIMPEZA DE DADOS LEGADOS
-- ========================================
-- Esta migration remove todos os dados de XP e vídeos antigos
-- para permitir o início com o novo sistema de 6 divisões
-- ========================================

-- Resetar XP de todos usuários
UPDATE users
SET xp_total = 0,
    xp_current = 0,
    level = 1,
    updated_at = CURRENT_TIMESTAMP;

-- Limpar vídeos antigos
DELETE FROM videos;

-- Limpar logs de XP
DELETE FROM user_exp_log;

-- Limpar completions de challenges
DELETE FROM user_challenge_completions;

-- Limpar progresso de skill tree relacionado a vídeos (se a coluna video_id existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_skill_progress' AND column_name = 'video_id'
    ) THEN
        DELETE FROM user_skill_progress WHERE video_id IS NOT NULL;
    END IF;
END $$;

-- Resetar specialization XP (se a tabela existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'user_specializations'
    ) THEN
        UPDATE user_specializations
        SET xp_current = 0,
            xp_total = 0,
            level = 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE xp_total > 0;
    END IF;
END $$;

-- Log da limpeza
DO $$
BEGIN
    RAISE NOTICE 'Limpeza de dados legados concluída';
    RAISE NOTICE 'Todos usuários resetados para level 1';
    RAISE NOTICE 'Vídeos e logs de XP removidos';
END $$;
