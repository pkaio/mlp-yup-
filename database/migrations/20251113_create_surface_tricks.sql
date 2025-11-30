/**
 * Create Surface tricks to match skill tree nodes
 * These tricks will be linked to skill_tree_nodes for XP calculation
 */

-- Insert Surface tricks matching skill tree nodes
INSERT INTO tricks (nome, nome_curto, categoria, obstaculo, tipo, descricao, nivel, tags, exp_base, specialization) VALUES

-- Row 1: Basic tricks
('Frontside 180', 'FS 180', 'Rotation', 'Air', 'Spin', 'Basic frontside 180 rotation in the air', 'Beginner', '["spin", "air"]'::jsonb, 100, 'surface'),
('Ollie', 'OLLIE', 'Air', 'Air', 'Ollie', 'Pop off the water surface using edge pressure', 'Beginner', '["ollie", "air"]'::jsonb, 80, 'surface'),
('Ollie Frontside 180', 'OLLIE FS 180', 'Combo', 'Air', 'Merge', 'Combine ollie with frontside 180 rotation', 'Intermediate', '["ollie", "spin", "air", "merge"]'::jsonb, 180, 'surface'),

-- Row 2: Switch variations
('Switch Frontside 180', 'SW FS 180', 'Rotation', 'Air', 'Spin', 'Frontside 180 rotation in switch stance', 'Intermediate', '["spin", "air", "switch"]'::jsonb, 150, 'surface'),
('Ollie Switch', 'OLLIE SW', 'Air', 'Air', 'Ollie', 'Pop off the water in switch stance', 'Intermediate', '["ollie", "air", "switch"]'::jsonb, 120, 'surface'),
('Ollie Switch Frontside 180', 'OLLIE SW FS 180', 'Combo', 'Air', 'Merge', 'Switch ollie combined with frontside 180', 'Advanced', '["ollie", "spin", "air", "switch", "merge"]'::jsonb, 250, 'surface'),

-- Row 3: Backside rotation
('Backside 180', 'BS 180', 'Rotation', 'Air', 'Spin', 'Basic backside 180 rotation in the air', 'Intermediate', '["spin", "air"]'::jsonb, 120, 'surface'),
('Ollie Backside 180', 'OLLIE BS 180', 'Combo', 'Air', 'Merge', 'Combine ollie with backside 180 rotation', 'Advanced', '["ollie", "spin", "air", "merge"]'::jsonb, 200, 'surface'),

-- Row 4: Advanced switch backside
('Switch Backside 180', 'SW BS 180', 'Rotation', 'Air', 'Spin', 'Backside 180 rotation in switch stance', 'Advanced', '["spin", "air", "switch"]'::jsonb, 180, 'surface'),
('Ollie Switch Backside 180', 'OLLIE SW BS 180', 'Combo', 'Air', 'Merge', 'Switch ollie combined with backside 180', 'Expert', '["ollie", "spin", "air", "switch", "merge"]'::jsonb, 300, 'surface');

-- Comment
COMMENT ON TABLE tricks IS 'Wakeboard tricks database with XP values for skill progression system';
