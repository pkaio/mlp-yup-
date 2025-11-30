/**
 * Fix branch_type constraint to include 'grab'
 * Kicker specialization uses GRAB instead of OLLIE
 */

-- Drop existing constraint
ALTER TABLE skill_tree_nodes
  DROP CONSTRAINT IF EXISTS skill_tree_nodes_branch_type_check;

-- Add new constraint with 'grab' option
ALTER TABLE skill_tree_nodes
  ADD CONSTRAINT skill_tree_nodes_branch_type_check
  CHECK (branch_type IN ('spin', 'merge', 'ollie', 'grab'));

-- Comment
COMMENT ON CONSTRAINT skill_tree_nodes_branch_type_check ON skill_tree_nodes IS
  'Valid branch types: spin, merge, ollie (for Surface/Slider), grab (for Kicker)';
