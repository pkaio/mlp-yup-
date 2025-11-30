/**
 * Add stance_tag column to skill_tree_nodes
 * Allows nodes to be tagged with stance preference (e.g., 'TS' for Toeside, 'HS' for Heelside)
 * Used for Kicker specialization to avoid duplicating the entire tree
 */

-- Add stance_tag column (optional, can be NULL for nodes that don't need it)
ALTER TABLE skill_tree_nodes
  ADD COLUMN IF NOT EXISTS stance_tag VARCHAR(10) DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN skill_tree_nodes.stance_tag IS
  'Optional stance tag for specializations like Kicker. Values: TS (Toeside), HS (Heelside), or NULL for stance-agnostic nodes';

-- Create index for efficient filtering by stance
CREATE INDEX IF NOT EXISTS idx_skill_tree_nodes_stance
  ON skill_tree_nodes(specialization, stance_tag)
  WHERE stance_tag IS NOT NULL;

-- Example: Surface nodes don't need stance (NULL)
-- Example: Kicker nodes can be tagged with 'TS' or 'HS'
-- Example: Slider nodes might not need stance either (NULL)
