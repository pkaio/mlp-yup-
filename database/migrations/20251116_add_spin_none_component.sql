-- Adds a zero-rotation option to the spins division so moderators can select
-- "None" (0 XP) when a maneuver does not include any rotation.

INSERT INTO maneuver_components (
    component_id,
    division,
    display_name,
    description,
    xp_value,
    metadata,
    is_active
)
SELECT 'none', 'spins', 'Sem rotação', 'Sem rotação / linha reta', 0,
       jsonb_build_object('spin_deg', 0, 'spin_dir', null),
       true
WHERE NOT EXISTS (
    SELECT 1
    FROM maneuver_components
    WHERE division = 'spins'
      AND component_id = 'none'
);
