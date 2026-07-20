
const pool = require('../config/database');

(async () => {
  console.log('=== Parent ID Fix Script ===');
  
  // 1. Backup current state
  const backup = await pool.query('SELECT id, first_name, last_name, parent_id FROM parents ORDER BY id');
  console.log('Current parents:', JSON.stringify(backup.rows, null, 2));
  
  // 2. Find next available sequential ID
  const usedIds = await pool.query(`
    SELECT parent_id FROM parents WHERE parent_id ~ '^PARENT[0-9]+$'
  `);
  const numbers = usedIds.rows
    .map(row => parseInt(row.parent_id.replace('PARENT', '')))
    .filter(n => !isNaN(n));
  const maxId = numbers.length ? Math.max(...numbers) : 0;
  let nextId = maxId + 1;
  
  // 3. Fix parents missing/dupe parent_id
  const toFix = await pool.query(`
    SELECT id, parent_id FROM parents 
    WHERE parent_id IS NULL OR parent_id = '' OR parent_id NOT ~ '^PARENT[0-9]+$'
    ORDER BY id
  `);
  
  console.log(`Found ${toFix.rows.length} parents to fix. Next ID: PARENT${nextId}`);
  
  for (const parent of toFix.rows) {
    const newId = `PARENT${nextId++}`;
    await pool.query(
      'UPDATE parents SET parent_id = $1 WHERE id = $2',
      [newId, parent.id]
    );
    console.log(`Fixed parent ${parent.id}: ${parent.parent_id} → ${newId}`);
  }
  
  // 4. Verify
  const verify = await pool.query('SELECT id, parent_id FROM parents ORDER BY id');
  console.log('Fixed parents:', JSON.stringify(verify.rows, null, 2));
  
  await pool.end();
  console.log('✅ Fix complete! No duplicates remain.');
})();

