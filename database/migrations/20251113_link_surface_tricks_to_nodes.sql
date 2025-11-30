/**
 * Link Surface tricks to skill tree nodes by matching titles
 * This enables automatic XP calculation when users complete skill tree quests
 */

-- Update skill_tree_nodes with matching trick_id values
-- Matching by simplified title (removing quotes and punctuation)

-- Row 1 Nodes
UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Frontside "FS" 180'
  AND t.nome = 'Frontside 180';

UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Ollie'
  AND t.nome = 'Ollie';

UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Ollie Frontside "FS" 180'
  AND t.nome = 'Ollie Frontside 180';

-- Row 2 Nodes
UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Switch "SW" Frontside "FS" 180'
  AND t.nome = 'Switch Frontside 180';

UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Ollie Switch'
  AND t.nome = 'Ollie Switch';

UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Ollie Switch "SW" Frontside "FS" 180'
  AND t.nome = 'Ollie Switch Frontside 180';

-- Row 3 Nodes
UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Backside "BS" 180'
  AND t.nome = 'Backside 180';

UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Ollie Backside "BS" 180'
  AND t.nome = 'Ollie Backside 180';

-- Row 4 Nodes
UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Switch "SW" Backside "BS" 180'
  AND t.nome = 'Switch Backside 180';

UPDATE skill_tree_nodes stn
SET trick_id = t.id
FROM tricks t
WHERE stn.specialization = 'surface'
  AND stn.title = 'Ollie Switch "SW" Backside "BS" 180'
  AND t.nome = 'Ollie Switch Backside 180';

-- Verify the mapping
SELECT
  stn.title as node_title,
  t.nome as trick_name,
  t.exp_base,
  stn.branch_type,
  stn.display_row
FROM skill_tree_nodes stn
LEFT JOIN tricks t ON stn.trick_id = t.id
WHERE stn.specialization = 'surface'
ORDER BY stn.display_row, stn.branch_type;
