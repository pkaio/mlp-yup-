-- ========================================
-- Atualiza a tabela de tricks para suportar o novo sistema
-- baseado em componentes de manobras
-- ========================================

BEGIN;

ALTER TABLE tricks
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(20);

ALTER TABLE tricks
  ADD COLUMN IF NOT EXISTS component_payload JSONB;

ALTER TABLE tricks
  ADD COLUMN IF NOT EXISTS component_xp INTEGER DEFAULT 0;

ALTER TABLE tricks
  ADD COLUMN IF NOT EXISTS is_component_based BOOLEAN DEFAULT false;

-- Garante que o XP legado migre para o novo campo
UPDATE tricks
   SET component_xp = COALESCE(exp_base, 0)
 WHERE component_xp IS NULL;

CREATE INDEX IF NOT EXISTS idx_tricks_component_based ON tricks(is_component_based);

COMMENT ON COLUMN tricks.specialization IS 'Especialização RPG (slider, kicker, surface)';
COMMENT ON COLUMN tricks.component_payload IS 'JSON com os componentes da manobra (approach, entry, spins, grabs, base_moves, modifiers)';
COMMENT ON COLUMN tricks.component_xp IS 'XP calculado automaticamente a partir dos componentes';
COMMENT ON COLUMN tricks.is_component_based IS 'Flag para distinguir manobras já migradas para o novo sistema';

COMMIT;
