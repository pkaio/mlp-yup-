/**
 * Seed Kicker Specialization Grid
 * Populates grid with SPIN | MERGE | GRAB layout
 * Uses stance_tag for TS/HS selection (user chooses their comfortable stance)
 * Educational naming: "Frontside 'FS' 180" format
 */

-- Check if grid nodes already exist for kicker
DO $$
DECLARE
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM skill_tree_nodes
  WHERE specialization = 'kicker' AND branch_type IS NOT NULL;

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Found % existing kicker grid nodes. Delete them first: DELETE FROM skill_tree_nodes WHERE specialization = ''kicker'' AND branch_type IS NOT NULL;', existing_count;
  END IF;
END $$;

-- ROW 1: FRONTSIDE 180 (Tier 1) - Base tricks
DO $$
DECLARE
  grab_indy_id UUID;
  grab_melon_id UUID;
  grab_mute_id UUID;
  spin_fs180_id UUID;
BEGIN
  -- Insert GRAB: Indy
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'kicker', 1, 3, 'grab', 1,
    'Indy',
    'Master the Indy grab - grabbing the toeside edge between your feet with your back hand.',
    NULL, NULL,
    '["Get comfortable in the air first", "Reach down with your back hand", "Grab toeside edge between bindings", "Hold the grab through landing"]'::jsonb,
    '["Grabbing too early before takeoff", "Not holding the grab long enough", "Landing with stiff legs"]'::jsonb,
    '[]'::jsonb,
    true,
    100, NULL, true, true
  ) RETURNING id INTO grab_indy_id;

  -- Insert GRAB: Melon
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'kicker', 1, 4, 'grab', 2,
    'Melon',
    'Execute a Melon grab - grabbing the heelside edge between your feet with your front hand.',
    NULL, NULL,
    '["Load weight before takeoff", "Reach across with front hand", "Grab heelside edge", "Keep head up and spot landing"]'::jsonb,
    '["Leaning too far back", "Weak grab", "Not bringing knees up enough"]'::jsonb,
    '[]'::jsonb,
    true,
    100, NULL, true, true
  ) RETURNING id INTO grab_melon_id;

  -- Insert GRAB: Mute
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'kicker', 1, 5, 'grab', 3,
    'Mute',
    'Perform a Mute grab - grabbing the toeside edge with your front hand.',
    NULL, NULL,
    '["Pop hard off the kicker", "Twist upper body slightly", "Grab toeside edge with front hand", "Release before landing"]'::jsonb,
    '["Over-rotating", "Grabbing too late", "Not extending enough"]'::jsonb,
    '[]'::jsonb,
    true,
    100, NULL, true, true
  ) RETURNING id INTO grab_mute_id;

  -- Insert SPIN: Frontside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'kicker', 1, 1, 'spin', 1,
    'Frontside "FS" 180',
    'Perform a 180-degree frontside rotation off the kicker. Your first aerial spin!',
    NULL, NULL,
    '["Initiate rotation with shoulders", "Look where you want to land", "Keep knees bent for stability", "Spot landing at 90 degrees"]'::jsonb,
    '["Starting rotation too late", "Not committing fully", "Landing off-balance"]'::jsonb,
    '[]'::jsonb,
    true,
    120, NULL, true, false
  ) RETURNING id INTO spin_fs180_id;

  -- Insert MERGE: Indy FS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 1, 2, 'merge', 4,
    'Indy Frontside "FS" 180',
    'Combine an Indy grab with a frontside 180 rotation. Style and spin!',
    NULL, NULL,
    '["Master both Indy and FS 180 first", "Grab early in the rotation", "Hold grab through spin", "Release before landing"]'::jsonb,
    '["Grabbing too late", "Letting go too early", "Over-rotating"]'::jsonb,
    jsonb_build_array(spin_fs180_id::text, grab_indy_id::text),
    true,
    250, NULL, true, false,
    spin_fs180_id, grab_indy_id
  );

  -- Insert MERGE: Melon FS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 1, 2, 'merge', 5,
    'Melon Frontside "FS" 180',
    'Execute a Melon grab during a frontside 180. Smooth and stylish!',
    NULL, NULL,
    '["Get comfortable with both tricks separately", "Reach for grab as you rotate", "Keep rotation controlled", "Spot landing early"]'::jsonb,
    '["Weak grab", "Rushing the rotation", "Landing backward"]'::jsonb,
    jsonb_build_array(spin_fs180_id::text, grab_melon_id::text),
    true,
    250, NULL, true, false,
    spin_fs180_id, grab_melon_id
  );

  -- Insert MERGE: Mute FS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 1, 2, 'merge', 6,
    'Mute Frontside "FS" 180',
    'Perform a Mute grab while spinning frontside 180. Technical and clean!',
    NULL, NULL,
    '["Master Mute and FS 180 independently", "Initiate spin then grab", "Maintain smooth rotation", "Release grab before touchdown"]'::jsonb,
    '["Grabbing interferes with rotation", "Not enough height", "Landing on edge"]'::jsonb,
    jsonb_build_array(spin_fs180_id::text, grab_mute_id::text),
    true,
    250, NULL, true, false,
    spin_fs180_id, grab_mute_id
  );

  RAISE NOTICE 'Row 1 seeded: Frontside 180 Kicker tricks';
END $$;

-- ROW 2: SWITCH FRONTSIDE 180 (Tier 2) - Advanced variations
DO $$
DECLARE
  spin_swfs180_id UUID;
  grab_indy_id UUID;
  grab_melon_id UUID;
  grab_mute_id UUID;
BEGIN
  -- Get grab IDs from row 1 (reuse shared nodes)
  SELECT id INTO grab_indy_id FROM skill_tree_nodes WHERE title = 'Indy' AND specialization = 'kicker';
  SELECT id INTO grab_melon_id FROM skill_tree_nodes WHERE title = 'Melon' AND specialization = 'kicker';
  SELECT id INTO grab_mute_id FROM skill_tree_nodes WHERE title = 'Mute' AND specialization = 'kicker';

  -- Insert SPIN: Switch Frontside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'kicker', 2, 7, 'spin', 7,
    'Switch "SW" Frontside "FS" 180',
    'Frontside 180 while riding switch. Advanced switch riding technique!',
    NULL, NULL,
    '["Get solid riding switch first", "Approach with confidence", "Rotate with shoulders", "Land in regular stance"]'::jsonb,
    '["Not comfortable switch", "Hesitating on takeoff", "Off-axis rotation"]'::jsonb,
    jsonb_build_array((SELECT id::text FROM skill_tree_nodes WHERE title = 'Frontside "FS" 180' AND specialization = 'kicker')),
    true,
    180, NULL, true, false
  ) RETURNING id INTO spin_swfs180_id;

  -- Insert MERGE: Indy SW FS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 2, 8, 'merge', 8,
    'Indy Switch "SW" Frontside "FS" 180',
    'Advanced combo: switch frontside 180 with an Indy grab!',
    NULL, NULL,
    '["Master switch FS 180 first", "Grab confidently while switch", "Hold through rotation", "Land smoothly in regular"]'::jsonb,
    '["Weak switch pop", "Grabbing too late", "Landing unbalanced"]'::jsonb,
    jsonb_build_array(spin_swfs180_id::text, grab_indy_id::text),
    true,
    350, 'Switch Kicker Master', true, false,
    spin_swfs180_id, grab_indy_id
  );

  -- Insert MERGE: Melon SW FS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 2, 8, 'merge', 9,
    'Melon Switch "SW" Frontside "FS" 180',
    'Elite switch trick: Melon grab with frontside 180!',
    NULL, NULL,
    '["Confidence in switch stance essential", "Smooth rotation initiation", "Strong grab hold", "Precise landing"]'::jsonb,
    '["Rotation too fast", "Weak grab", "Landing off-center"]'::jsonb,
    jsonb_build_array(spin_swfs180_id::text, grab_melon_id::text),
    true,
    350, 'Switch Kicker Master', true, false,
    spin_swfs180_id, grab_melon_id
  );

  -- Insert MERGE: Mute SW FS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 2, 8, 'merge', 10,
    'Mute Switch "SW" Frontside "FS" 180',
    'Master-level: switch frontside 180 with Mute grab!',
    NULL, NULL,
    '["Master both components separately", "Fluid motion from takeoff to landing", "Strong core stability", "Perfect timing"]'::jsonb,
    '["Unstable switch approach", "Grabbing interferes with spin", "Landing backward"]'::jsonb,
    jsonb_build_array(spin_swfs180_id::text, grab_mute_id::text),
    true,
    350, 'Switch Kicker Master', true, false,
    spin_swfs180_id, grab_mute_id
  );

  RAISE NOTICE 'Row 2 seeded: Switch Frontside 180 Kicker tricks';
END $$;

-- ROW 3: BACKSIDE 180 (Tier 1)
DO $$
DECLARE
  spin_bs180_id UUID;
  grab_indy_id UUID;
  grab_melon_id UUID;
  grab_mute_id UUID;
BEGIN
  -- Get grab IDs (reuse)
  SELECT id INTO grab_indy_id FROM skill_tree_nodes WHERE title = 'Indy' AND specialization = 'kicker';
  SELECT id INTO grab_melon_id FROM skill_tree_nodes WHERE title = 'Melon' AND specialization = 'kicker';
  SELECT id INTO grab_mute_id FROM skill_tree_nodes WHERE title = 'Mute' AND specialization = 'kicker';

  -- Insert SPIN: Backside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'kicker', 1, 9, 'spin', 11,
    'Backside "BS" 180',
    'Execute a 180-degree backside rotation off the kicker. Opposite direction from frontside!',
    NULL, NULL,
    '["Look over your shoulder", "Lead with shoulders and hips", "Spot landing early", "Keep weight centered"]'::jsonb,
    '["Not looking at landing", "Rotating too slow", "Off-balance landing"]'::jsonb,
    '[]'::jsonb,
    true,
    120, NULL, true, false
  ) RETURNING id INTO spin_bs180_id;

  -- Insert MERGE: Indy BS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 1, 10, 'merge', 12,
    'Indy Backside "BS" 180',
    'Combine Indy grab with backside 180 rotation. Stylish backside trick!',
    NULL, NULL,
    '["Master Indy and BS 180 separately", "Grab as you initiate spin", "Look over shoulder throughout", "Commit to full rotation"]'::jsonb,
    '["Incomplete rotation", "Weak grab", "Landing on heel edge"]'::jsonb,
    jsonb_build_array(spin_bs180_id::text, grab_indy_id::text),
    true,
    250, NULL, true, false,
    spin_bs180_id, grab_indy_id
  );

  -- Insert MERGE: Melon BS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 1, 10, 'merge', 13,
    'Melon Backside "BS" 180',
    'Perform a Melon grab during backside 180. Smooth style!',
    NULL, NULL,
    '["Get comfortable with both tricks", "Grab heelside edge while rotating", "Maintain controlled spin", "Release before landing"]'::jsonb,
    '["Over-rotating", "Not holding grab", "Landing unstable"]'::jsonb,
    jsonb_build_array(spin_bs180_id::text, grab_melon_id::text),
    true,
    250, NULL, true, false,
    spin_bs180_id, grab_melon_id
  );

  -- Insert MERGE: Mute BS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 1, 10, 'merge', 14,
    'Mute Backside "BS" 180',
    'Execute a Mute grab with backside 180. Technical and clean!',
    NULL, NULL,
    '["Build confidence in both moves", "Grab toeside as you rotate", "Keep head turned to landing", "Land centered"]'::jsonb,
    '["Grabbing too early", "Not enough air", "Landing backward"]'::jsonb,
    jsonb_build_array(spin_bs180_id::text, grab_mute_id::text),
    true,
    250, NULL, true, false,
    spin_bs180_id, grab_mute_id
  );

  RAISE NOTICE 'Row 3 seeded: Backside 180 Kicker tricks';
END $$;

-- ROW 4: SWITCH BACKSIDE 180 (Tier 2)
DO $$
DECLARE
  spin_swbs180_id UUID;
  grab_indy_id UUID;
  grab_melon_id UUID;
  grab_mute_id UUID;
BEGIN
  -- Get grab IDs (reuse)
  SELECT id INTO grab_indy_id FROM skill_tree_nodes WHERE title = 'Indy' AND specialization = 'kicker';
  SELECT id INTO grab_melon_id FROM skill_tree_nodes WHERE title = 'Melon' AND specialization = 'kicker';
  SELECT id INTO grab_mute_id FROM skill_tree_nodes WHERE title = 'Mute' AND specialization = 'kicker';

  -- Insert SPIN: Switch Backside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'kicker', 2, 15, 'spin', 15,
    'Switch "SW" Backside "BS" 180',
    'Backside 180 while riding switch. Advanced switch trick!',
    NULL, NULL,
    '["Master regular BS 180 first", "Solid switch riding", "Rotate backside confidently", "Land in regular stance"]'::jsonb,
    '["Weak switch approach", "Hesitation on rotation", "Landing off-balance"]'::jsonb,
    jsonb_build_array((SELECT id::text FROM skill_tree_nodes WHERE title = 'Backside "BS" 180' AND specialization = 'kicker')),
    true,
    180, NULL, true, false
  ) RETURNING id INTO spin_swbs180_id;

  -- Insert MERGE: Indy SW BS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 2, 16, 'merge', 16,
    'Indy Switch "SW" Backside "BS" 180',
    'Elite combo: switch backside 180 with Indy grab!',
    NULL, NULL,
    '["Master switch BS 180", "Strong Indy grab", "Full commitment", "Smooth landing in regular"]'::jsonb,
    '["Weak switch pop", "Incomplete rotation", "Landing unstable"]'::jsonb,
    jsonb_build_array(spin_swbs180_id::text, grab_indy_id::text),
    true,
    350, 'Backside Kicker Legend', true, false,
    spin_swbs180_id, grab_indy_id
  );

  -- Insert MERGE: Melon SW BS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 2, 16, 'merge', 17,
    'Melon Switch "SW" Backside "BS" 180',
    'Master-level: switch backside 180 with Melon!',
    NULL, NULL,
    '["Perfect switch stance", "Strong rotation", "Solid grab hold", "Precise landing"]'::jsonb,
    '["Off-axis rotation", "Weak grab", "Landing backward"]'::jsonb,
    jsonb_build_array(spin_swbs180_id::text, grab_melon_id::text),
    true,
    350, 'Backside Kicker Legend', true, false,
    spin_swbs180_id, grab_melon_id
  );

  -- Insert MERGE: Mute SW BS180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id, stance_tag,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'kicker', 2, 16, 'merge', 18,
    'Mute Switch "SW" Backside "BS" 180',
    'Ultimate trick: switch backside 180 with Mute grab!',
    NULL, NULL,
    '["Complete mastery of components", "Fluid execution", "Strong core control", "Perfect timing and balance"]'::jsonb,
    '["Unstable switch riding", "Grabbing affects rotation", "Landing off-center"]'::jsonb,
    jsonb_build_array(spin_swbs180_id::text, grab_mute_id::text),
    true,
    350, 'Backside Kicker Legend', true, false,
    spin_swbs180_id, grab_mute_id
  );

  RAISE NOTICE 'Row 4 seeded: Switch Backside 180 Kicker tricks';
END $$;

-- Final summary
DO $$
DECLARE
  total_nodes INTEGER;
  shared_nodes INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_nodes FROM skill_tree_nodes WHERE specialization = 'kicker' AND branch_type IS NOT NULL;
  SELECT COUNT(*) INTO shared_nodes FROM skill_tree_nodes WHERE specialization = 'kicker' AND is_shared_node = true;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Kicker Skill Tree Grid Seeded Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total nodes: %', total_nodes;
  RAISE NOTICE 'Shared nodes: %', shared_nodes;
  RAISE NOTICE 'Layout: SPIN | MERGE | GRAB';
  RAISE NOTICE 'Rows: 4 (19 total nodes with 3 shared grabs)';
  RAISE NOTICE 'Stance: User selects TS or HS preference';
  RAISE NOTICE '========================================';
END $$;
