const pool = require('../config/database');

async function checkTables() {
  const tables = ['users', 'teachers', 'parents', 'students', 'classes'];
  for (const table of tables) {
    console.log(`\n=== ${table} ===`);
    try {
      const result = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      result.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})${r.is_nullable === 'NO' ? ' NOT NULL' : ''}`));
      if (result.rows.length === 0) console.log(`  TABLE DOES NOT EXIST`);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
    }
  }
  await pool.end();
}

checkTables();

