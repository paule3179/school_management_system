const pool = require('../config/database');

(async () => {
  // Add parent_id column if it doesn't exist
  try {
    await pool.query(`
      ALTER TABLE parents ADD COLUMN IF NOT EXISTS parent_id VARCHAR(50)
    `);
    console.log('Added parent_id column');
  } catch (e) {
    // Column might already exist, that's ok
    console.log('parent_id column may already exist');
  }
  
  // Update existing parents with parent_id = id::text
  const result = await pool.query(
    "UPDATE parents SET parent_id = id::text WHERE parent_id IS NULL OR parent_id = ''"
  );
  console.log('Updated ' + result.rowCount + ' parents with parent_id = id');
  
  // Verify the update
  const verify = await pool.query('SELECT id, first_name, last_name, parent_id FROM parents LIMIT 5');
  console.log('\nSample parents:');
  verify.rows.forEach(p => {
    console.log('  ID:', p.id, 'Name:', p.first_name, p.last_name, 'parent_id:', p.parent_id);
  });
  
  await pool.end();
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
