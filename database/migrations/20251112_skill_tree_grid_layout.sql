/**
 * Migration: Add Grid Layout Support to Skill Tree
 *
 * Adds columns to support 3-column grid layout:
 * - SPIN column (left): Rotation tricks
 * - MERGE column (center): Combined tricks
 * - OLLIE column (right): Base tricks (can be shared)
 *
 * Date: 2025-11-12
 */

-- Add new columns to skill_tree_nodes for grid layout
ALTER TABLE skill_tree_nodes
  ADD COLUMN IF NOT EXISTS branch_type VARCHAR(10) CHECK (branch_type IN ('spin', 'merge', 'ollie')),
  ADD COLUMN IF NOT EXISTS display_row INTEGER,
  ADD COLUMN IF NOT EXISTS merge_left_node_id UUID REFERENCES skill_tree_nodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS merge_right_node_id UUID REFERENCES skill_tree_nodes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_shared_node BOOLEAN DEFAULT false;

-- Add comment to explain the new columns
COMMENT ON COLUMN skill_tree_nodes.branch_type IS
  'Grid column type: spin (left), merge (center), ollie (right)';

COMMENT ON COLUMN skill_tree_nodes.display_row IS
  'Row number in grid display (1, 2, 3, 4...)';

COMMENT ON COLUMN skill_tree_nodes.merge_left_node_id IS
  'For MERGE nodes: references the SPIN node (left prerequisite)';

COMMENT ON COLUMN skill_tree_nodes.merge_right_node_id IS
  'For MERGE nodes: references the OLLIE node (right prerequisite)';

COMMENT ON COLUMN skill_tree_nodes.is_shared_node IS
  'True if this node appears in multiple rows (e.g., base Ollie shared across rows)';

-- Create index for grid queries (specialization + display_row + branch_type)
CREATE INDEX IF NOT EXISTS idx_skill_tree_nodes_grid
  ON skill_tree_nodes(specialization, display_row, branch_type);

-- Create index for merge node lookups
CREATE INDEX IF NOT EXISTS idx_skill_tree_nodes_merge_refs
  ON skill_tree_nodes(merge_left_node_id, merge_right_node_id);

-- Add constraint to ensure MERGE nodes have both left and right references
ALTER TABLE skill_tree_nodes
  ADD CONSTRAINT check_merge_node_references
  CHECK (
    (branch_type = 'merge' AND merge_left_node_id IS NOT NULL AND merge_right_node_id IS NOT NULL)
    OR
    (branch_type != 'merge' AND merge_left_node_id IS NULL AND merge_right_node_id IS NULL)
  );

-- Migration complete
-- Note: Existing nodes will have NULL values for new columns (backward compatible)
-- New grid-based nodes should populate all grid-related fields
