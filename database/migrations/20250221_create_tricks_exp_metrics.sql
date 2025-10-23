-- Ensure tricks and exp_metrics tables exist for XP system

CREATE TABLE IF NOT EXISTS tricks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(120) NOT NULL,
    nome_curto VARCHAR(40),
    categoria VARCHAR(80),
    obstaculo VARCHAR(80),
    tipo VARCHAR(80),
    descricao TEXT,
    variacoes TEXT,
    nivel VARCHAR(40),
    tags JSONB DEFAULT '[]'::jsonb,
    exp_base INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exp_metrics (
    code VARCHAR(80) PRIMARY KEY,
    display VARCHAR(120) NOT NULL,
    exp_bonus INTEGER NOT NULL,
    category VARCHAR(60),
    priority INTEGER DEFAULT 0
);
