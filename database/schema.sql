-- Ŷ'UP Database Schema
-- PostgreSQL Database for Wakeboard Social Platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    bio TEXT,
    profile_image_url TEXT,
    role VARCHAR(20) DEFAULT 'user',
    email_verified BOOLEAN DEFAULT false,
    verification_code_hash VARCHAR(255),
    verification_expires_at TIMESTAMP,
    last_verification_email_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    xp_total INTEGER DEFAULT 0,
    xp_current INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1
);

-- Parks Table
CREATE TABLE parks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT,
    website VARCHAR(255),
    phone VARCHAR(20),
    logo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Obstacles Table
CREATE TABLE obstacles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- kicker, slider, rail, etc
    description TEXT,
    park_id UUID REFERENCES parks(id) ON DELETE SET NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tricks catalog
CREATE TABLE tricks (
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

CREATE TABLE exp_metrics (
    code VARCHAR(80) PRIMARY KEY,
    display VARCHAR(120) NOT NULL,
    exp_bonus INTEGER NOT NULL,
    category VARCHAR(60),
    priority INTEGER DEFAULT 0
);

-- Seasons Table
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(120) NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Season Passes Table
CREATE TABLE season_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    park_id UUID REFERENCES parks(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Monthly Passes Table
CREATE TABLE monthly_passes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_pass_id UUID REFERENCES season_passes(id) ON DELETE CASCADE,
    month INTEGER CHECK (month BETWEEN 1 AND 12),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Challenges Table
CREATE TABLE challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
    park_id UUID REFERENCES parks(id) ON DELETE SET NULL,
    season_pass_id UUID REFERENCES season_passes(id) ON DELETE SET NULL,
    monthly_pass_id UUID REFERENCES monthly_passes(id) ON DELETE SET NULL,
    obstacle_ids UUID[] DEFAULT '{}',
    difficulty VARCHAR(50),
    maneuver_type VARCHAR(50) NOT NULL,
    maneuver_name TEXT NOT NULL,
    maneuver_payload JSONB DEFAULT '{}'::jsonb NOT NULL,
    reward_xp INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Videos Table
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    park_id UUID REFERENCES parks(id) ON DELETE SET NULL,
    obstacle_id UUID REFERENCES obstacles(id) ON DELETE SET NULL,
    trick_id UUID REFERENCES tricks(id) ON DELETE SET NULL,
    video_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    duration INTEGER, -- em segundos
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    metrics JSONB DEFAULT '[]'::jsonb,
    exp_awarded INTEGER DEFAULT 0,
    score_breakdown JSONB DEFAULT '{}'::jsonb,
    original_size BIGINT, -- tamanho original em bytes
    compressed_size BIGINT, -- tamanho comprimido em bytes
    compression_ratio DECIMAL(5,2), -- porcentagem de compressão
    processing_time INTEGER, -- tempo de processamento em segundos
    client_upload_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_videos_user_client_upload
    ON videos(user_id, client_upload_id)
    WHERE client_upload_id IS NOT NULL;

-- Challenge Completions
CREATE TABLE user_challenge_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, challenge_id)
);

CREATE TABLE user_exp_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    exp_awarded INTEGER NOT NULL,
    breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Likes Table
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, video_id)
);

-- Comments Table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Badges Table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url VARCHAR(500),
    category VARCHAR(50) NOT NULL, -- park, obstacle, video_count, special_trick, event
    requirement_type VARCHAR(50) NOT NULL, -- first_post, count, manual, etc
    requirement_value INTEGER,
    rarity VARCHAR(20) DEFAULT 'common', -- common, rare, epic, legendary
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Badges Table (conquistas)
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    earned_through VARCHAR(100), -- video_id, park_id, etc
    UNIQUE(user_id, badge_id)
);

-- Check-ins Table
CREATE TABLE checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    park_id UUID NOT NULL REFERENCES parks(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE SET NULL,
    checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- like, comment, badge, challenge
    title VARCHAR(100) NOT NULL,
    message TEXT,
    data JSONB, -- dados adicionais da notificação
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follows Table (para futuras funcionalidades)
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_videos_user_id ON videos(user_id);
CREATE INDEX idx_videos_park_id ON videos(park_id);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_likes_video_id ON likes(video_id);
CREATE INDEX idx_likes_user_video ON likes(user_id, video_id);
CREATE INDEX idx_comments_video_id ON comments(video_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_checkins_user_park ON checkins(user_id, park_id);

-- Insert initial parks data
-- Nota: badges iniciais removidos intencionalmente; mantenha tabela vazia para configuração manual.
INSERT INTO parks (name, description, latitude, longitude, address) VALUES
('Naga Cable Park', 'O maior e mais completo parque de wakeboard da América Latina', -23.1019, -47.1863, 'Rod. João Mellão, km 57 - Sertãozinho, SP'),
('Sunset Cable Park', 'Parque com vista privilegiada para o pôr do sol', -22.9068, -47.0653, 'Estrada do Guarani - Campinas, SP'),
('CBL Cable Park', 'Parque urbano com obstáculos desafiadores', -23.5505, -46.6333, 'Av. das Nações Unidas - São Paulo, SP');

-- Insert initial obstacles data
INSERT INTO obstacles (name, type, description, difficulty_level) VALUES
('Kicker Pequeno', 'kicker', 'Kicker iniciante para primeiros saltos', 1),
('Kicker Médio', 'kicker', 'Kicker intermediário para manobras evoluídas', 3),
('Kicker Grande', 'kicker', 'Kicker avançado para grandes saltos', 5),
('Slider Reto', 'slider', 'Slider reto para grinds básicos', 2),
('Slider Curvo', 'slider', 'Slider com curva para manobras mais complexas', 4),
('Rail Inclinado', 'rail', 'Rail com inclinação para slides dinâmicos', 3),
('Rail de Escada', 'rail', 'Rail com degraus para manobras técnicas', 4),
('Box Plano', 'box', 'Box plano para manobras de equilíbrio', 2);

-- Insert Seasons, Passes and Challenges
INSERT INTO seasons (name, start_date, end_date) VALUES
('Temporada 2025', '2025-01-01', '2025-12-31');

INSERT INTO season_passes (season_id, park_id, name, description) VALUES
((SELECT id FROM seasons WHERE name = 'Temporada 2025'),
 (SELECT id FROM parks WHERE name = 'Naga Cable Park'),
 'Season Pass Naga 2025',
 'Passe anual completo do Naga Cable Park');

INSERT INTO monthly_passes (season_pass_id, month, name, description) VALUES
((SELECT sp.id FROM season_passes sp JOIN seasons s ON sp.season_id = s.id WHERE sp.name = 'Season Pass Naga 2025'),
 1,
 'Passe Janeiro Naga',
 'Acesso ilimitado durante o mês de janeiro');

INSERT INTO challenges (season_id, park_id, season_pass_id, monthly_pass_id, obstacle_ids, difficulty, trick, description)
VALUES (
  (SELECT id FROM seasons WHERE name = 'Temporada 2025'),
  (SELECT id FROM parks WHERE name = 'Naga Cable Park'),
  (SELECT id FROM season_passes WHERE name = 'Season Pass Naga 2025'),
  (SELECT id FROM monthly_passes WHERE name = 'Passe Janeiro Naga'),
  ARRAY[(SELECT id FROM obstacles WHERE name = 'Kicker Pequeno')],
  'Intermediário',
  'Backroll',
  'Desafio inicial da temporada no Naga Cable Park'
);
