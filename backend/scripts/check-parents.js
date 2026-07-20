const pool = require('../config/database');

(async () => {
  // Check parents table schema
  const schema = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'parents'"
  );
  console.log('Parents table columns:', schema.rows.map(c => c.column_name));
  
  // Check some sample data
  const data = await pool.query('SELECT * FROM parents LIMIT 5');
  console.log('\nSample parents:', JSON.stringify(data.rows, null, 2));
  
  await pool.end();
})().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
