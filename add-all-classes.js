const pool = require('./backend/config/database');
if (process.env.NODE_ENV === 'production') {
  throw new Error('add-all-classes.js is a development data helper and cannot run in production.');
}
if (!process.env.DATABASE_URL) {
  console.log('No DATABASE_URL - using default connection');
}
const currentYear = new Date().getFullYear();
const academicYear = process.env.ACADEMIC_YEAR || `${currentYear}-${currentYear + 1}`;

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
    const result = await pool.query(
      `INSERT INTO classes (class_name, level, capacity, academic_year)
       SELECT $1, $2, $3, $4
       WHERE NOT EXISTS (
         SELECT 1 FROM classes WHERE class_name = $1 AND academic_year = $4
       )
       RETURNING id`,
      [cls.name, cls.level, cls.capacity, academicYear]
    );
    if (result.rows.length > 0) {
      console.log(`Added ${cls.name} (${cls.level})`);
    } else {
      console.log(`${cls.name} already exists`);
    }
  }
  
  // Verify total
  const countResult = await pool.query('SELECT COUNT(*) as total FROM classes');
  console.log(`\n Total classes in DB: ${countResult.rows[0].total}`);
  console.log('Test API: http://localhost:5000/api/classes');
}

addClasses()
  .catch((error) => {
    console.error('Failed to add classes:', error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
