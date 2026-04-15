const { Pool } = require('pg');
const pool = require('./backend/config/database');
if (!process.env.DATABASE_URL) {
  console.log('No DATABASE_URL - using default connection');
}

const classesToAdd = [
  // KG
  {name: 'KG1A', level: 'KG', capacity: 25},
  {name: 'KG1B', level: 'KG', capacity: 25},
  {name: 'KG2A', level: 'KG', capacity: 25},
  {name: 'KG2B', level: 'KG', capacity: 25},
  
  // Primary
  ...['P1A', 'P1B', 'P2A', 'P2B', 'P3A', 'P3B', 'P4A', 'P4B', 'P5A', 'P5B', 'P6A', 'P6B'].map(name => ({
    name, level: 'Primary', capacity: 35
  })),
  
  // JHS
  ...['JHS1A', 'JHS1B', 'JHS2A', 'JHS2B', 'JHS3A', 'JHS3B'].map(name => ({
    name, level: 'JHS', capacity: 40
  }))
];

async function addClasses() {
  console.log(`Adding ${classesToAdd.length} classes...`);
  
  for (const cls of classesToAdd) {
    try {
      const result = await pool.query(
        `INSERT INTO classes (name, level, capacity, academic_year) 
         VALUES ($1, $2, $3, $4) 
         ON CONFLICT (name) DO NOTHING 
         RETURNING id`,
        [cls.name, cls.level, cls.capacity, '2024-2025']
      );
      if (result.rows.length > 0) {
        console.log(`Added ${cls.name} (${cls.level})`);
      } else {
        console.log(`${cls.name} already exists`);
      }
    } catch (error) {
      console.error(`Error adding ${cls.name}:`, error.message);
    }
  }
  
  // Verify total
  const countResult = await pool.query('SELECT COUNT(*) as total FROM classes');
  console.log(`\n Total classes in DB: ${countResult.rows[0].total}`);
  console.log('Test API: http://localhost:5000/api/classes');
  process.exit(0);
}

addClasses().catch(console.error);
