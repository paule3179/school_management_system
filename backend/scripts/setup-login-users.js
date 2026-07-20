const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function setupLoginUsers() {
  const teacherEmail = 'paule3179@gmail.com';
  const parentEmail = 'james@example.com';
  
  // Check if users already exist (email is globally UNIQUE)
  const teacherUser = await pool.query('SELECT id, role FROM users WHERE email = $1', [teacherEmail]);
  const parentUser = await pool.query('SELECT id, role FROM users WHERE email = $1', [parentEmail]);
  
  if (teacherUser.rows.length === 0) {
    const hashedPass = await bcrypt.hash('teacher123', 10);
    await pool.query(`
      INSERT INTO users (email, password, role, first_name, last_name, status) 
      VALUES ($1, $2, $3, 'Teacher', 'User', 'active')
    `, [teacherEmail, hashedPass, 'teacher']);
    console.log('✅ Created teacher user for', teacherEmail);
  } else {
    console.log('ℹ️  Teacher user already exists for', teacherEmail, '(role:', teacherUser.rows[0].role + ')');
  }
  
  if (parentUser.rows.length === 0) {
    const hashedPass = await bcrypt.hash('parent123', 10);
    await pool.query(`
      INSERT INTO users (email, password, role, first_name, last_name, status) 
      VALUES ($1, $2, $3, 'James', 'Mensah', 'active')
    `, [parentEmail, hashedPass, 'parent']);
    console.log('✅ Created parent user for', parentEmail);
  } else {
    console.log('ℹ️  Parent user already exists for', parentEmail, '(role:', parentUser.rows[0].role + ')');
  }
  
  // Link to existing records if needed
  const parentDb = await pool.query('SELECT id FROM parents WHERE email = $1', [parentEmail]);
  if (parentDb.rows.length > 0 && parentUser.rows.length > 0) {
    await pool.query('UPDATE parents SET user_id = $1 WHERE id = $2', [parentUser.rows[0].id, parentDb.rows[0].id]);
  }
  
  console.log('\n=== LOGIN READY ===');
  console.log('Teacher:', teacherEmail, '/ teacher123 (temporary password)');
  console.log('Parent:', parentEmail, '/ parent123 (temporary password)');

  
  await pool.end();
}

setupLoginUsers().catch(console.error);

