/**
 * Seed Surface Specialization Grid
 * Populates 4 rows with SPIN | MERGE | OLLIE layout
 * Educational naming: "Frontside 'FS' 180" format
 */

-- Check if grid nodes already exist
DO $$
DECLARE
  existing_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO existing_count
  FROM skill_tree_nodes
  WHERE branch_type IS NOT NULL;

  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Found % existing grid nodes. Delete them first if you want to re-seed.', existing_count;
  END IF;
END $$;

-- ROW 1: FRONTSIDE 180 (Tier 1)
DO $$
DECLARE
  ollie_basic_id UUID;
  spin_fs180_id UUID;
BEGIN
  -- Insert OLLIE (shared node)
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'surface', 1, 3, 'ollie', 1,
    'Ollie',
    'Master the basic ollie - the foundation for all tricks. Pop off the water and land smoothly.',
    NULL,
    '["Load weight on the tail of the board", "Pop explosively off the back foot", "Level out in the air with front foot", "Spot your landing early"]'::jsonb,
    '["Not loading enough weight on the tail", "Popping too late or too early", "Landing with stiff legs"]'::jsonb,
    '[]'::jsonb,
    true,
    100, NULL, true, true
  ) RETURNING id INTO ollie_basic_id;

  -- Insert SPIN: Frontside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'surface', 1, 1, 'spin', 1,
    'Frontside "FS" 180',
    'Perform a 180-degree frontside rotation on the water surface. Your first spin trick!',
    NULL,
    ARRAY['Start with good edge control', 'Use your shoulders to initiate the spin', 'Keep your weight centered throughout', 'Look where you want to go'],
    ARRAY['Leaning too far forward or back', 'Not committing to the full rotation', 'Losing balance mid-spin'],
    ARRAY[]::TEXT[],
    true,
    120, NULL, true, false
  ) RETURNING id INTO spin_fs180_id;

  -- Insert MERGE: Ollie Frontside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'surface', 1, 2, 'merge', 1,
    'Ollie Frontside "FS" 180',
    'Combine an ollie with a frontside 180 rotation. Pop up and spin!',
    NULL,
    ARRAY['Master both Ollie and FS 180 first', 'Pop the ollie, then initiate rotation', 'Keep the rotation smooth and controlled', 'Spot your landing at 90 degrees'],
    ARRAY['Rotating before popping', 'Over-rotating or under-rotating', 'Not maintaining height during spin'],
    ARRAY[spin_fs180_id::TEXT, ollie_basic_id::TEXT],
    true,
    250, NULL, true, false,
    spin_fs180_id, ollie_basic_id
  );

  RAISE NOTICE 'Row 1 seeded: Frontside 180 tricks';
END $$;

-- ROW 2: SWITCH FRONTSIDE 180 (Tier 2)
DO $$
DECLARE
  ollie_basic_id UUID;
  ollie_switch_id UUID;
  spin_swfs180_id UUID;
BEGIN
  -- Get ollie_basic_id from row 1
  SELECT id INTO ollie_basic_id FROM skill_tree_nodes WHERE title = 'Ollie' AND branch_type = 'ollie' AND display_row = 1;

  -- Insert OLLIE SWITCH (shared node)
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'surface', 2, 3, 'ollie', 2,
    'Ollie Switch',
    'Execute an ollie while riding switch (opposite stance). Advanced pop control required.',
    NULL,
    ARRAY['Get comfortable riding switch first', 'Load the tail just like regular ollie', 'Build confidence with small pops first', 'Practice landing switch smoothly'],
    ARRAY['Not being comfortable in switch stance', 'Weak pop due to unfamiliar foot position', 'Landing off-balance'],
    ARRAY[ollie_basic_id::TEXT],
    true,
    150, NULL, true, true
  ) RETURNING id INTO ollie_switch_id;

  -- Insert SPIN: Switch Frontside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'surface', 2, 1, 'spin', 2,
    'Switch "SW" Frontside "FS" 180',
    'Frontside 180 while riding switch. Combines switch riding with frontside rotation.',
    NULL,
    ARRAY['Master regular FS 180 first', 'Get comfortable riding switch', 'Initiate rotation with shoulders', 'Land in regular stance'],
    ARRAY['Rushing the rotation', 'Not being stable in switch stance', 'Over-rotating due to unfamiliar mechanics'],
    ARRAY[(SELECT id::TEXT FROM skill_tree_nodes WHERE title = 'Frontside "FS" 180')],
    true,
    180, NULL, true, false
  ) RETURNING id INTO spin_swfs180_id;

  -- Insert MERGE: Ollie Switch Frontside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'surface', 2, 2, 'merge', 2,
    'Ollie Switch "SW" Frontside "FS" 180',
    'The ultimate combo: ollie while switch, then rotate frontside 180. Advanced trick!',
    NULL,
    ARRAY['Master both switch ollie and switch FS 180', 'Pop explosively while switch', 'Rotate smoothly through the air', 'Land in regular stance with confidence'],
    ARRAY['Not committing to the full movement', 'Weak pop from switch stance', 'Landing off-balance'],
    ARRAY[spin_swfs180_id::TEXT, ollie_switch_id::TEXT],
    true,
    350, 'Switch Master', true, false,
    spin_swfs180_id, ollie_switch_id
  );

  RAISE NOTICE 'Row 2 seeded: Switch Frontside 180 tricks';
END $$;

-- ROW 3: BACKSIDE 180 (Tier 1)
DO $$
DECLARE
  ollie_basic_id UUID;
  spin_bs180_id UUID;
BEGIN
  -- Get ollie_basic_id from row 1 (reuse)
  SELECT id INTO ollie_basic_id FROM skill_tree_nodes WHERE title = 'Ollie' AND branch_type = 'ollie' AND display_row = 1;

  -- Insert SPIN: Backside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'surface', 1, 1, 'spin', 3,
    'Backside "BS" 180',
    'Perform a 180-degree backside rotation on the water surface. Opposite direction from frontside.',
    NULL,
    ARRAY['Rotate in the opposite direction from frontside', 'Use your shoulders to lead the spin', 'Keep your head turned toward landing', 'Maintain edge control throughout'],
    ARRAY['Not looking where you''re going', 'Rotating too fast or too slow', 'Losing balance on landing'],
    ARRAY[]::TEXT[],
    true,
    120, NULL, true, false
  ) RETURNING id INTO spin_bs180_id;

  -- Insert MERGE: Ollie Backside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'surface', 1, 2, 'merge', 3,
    'Ollie Backside "BS" 180',
    'Combine an ollie with a backside 180 rotation. Pop up and spin backside!',
    NULL,
    ARRAY['Master both Ollie and BS 180 first', 'Pop the ollie, then initiate backside rotation', 'Look over your shoulder during rotation', 'Commit to the full 180'],
    ARRAY['Not looking at the landing', 'Under-rotating the backside spin', 'Weak pop due to focusing on rotation'],
    ARRAY[spin_bs180_id::TEXT, ollie_basic_id::TEXT],
    true,
    250, NULL, true, false,
    spin_bs180_id, ollie_basic_id
  );

  RAISE NOTICE 'Row 3 seeded: Backside 180 tricks';
END $$;

-- ROW 4: SWITCH BACKSIDE 180 (Tier 2)
DO $$
DECLARE
  ollie_switch_id UUID;
  spin_swbs180_id UUID;
BEGIN
  -- Get ollie_switch_id from row 2 (reuse)
  SELECT id INTO ollie_switch_id FROM skill_tree_nodes WHERE title = 'Ollie Switch' AND branch_type = 'ollie' AND display_row = 2;

  -- Insert SPIN: Switch Backside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node
  ) VALUES (
    'surface', 2, 1, 'spin', 4,
    'Switch "SW" Backside "BS" 180',
    'Backside 180 while riding switch. Advanced switch rotation trick.',
    NULL,
    ARRAY['Master regular BS 180 first', 'Be solid in switch stance', 'Initiate rotation with shoulders and hips', 'Look over shoulder throughout rotation'],
    ARRAY['Not being comfortable riding switch', 'Hesitating on the rotation', 'Landing off-balance'],
    ARRAY[(SELECT id::TEXT FROM skill_tree_nodes WHERE title = 'Backside "BS" 180')],
    true,
    180, NULL, true, false
  ) RETURNING id INTO spin_swbs180_id;

  -- Insert MERGE: Ollie Switch Backside 180
  INSERT INTO skill_tree_nodes (
    specialization, tier, position, branch_type, display_row,
    title, description, trick_id,
    tips, common_mistakes, prerequisites, required_for_unlock,
    xp_bonus, badge_reward, repeatable, is_shared_node,
    merge_left_node_id, merge_right_node_id
  ) VALUES (
    'surface', 2, 2, 'merge', 4,
    'Ollie Switch "SW" Backside "BS" 180',
    'Elite combo: ollie while switch, then rotate backside 180. Master-level trick!',
    NULL,
    ARRAY['Master both switch ollie and switch BS 180', 'Pop hard from switch stance', 'Rotate backside with commitment', 'Land in regular stance smoothly'],
    ARRAY['Weak pop from switch', 'Not committing to full rotation', 'Landing unbalanced'],
    ARRAY[spin_swbs180_id::TEXT, ollie_switch_id::TEXT],
    true,
    350, 'Backside Legend', true, false,
    spin_swbs180_id, ollie_switch_id
  );

  RAISE NOTICE 'Row 4 seeded: Switch Backside 180 tricks';
END $$;

-- Final summary
DO $$
DECLARE
  total_nodes INTEGER;
  shared_nodes INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_nodes FROM skill_tree_nodes WHERE branch_type IS NOT NULL;
  SELECT COUNT(*) INTO shared_nodes FROM skill_tree_nodes WHERE is_shared_node = true;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Surface Skill Tree Grid Seeded Successfully!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total nodes: %', total_nodes;
  RAISE NOTICE 'Shared nodes: %', shared_nodes;
  RAISE NOTICE 'Layout: SPIN | MERGE | OLLIE';
  RAISE NOTICE 'Rows: 4';
  RAISE NOTICE '========================================';
END $$;
