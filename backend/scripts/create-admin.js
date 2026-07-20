const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  password: 'schoolmags',
  host: 'localhost',
  port: 5432,
  database: 'school_management_system'
});

async function createAdmin() {
  const hashedPassword = await bcrypt.hash('Admin123', 10);
  
  await pool.query(`
    INSERT INTO users (email, password, first_name, last_name, role, status)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (email) DO UPDATE SET password = $2
  `, ['admin@school.edu', hashedPassword, 'System', 'Administrator', 'admin', 'active']);
  
  console.log('Admin user ready! Email: admin@school.edu, Password: Admin123');
  await pool.end();
}

createAdmin();