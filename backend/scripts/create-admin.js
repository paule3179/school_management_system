const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@school.edu';
  const plainPassword = process.env.ADMIN_PASSWORD;
  if (!plainPassword) throw new Error('Set ADMIN_PASSWORD before creating the admin account.');
  const hashedPassword = await bcrypt.hash(plainPassword, 10);
  
  await pool.query(`
    INSERT INTO users (email, password, first_name, last_name, role, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO NOTHING
  `, [email, hashedPassword, 'System', 'Administrator', 'admin', 'active']);
  
  console.log(`Admin account exists or was created for ${email}.`);
  await pool.end();
}

createAdmin().catch(async (error) => {
  console.error('Could not create admin account:', error.message);
  await pool.end();
  process.exitCode = 1;
});
