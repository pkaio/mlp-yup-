-- ========================================
-- MIGRAÇÃO DE REWARD_XP PARA BONUS_XP
-- ========================================
-- Migra os valores de reward_xp dos challenges para o novo campo bonus_xp
-- ========================================

-- Migrar valores existentes de challenges
UPDATE challenges
SET bonus_xp = COALESCE(reward_xp, 0)
WHERE bonus_xp = 0 OR bonus_xp IS NULL;

-- Definir valores de bonus_xp para skill_tree_nodes (quests)
-- Valores baseados na difficulty dos nós
UPDATE skill_tree_nodes
SET bonus_xp = CASE
  WHEN branch_type = 'quest' AND display_row <= 2 THEN 50   -- Quests iniciais
  WHEN branch_type = 'quest' AND display_row <= 4 THEN 100  -- Quests intermediárias
  WHEN branch_type = 'quest' THEN 150                       -- Quests avançadas
  ELSE 0
END
WHERE bonus_xp = 0 OR bonus_xp IS NULL;

-- Log da migração
DO $$
DECLARE
    challenges_updated INTEGER;
    quests_updated INTEGER;
BEGIN
    SELECT COUNT(*) INTO challenges_updated
    FROM challenges
    WHERE bonus_xp > 0;

    SELECT COUNT(*) INTO quests_updated
    FROM skill_tree_nodes
    WHERE bonus_xp > 0 AND branch_type = 'quest';

    RAISE NOTICE 'Migração concluída:';
    RAISE NOTICE '  - % challenges com bonus_xp definido', challenges_updated;
    RAISE NOTICE '  - % quests com bonus_xp definido', quests_updated;
END $$;
