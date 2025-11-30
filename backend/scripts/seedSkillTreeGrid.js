/**
 * Seed Skill Tree Grid - Surface Specialization
 *
 * Creates a 3-column grid layout:
 * - SPIN (left): Rotation tricks
 * - MERGE (center): Combined tricks
 * - OLLIE (right): Base tricks (shared across rows)
 *
 * Educational naming: "Frontside 'FS' 180" teaches people the terminology
 */

const pool = require('../config/database');

async function seedSurfaceSkillTreeGrid() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting Surface Skill Tree Grid seed...\n');
    await client.query('BEGIN');

    // Check if grid nodes already exist
    const checkResult = await client.query(
      "SELECT COUNT(*) FROM skill_tree_nodes WHERE branch_type IS NOT NULL"
    );
    const existingGridNodes = parseInt(checkResult.rows[0].count);

    if (existingGridNodes > 0) {
      console.log(`⚠️  Found ${existingGridNodes} existing grid nodes.`);
      console.log('Skipping seed to avoid duplicates.\n');
      await client.query('ROLLBACK');
      return;
    }

    // ============================================
    // ROW 1: FRONTSIDE 180 (Tier 1 - Basic)
    // ============================================

    // OLLIE (Right column - will be shared with Row 3)
    const ollieBasicResult = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node
      ) VALUES (
        'surface', 1, 3, 'ollie', 1,
        'Ollie',
        'Master the basic ollie - the foundation for all tricks. Pop off the water and land smoothly.',
        NULL,
        $1, $2, $3,
        true, true
      ) RETURNING id
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Load weight on the tail of the board',
          'Pop explosively off the back foot',
          'Level out in the air with front foot',
          'Spot your landing early'
        ],
        commonMistakes: [
          'Not loading enough weight on the tail',
          'Popping too late or too early',
          'Landing with stiff legs'
        ]
      }),
      JSON.stringify({
        prerequisites: [],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 100,
        badge: null
      })
    ]);
    const ollieBasicId = ollieBasicResult.rows[0].id;
    console.log(`✅ [Row 1 | OLLIE] Ollie (shared node)`);

    // SPIN - Frontside "FS" 180 (Left column)
    const spinFS180Result = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node
      ) VALUES (
        'surface', 1, 1, 'spin', 1,
        'Frontside "FS" 180',
        'Perform a 180-degree frontside rotation on the water surface. Your first spin trick!',
        NULL,
        $1, $2, $3,
        true, false
      ) RETURNING id
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Start with good edge control',
          'Use your shoulders to initiate the spin',
          'Keep your weight centered throughout',
          'Look where you want to go'
        ],
        commonMistakes: [
          'Leaning too far forward or back',
          'Not committing to the full rotation',
          'Losing balance mid-spin'
        ]
      }),
      JSON.stringify({
        prerequisites: [],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 120,
        badge: null
      })
    ]);
    const spinFS180Id = spinFS180Result.rows[0].id;
    console.log(`✅ [Row 1 | SPIN] Frontside "FS" 180`);

    // MERGE - Ollie Frontside "FS" 180 (Center column)
    await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node,
        merge_left_node_id, merge_right_node_id
      ) VALUES (
        'surface', 1, 2, 'merge', 1,
        'Ollie Frontside "FS" 180',
        'Combine an ollie with a frontside 180 rotation. Pop up and spin!',
        NULL,
        $1, $2, $3,
        true, false, $4, $5
      )
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Master both Ollie and FS 180 first',
          'Pop the ollie, then initiate rotation',
          'Keep the rotation smooth and controlled',
          'Spot your landing at 90 degrees'
        ],
        commonMistakes: [
          'Rotating before popping',
          'Over-rotating or under-rotating',
          'Not maintaining height during spin'
        ]
      }),
      JSON.stringify({
        prerequisites: [spinFS180Id, ollieBasicId],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 250,
        badge: null
      }),
      spinFS180Id,  // merge_left_node_id
      ollieBasicId  // merge_right_node_id
    ]);
    console.log(`✅ [Row 1 | MERGE] Ollie Frontside "FS" 180\n`);

    // ============================================
    // ROW 2: SWITCH FRONTSIDE 180 (Tier 2)
    // ============================================

    // OLLIE SWITCH (Right column - will be shared with Row 4)
    const ollieSwitchResult = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node
      ) VALUES (
        'surface', 2, 3, 'ollie', 2,
        'Ollie Switch',
        'Execute an ollie while riding switch (opposite stance). Advanced pop control required.',
        NULL,
        $1, $2, $3,
        true, true
      ) RETURNING id
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Get comfortable riding switch first',
          'Load the tail just like regular ollie',
          'Build confidence with small pops first',
          'Practice landing switch smoothly'
        ],
        commonMistakes: [
          'Not being comfortable in switch stance',
          'Weak pop due to unfamiliar foot position',
          'Landing off-balance'
        ]
      }),
      JSON.stringify({
        prerequisites: [ollieBasicId],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 150,
        badge: null
      })
    ]);
    const ollieSwitchId = ollieSwitchResult.rows[0].id;
    console.log(`✅ [Row 2 | OLLIE] Ollie Switch (shared node)`);

    // SPIN - Switch "SW" Frontside "FS" 180 (Left column)
    const spinSWFS180Result = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node
      ) VALUES (
        'surface', 2, 1, 'spin', 2,
        'Switch "SW" Frontside "FS" 180',
        'Frontside 180 while riding switch. Combines switch riding with frontside rotation.',
        NULL,
        $1, $2, $3,
        true, false
      ) RETURNING id
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Master regular FS 180 first',
          'Get comfortable riding switch',
          'Initiate rotation with shoulders',
          'Land in regular stance'
        ],
        commonMistakes: [
          'Rushing the rotation',
          'Not being stable in switch stance',
          'Over-rotating due to unfamiliar mechanics'
        ]
      }),
      JSON.stringify({
        prerequisites: [spinFS180Id],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 180,
        badge: null
      })
    ]);
    const spinSWFS180Id = spinSWFS180Result.rows[0].id;
    console.log(`✅ [Row 2 | SPIN] Switch "SW" Frontside "FS" 180`);

    // MERGE - Ollie Switch "SW" Frontside "FS" 180 (Center column)
    await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node,
        merge_left_node_id, merge_right_node_id
      ) VALUES (
        'surface', 2, 2, 'merge', 2,
        'Ollie Switch "SW" Frontside "FS" 180',
        'The ultimate combo: ollie while switch, then rotate frontside 180. Advanced trick!',
        NULL,
        $1, $2, $3,
        true, false, $4, $5
      )
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Master both switch ollie and switch FS 180',
          'Pop explosively while switch',
          'Rotate smoothly through the air',
          'Land in regular stance with confidence'
        ],
        commonMistakes: [
          'Not committing to the full movement',
          'Weak pop from switch stance',
          'Landing off-balance'
        ]
      }),
      JSON.stringify({
        prerequisites: [spinSWFS180Id, ollieSwitchId],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 350,
        badge: 'Switch Master'
      }),
      spinSWFS180Id,   // merge_left_node_id
      ollieSwitchId    // merge_right_node_id
    ]);
    console.log(`✅ [Row 2 | MERGE] Ollie Switch "SW" Frontside "FS" 180\n`);

    // ============================================
    // ROW 3: BACKSIDE 180 (Tier 1 - Basic)
    // ============================================

    // Note: OLLIE is reused from Row 1 (ollieBasicId)

    // SPIN - Backside "BS" 180 (Left column)
    const spinBS180Result = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node
      ) VALUES (
        'surface', 1, 1, 'spin', 3,
        'Backside "BS" 180',
        'Perform a 180-degree backside rotation on the water surface. Opposite direction from frontside.',
        NULL,
        $1, $2, $3,
        true, false
      ) RETURNING id
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Rotate in the opposite direction from frontside',
          'Use your shoulders to lead the spin',
          'Keep your head turned toward landing',
          'Maintain edge control throughout'
        ],
        commonMistakes: [
          'Not looking where you\'re going',
          'Rotating too fast or too slow',
          'Losing balance on landing'
        ]
      }),
      JSON.stringify({
        prerequisites: [],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 120,
        badge: null
      })
    ]);
    const spinBS180Id = spinBS180Result.rows[0].id;
    console.log(`✅ [Row 3 | SPIN] Backside "BS" 180`);

    // MERGE - Ollie Backside "BS" 180 (Center column)
    await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node,
        merge_left_node_id, merge_right_node_id
      ) VALUES (
        'surface', 1, 2, 'merge', 3,
        'Ollie Backside "BS" 180',
        'Combine an ollie with a backside 180 rotation. Pop up and spin backside!',
        NULL,
        $1, $2, $3,
        true, false, $4, $5
      )
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Master both Ollie and BS 180 first',
          'Pop the ollie, then initiate backside rotation',
          'Look over your shoulder during rotation',
          'Commit to the full 180'
        ],
        commonMistakes: [
          'Not looking at the landing',
          'Under-rotating the backside spin',
          'Weak pop due to focusing on rotation'
        ]
      }),
      JSON.stringify({
        prerequisites: [spinBS180Id, ollieBasicId],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 250,
        badge: null
      }),
      spinBS180Id,   // merge_left_node_id
      ollieBasicId   // merge_right_node_id (reused from Row 1)
    ]);
    console.log(`✅ [Row 3 | MERGE] Ollie Backside "BS" 180`);
    console.log(`   (Reuses Ollie from Row 1)\n`);

    // ============================================
    // ROW 4: SWITCH BACKSIDE 180 (Tier 2)
    // ============================================

    // Note: OLLIE SWITCH is reused from Row 2 (ollieSwitchId)

    // SPIN - Switch "SW" Backside "BS" 180 (Left column)
    const spinSWBS180Result = await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node
      ) VALUES (
        'surface', 2, 1, 'spin', 4,
        'Switch "SW" Backside "BS" 180',
        'Backside 180 while riding switch. Advanced switch rotation trick.',
        NULL,
        $1, $2, $3,
        true, false
      ) RETURNING id
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Master regular BS 180 first',
          'Be solid in switch stance',
          'Initiate rotation with shoulders and hips',
          'Look over shoulder throughout rotation'
        ],
        commonMistakes: [
          'Not being comfortable riding switch',
          'Hesitating on the rotation',
          'Landing off-balance'
        ]
      }),
      JSON.stringify({
        prerequisites: [spinBS180Id],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 180,
        badge: null
      })
    ]);
    const spinSWBS180Id = spinSWBS180Result.rows[0].id;
    console.log(`✅ [Row 4 | SPIN] Switch "SW" Backside "BS" 180`);

    // MERGE - Ollie Switch "SW" Backside "BS" 180 (Center column)
    await client.query(`
      INSERT INTO skill_tree_nodes (
        specialization, tier, position, branch_type, display_row,
        title, description, trick_id,
        educational_data, requirements, rewards, repeatable, is_shared_node,
        merge_left_node_id, merge_right_node_id
      ) VALUES (
        'surface', 2, 2, 'merge', 4,
        'Ollie Switch "SW" Backside "BS" 180',
        'Elite combo: ollie while switch, then rotate backside 180. Master-level trick!',
        NULL,
        $1, $2, $3,
        true, false, $4, $5
      )
    `, [
      JSON.stringify({
        tutorialVideoUrl: null,
        tips: [
          'Master both switch ollie and switch BS 180',
          'Pop hard from switch stance',
          'Rotate backside with commitment',
          'Land in regular stance smoothly'
        ],
        commonMistakes: [
          'Weak pop from switch',
          'Not committing to full rotation',
          'Landing unbalanced'
        ]
      }),
      JSON.stringify({
        prerequisites: [spinSWBS180Id, ollieSwitchId],
        requiredForUnlock: true
      }),
      JSON.stringify({
        xpBonus: 350,
        badge: 'Backside Legend'
      }),
      spinSWBS180Id,   // merge_left_node_id
      ollieSwitchId    // merge_right_node_id (reused from Row 2)
    ]);
    console.log(`✅ [Row 4 | MERGE] Ollie Switch "SW" Backside "BS" 180`);
    console.log(`   (Reuses Ollie Switch from Row 2)\n`);

    await client.query('COMMIT');

    console.log('🎉 Surface Skill Tree Grid seeded successfully!\n');
    console.log('📊 Summary:');
    console.log('   - 4 Rows total');
    console.log('   - 10 Total nodes (6 SPIN + 4 MERGE + 2 OLLIE shared)');
    console.log('   - 2 Shared OLLIE nodes (Ollie, Ollie Switch)');
    console.log('   - Educational naming: Frontside "FS", Backside "BS", Switch "SW"\n');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding Surface skill tree grid:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed
seedSurfaceSkillTreeGrid()
  .then(() => {
    console.log('✨ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  });
