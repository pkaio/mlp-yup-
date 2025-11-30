-- Migration: Adicionar sistema de detecção de sofisticação do usuário
-- Data: 2025-10-30
-- Descrição: Adiciona coluna sophistication_level para controlar interface adaptativa

-- Adicionar coluna sophistication_level na tabela users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS sophistication_level VARCHAR(20) DEFAULT 'BEGINNER' CHECK (sophistication_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PRO'));

-- Criar índice para otimizar consultas por nível de sofisticação
CREATE INDEX IF NOT EXISTS idx_users_sophistication_level ON users(sophistication_level);

-- Comentários para documentação
COMMENT ON COLUMN users.sophistication_level IS 'Nível de sofisticação do usuário calculado baseado em atividade: BEGINNER, INTERMEDIATE, ADVANCED, PRO';

-- Atualizar usuários existentes (opcional - será calculado dinamicamente)
-- Por padrão, todos começam como BEGINNER
UPDATE users SET sophistication_level = 'BEGINNER' WHERE sophistication_level IS NULL;
