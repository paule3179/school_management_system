const pool = require('../config/database');

async function updateParentIds() {
  const result = await pool.query(
    "UPDATE parents SET parent_id = id::text WHERE parent_id IS NULL"
  );
  console.log('Updated ' + result.rowCount + ' parents with parent_id = id');
  await pool.end();
}

updateParentIds().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

