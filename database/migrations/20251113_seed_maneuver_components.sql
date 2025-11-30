-- ========================================
-- SEED DE COMPONENTES DE MANOBRAS
-- ========================================
-- Insere todos os 78 componentes divididos em 6 categorias
-- ========================================

-- ========================================
-- 1. APPROACH (4 componentes)
-- ========================================
INSERT INTO maneuver_components (component_id, division, display_name, description, xp_value, metadata) VALUES
('hs', 'approach', 'HS', 'Heelside approach using the heelside edge', 2, '{"edge": "HS"}'::jsonb),
('ts', 'approach', 'TS', 'Toeside approach using the toeside edge', 3, '{"edge": "TS"}'::jsonb),
('sw_hs', 'approach', 'SW HS', 'Switch stance, heelside approach', 3, '{"edge": "HS", "stance": "switch"}'::jsonb),
('sw_ts', 'approach', 'SW TS', 'Switch stance, toeside approach', 4, '{"edge": "TS", "stance": "switch"}'::jsonb);

-- ========================================
-- 2. ENTRY (3 componentes)
-- ========================================
INSERT INTO maneuver_components (component_id, division, display_name, description, xp_value, metadata) VALUES
('ride_on', 'entry', 'Ride On', 'Riding directly onto the feature without ollie', 0, '{"type": "ride_on"}'::jsonb),
('ollie_on', 'entry', 'Ollie', 'Ollie onto the feature', 3, '{"type": "ollie"}'::jsonb),
('transfer', 'entry', 'Transfer', 'Jump/transfer from one part of the feature or obstacle to another', 5, '{"type": "transfer"}'::jsonb);

-- ========================================
-- 3. SPINS (16 componentes)
-- ========================================
INSERT INTO maneuver_components (component_id, division, display_name, description, xp_value, metadata) VALUES
('fs180', 'spins', 'FS 180', 'Frontside 180 degree rotation', 10, '{"spin_dir": "FS", "spin_deg": 180}'::jsonb),
('bs180', 'spins', 'BS 180', 'Backside 180 degree rotation', 12, '{"spin_dir": "BS", "spin_deg": 180}'::jsonb),
('fs360', 'spins', 'FS 360', 'Frontside 360 degree rotation', 20, '{"spin_dir": "FS", "spin_deg": 360}'::jsonb),
('bs360', 'spins', 'BS 360', 'Backside 360 degree rotation', 22, '{"spin_dir": "BS", "spin_deg": 360}'::jsonb),
('fs540', 'spins', 'FS 540', 'Frontside 540 degree rotation', 30, '{"spin_dir": "FS", "spin_deg": 540}'::jsonb),
('bs540', 'spins', 'BS 540', 'Backside 540 degree rotation', 32, '{"spin_dir": "BS", "spin_deg": 540}'::jsonb),
('fs720', 'spins', 'FS 720', 'Frontside 720 degree rotation', 40, '{"spin_dir": "FS", "spin_deg": 720}'::jsonb),
('bs720', 'spins', 'BS 720', 'Backside 720 degree rotation', 42, '{"spin_dir": "BS", "spin_deg": 720}'::jsonb),
('fs900', 'spins', 'FS 900', 'Frontside 900 degree rotation', 50, '{"spin_dir": "FS", "spin_deg": 900}'::jsonb),
('bs900', 'spins', 'BS 900', 'Backside 900 degree rotation', 52, '{"spin_dir": "BS", "spin_deg": 900}'::jsonb),
('fs1080', 'spins', 'FS 1080', 'Frontside 1080 degree rotation', 60, '{"spin_dir": "FS", "spin_deg": 1080}'::jsonb),
('bs1080', 'spins', 'BS 1080', 'Backside 1080 degree rotation', 62, '{"spin_dir": "BS", "spin_deg": 1080}'::jsonb),
('fs1260', 'spins', 'FS 1260', 'Frontside 1260 degree rotation', 70, '{"spin_dir": "FS", "spin_deg": 1260}'::jsonb),
('bs1260', 'spins', 'BS 1260', 'Backside 1260 degree rotation', 72, '{"spin_dir": "BS", "spin_deg": 1260}'::jsonb),
('fs1440', 'spins', 'FS 1440', 'Frontside 1440 degree rotation', 80, '{"spin_dir": "FS", "spin_deg": 1440}'::jsonb),
('bs1440', 'spins', 'BS 1440', 'Backside 1440 degree rotation', 82, '{"spin_dir": "BS", "spin_deg": 1440}'::jsonb);

-- ========================================
-- 4. GRABS (15 componentes)
-- ========================================
INSERT INTO maneuver_components (component_id, division, display_name, description, xp_value, metadata) VALUES
('indy', 'grabs', 'Indy', 'Mão traseira segurando a borda toe-side entre as bindings', 10, '{"side": "toe", "hand": "back"}'::jsonb),
('tindy', 'grabs', 'Tindy', 'Mão traseira segurando a borda toe-side entre o pé traseiro e o tail', 10, '{"side": "toe", "hand": "back"}'::jsonb),
('tail', 'grabs', 'Tail', 'Mão traseira segurando o tail da prancha', 10, '{"side": "tail", "hand": "back"}'::jsonb),
('tailfish', 'grabs', 'Tailfish', 'Borda heel-side atrás da binding traseira', 15, '{"side": "heel", "hand": "back"}'::jsonb),
('stalefish', 'grabs', 'Stalefish', 'Mão traseira segurando o heel-side entre as bindings', 15, '{"side": "heel", "hand": "back"}'::jsonb),
('melon', 'grabs', 'Melon', 'Mão dianteira segurando o heel-side entre as bindings', 10, '{"side": "heel", "hand": "front"}'::jsonb),
('mute', 'grabs', 'Mute', 'Mão dianteira segurando o toe-side entre as bindings', 10, '{"side": "toe", "hand": "front"}'::jsonb),
('method', 'grabs', 'Method', 'Mão dianteira segurando heel-side à frente da binding dianteira', 15, '{"side": "heel", "hand": "front"}'::jsonb),
('nose', 'grabs', 'Nose', 'Mão dianteira segurando a ponta frontal (nose) da prancha', 15, '{"side": "nose", "hand": "front"}'::jsonb),
('slob', 'grabs', 'Slob', 'Mão dianteira segurando toe-side entre a binding dianteira e o nose', 10, '{"side": "toe", "hand": "front"}'::jsonb),
('crail', 'grabs', 'Crail', 'Mão traseira segurando toe-side próximo ao nose', 20, '{"side": "toe", "hand": "back"}'::jsonb),
('nuclear', 'grabs', 'Nuclear', 'Mão traseira segurando heel-side à frente da binding dianteira', 20, '{"side": "heel", "hand": "back"}'::jsonb),
('seatbelt', 'grabs', 'Seat Belt', 'Mão dianteira cruzando até o heel-side atrás da binding traseira', 20, '{"side": "heel", "hand": "front"}'::jsonb),
('roastbeef', 'grabs', 'Roast Beef', 'Mão traseira segurando heel-side entre as bindings, por baixo da perna', 20, '{"side": "heel", "hand": "back"}'::jsonb),
('chickensalad', 'grabs', 'Chicken Salad', 'Mão traseira segurando heel-side entre as bindings, por cima da perna', 20, '{"side": "heel", "hand": "back"}'::jsonb);

-- ========================================
-- 5. BASE_MOVES (26 componentes)
-- ========================================
INSERT INTO maneuver_components (component_id, division, display_name, description, xp_value, metadata) VALUES
-- Surface family
('surface_180', 'base_moves', 'Surface 180', 'Surface 180 degree rotation', 10, '{"family": "surface"}'::jsonb),
('surface_360', 'base_moves', 'Surface 360', 'Surface 360 degree rotation', 15, '{"family": "surface"}'::jsonb),
('side_slide', 'base_moves', 'Side Slide', 'Side slide (FS 90)', 8, '{"family": "surface"}'::jsonb),
('powerslide', 'base_moves', 'Powerslide', 'Powerslide (BS 90)', 10, '{"family": "surface"}'::jsonb),
('ollie', 'base_moves', 'Ollie', 'Ollie off the water', 8, '{"family": "surface"}'::jsonb),

-- Railey family
('railey', 'base_moves', 'Railey', 'Railey', 40, '{"family": "railey_family"}'::jsonb),
('ts_railey', 'base_moves', 'TS Railey', 'Toeside Railey', 45, '{"family": "railey_family"}'::jsonb),
('s_bend', 'base_moves', 'S-Bend', 'S-Bend', 55, '{"family": "railey_family"}'::jsonb),
('ts_s_bend', 'base_moves', 'TS S-Bend', 'Toeside S-Bend', 58, '{"family": "railey_family"}'::jsonb),

-- Invert family
('backroll', 'base_moves', 'Back Roll', 'Back Roll', 35, '{"family": "invert"}'::jsonb),
('ts_backroll', 'base_moves', 'TS Back Roll', 'Toeside Back Roll', 38, '{"family": "invert"}'::jsonb),
('mexican_roll', 'base_moves', 'Mexican Roll', 'HS Frontflip', 40, '{"family": "invert"}'::jsonb),
('frontflip', 'base_moves', 'Front Flip', 'Front Flip', 35, '{"family": "invert"}'::jsonb),
('frontroll_ts', 'base_moves', 'TS Front Roll', 'TS Front Roll', 35, '{"family": "invert"}'::jsonb),
('scarecrow', 'base_moves', 'Scarecrow', 'Scarecrow (TS front roll FS 180)', 40, '{"family": "invert"}'::jsonb),
('tantrum', 'base_moves', 'Tantrum', 'Tantrum (HS back roll)', 35, '{"family": "invert"}'::jsonb),
('bell_air', 'base_moves', 'Bell Air', 'Bell air (HS back flip off toeside rail)', 38, '{"family": "invert"}'::jsonb),
('ben_air', 'base_moves', 'Ben Air', 'Ben air (front roll off heelside edge)', 38, '{"family": "invert"}'::jsonb),
('egg_roll', 'base_moves', 'Egg Roll', 'Egg roll (scarecrow off heelside edge)', 40, '{"family": "invert"}'::jsonb),

-- Rail family
('5050', 'base_moves', '50/50', '50/50 rail slide', 10, '{"family": "rail"}'::jsonb),
('bs_boardslide', 'base_moves', 'BS Boardslide', 'Backside Boardslide', 15, '{"family": "rail"}'::jsonb),
('front_lip', 'base_moves', 'Front Lip', 'Front lipslide', 15, '{"family": "rail"}'::jsonb),
('back_lip', 'base_moves', 'Back Lip', 'Back lipslide', 16, '{"family": "rail"}'::jsonb),
('frontboard', 'base_moves', 'Frontboard', 'Frontboard slide', 16, '{"family": "rail"}'::jsonb),
('gap', 'base_moves', 'Gap', 'Gap on rail', 18, '{"family": "rail"}'::jsonb),
('rail_transfer', 'base_moves', 'Rail Transfer', 'Transfer between rails', 20, '{"family": "rail"}'::jsonb);

-- ========================================
-- 6. MODIFIERS (14 componentes)
-- ========================================
INSERT INTO maneuver_components (component_id, division, display_name, description, xp_value, metadata) VALUES
('none', 'modifiers', 'None', 'No additional modifier', 0, '{"type": "none"}'::jsonb),
('switch', 'modifiers', 'Switch', 'Riding with opposite foot forward (fakie)', 5, '{"type": "switch"}'::jsonb),
('fakie', 'modifiers', 'Fakie', 'Landing or riding switch', 5, '{"type": "fakie"}'::jsonb),
('blind', 'modifiers', 'Blind', 'Blind landing after last half BS rotation', 8, '{"type": "blind"}'::jsonb),
('hp', 'modifiers', 'Handle Pass', 'Handle pass in the air', 12, '{"type": "handle_pass"}'::jsonb),
('wrapped', 'modifiers', 'Wrapped', 'Approach or execute spin with handle wrapped', 8, '{"type": "wrapped"}'::jsonb),
('baller', 'modifiers', 'Baller', 'Handle pass between the legs (baller)', 10, '{"type": "baller"}'::jsonb),
('ole', 'modifiers', 'Ole', 'Rope passed above the head instead of handle pass', 10, '{"type": "ole"}'::jsonb),
('on_axis', 'modifiers', 'On-Axis', 'On-axis spinning (board perpendicular to water)', 5, '{"type": "axis"}'::jsonb),
('off_axis', 'modifiers', 'Off-Axis', 'Off-axis (board not perpendicular to water)', 10, '{"type": "axis"}'::jsonb),
('rewind', 'modifiers', 'Rewind', 'Rotation that changes direction mid-air', 10, '{"type": "rewind"}'::jsonb),
('to_fakie', 'modifiers', 'To Fakie', 'Ending the trick to fakie', 6, '{"type": "landing_var"}'::jsonb),
('to_blind', 'modifiers', 'To Blind', 'Ending the trick to blind', 8, '{"type": "landing_var"}'::jsonb),
('to_revert', 'modifiers', 'To Revert', 'Ending the trick roll-to-revert style', 6, '{"type": "landing_var"}'::jsonb);

-- Log da inserção
DO $$
DECLARE
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM maneuver_components;
    RAISE NOTICE 'Seed concluído: % componentes inseridos', total_count;
    RAISE NOTICE '  - APPROACH: 4 componentes';
    RAISE NOTICE '  - ENTRY: 3 componentes';
    RAISE NOTICE '  - SPINS: 16 componentes';
    RAISE NOTICE '  - GRABS: 15 componentes';
    RAISE NOTICE '  - BASE_MOVES: 26 componentes';
    RAISE NOTICE '  - MODIFIERS: 14 componentes';
END $$;
