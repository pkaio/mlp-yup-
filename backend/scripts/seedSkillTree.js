/**
 * Seed Skill Tree Nodes
 *
 * Populates the skill_tree_nodes table with quest nodes for all three specializations
 */

const pool = require('../config/database');

// Sample skill tree nodes for each specialization
const skillTreeNodes = [
  // ==========================================
  // SLIDER SPECIALIST - Rails and Obstacles
  // ==========================================
  {
    specialization: 'slider',
    tier: 1,
    position: 1,
    title: 'First Boardslide',
    description: 'Learn the basic boardslide on a low rail. Keep your weight centered.',
    trick_id: null, // Will need to map to actual tricks
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Approach the rail at a 45-degree angle',
        'Pop up and rotate 90 degrees',
        'Keep your knees bent and weight centered'
      ],
      commonMistakes: [
        'Leaning too far back or forward',
        'Not committing to the rotation'
      ]
    },
    requirements: {
      prerequisites: [],
      requiredForUnlock: true
    },
    rewards: {
      xpBonus: 100,
      badge: null
    },
    repeatable: true
  },
  {
    specialization: 'slider',
    tier: 1,
    position: 2,
    title: 'First Lipslide',
    description: 'Master the lipslide - the opposite of a boardslide.',
    trick_id: null,
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Approach from the opposite side compared to boardslide',
        'Rotate in the opposite direction',
        'Keep your eyes on the end of the rail'
      ],
      commonMistakes: [
        'Under-rotating the initial pop',
        'Not looking where you want to go'
      ]
    },
    requirements: {
      prerequisites: [],
      requiredForUnlock: false
    },
    rewards: {
      xpBonus: 100,
      badge: null
    },
    repeatable: true
  },

  // Tier 2 - Slider
  {
    specialization: 'slider',
    tier: 2,
    position: 1,
    title: 'Advanced Boardslide',
    description: 'Take your boardslide to a taller rail or add style.',
    trick_id: null,
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Maintain balance throughout the entire rail',
        'Add grabs or tweaks for style points',
        'Practice smooth exits'
      ],
      commonMistakes: [
        'Rushing the trick',
        'Not maintaining speed'
      ]
    },
    requirements: {
      prerequisites: ['First Boardslide'],
      requiredForUnlock: true
    },
    rewards: {
      xpBonus: 200,
      badge: null
    },
    repeatable: true
  },

  // ==========================================
  // KICKER SPECIALIST - Ramps and Airs
  // ==========================================
  {
    specialization: 'kicker',
    tier: 1,
    position: 1,
    title: 'First Straight Air',
    description: 'Launch off the kicker and land smoothly without rotation.',
    trick_id: null,
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Build up good speed approaching the kicker',
        'Stay balanced in the air',
        'Spot your landing early'
      ],
      commonMistakes: [
        'Not enough speed',
        'Leaning back in the air'
      ]
    },
    requirements: {
      prerequisites: [],
      requiredForUnlock: true
    },
    rewards: {
      xpBonus: 100,
      badge: null
    },
    repeatable: true
  },
  {
    specialization: 'kicker',
    tier: 1,
    position: 2,
    title: 'First Grab',
    description: 'Add your first grab to a straight air for style.',
    trick_id: null,
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Tuck your knees up to reach the board',
        'Hold the grab for at least 1 second',
        'Common grabs: Indy, Method, Mute'
      ],
      commonMistakes: [
        'Reaching too early',
        'Not tucking knees enough'
      ]
    },
    requirements: {
      prerequisites: [],
      requiredForUnlock: false
    },
    rewards: {
      xpBonus: 150,
      badge: null
    },
    repeatable: true
  },

  // Tier 2 - Kicker
  {
    specialization: 'kicker',
    tier: 2,
    position: 1,
    title: 'First 180',
    description: 'Rotate 180 degrees in the air and land switch.',
    trick_id: null,
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Wind up your shoulders before takeoff',
        'Spot your landing halfway through',
        'Land with knees bent to absorb impact'
      ],
      commonMistakes: [
        'Over-rotating or under-rotating',
        'Not looking at the landing'
      ]
    },
    requirements: {
      prerequisites: ['First Straight Air'],
      requiredForUnlock: true
    },
    rewards: {
      xpBonus: 250,
      badge: null
    },
    repeatable: true
  },

  // ==========================================
  // SURFACE SPECIALIST - Surface Tricks
  // ==========================================
  {
    specialization: 'surface',
    tier: 1,
    position: 1,
    title: 'First Surface 180',
    description: 'Perform a 180-degree rotation on the water surface.',
    trick_id: null,
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Start with good edge control',
        'Use your shoulders to initiate the spin',
        'Keep your weight centered'
      ],
      commonMistakes: [
        'Leaning too far forward or back',
        'Not committing to the rotation'
      ]
    },
    requirements: {
      prerequisites: [],
      requiredForUnlock: true
    },
    rewards: {
      xpBonus: 100,
      badge: null
    },
    repeatable: true
  },
  {
    specialization: 'surface',
    tier: 1,
    position: 2,
    title: 'First Ollie',
    description: 'Pop an ollie off the water to practice your timing.',
    trick_id: null,
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Load the tail of the board',
        'Pop off the back foot',
        'Level out in the air'
      ],
      commonMistakes: [
        'Not loading enough weight on the tail',
        'Popping too late or too early'
      ]
    },
    requirements: {
      prerequisites: [],
      requiredForUnlock: false
    },
    rewards: {
      xpBonus: 120,
      badge: null
    },
    repeatable: true
  },

  // Tier 2 - Surface
  {
    specialization: 'surface',
    tier: 2,
    position: 1,
    title: 'Surface 360',
    description: 'Complete a full 360-degree rotation on the surface.',
    trick_id: null,
    educational_data: {
      tutorialVideoUrl: null,
      tips: [
        'Build on your 180 technique',
        'Maintain speed throughout the rotation',
        'Keep your eyes on where you want to go'
      ],
      commonMistakes: [
        'Losing speed mid-rotation',
        'Not spotting your exit'
      ]
    },
    requirements: {
      prerequisites: ['First Surface 180'],
      requiredForUnlock: true
    },
    rewards: {
      xpBonus: 200,
      badge: 'Surface Spinner'
    },
    repeatable: true
  }
];

async function seedSkillTree() {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting skill tree seed...\n');

    await client.query('BEGIN');

    // Check if nodes already exist
    const checkResult = await client.query('SELECT COUNT(*) FROM skill_tree_nodes');
    const existingCount = parseInt(checkResult.rows[0].count);

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing nodes in skill_tree_nodes table.`);
      console.log('Skipping seed to avoid duplicates.\n');
      console.log('If you want to re-seed, first run:');
      console.log('DELETE FROM skill_tree_nodes;\n');
      await client.query('ROLLBACK');
      return;
    }

    // Insert nodes
    let insertedCount = 0;
    for (const node of skillTreeNodes) {
      const result = await client.query(`
        INSERT INTO skill_tree_nodes (
          specialization,
          tier,
          position,
          title,
          description,
          trick_id,
          educational_data,
          requirements,
          rewards,
          repeatable
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, title
      `, [
        node.specialization,
        node.tier,
        node.position,
        node.title,
        node.description,
        node.trick_id,
        JSON.stringify(node.educational_data),
        JSON.stringify(node.requirements),
        JSON.stringify(node.rewards),
        node.repeatable
      ]);

      insertedCount++;
      console.log(`✅ [${node.specialization}] Tier ${node.tier}: ${result.rows[0].title}`);
    }

    await client.query('COMMIT');

    console.log(`\n🎉 Successfully seeded ${insertedCount} skill tree nodes!\n`);
    console.log('Breakdown by specialization:');
    console.log(`  🛹 Slider:  ${skillTreeNodes.filter(n => n.specialization === 'slider').length} nodes`);
    console.log(`  🚀 Kicker:  ${skillTreeNodes.filter(n => n.specialization === 'kicker').length} nodes`);
    console.log(`  🌊 Surface: ${skillTreeNodes.filter(n => n.specialization === 'surface').length} nodes\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding skill tree:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed
seedSkillTree()
  .then(() => {
    console.log('✨ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  });
