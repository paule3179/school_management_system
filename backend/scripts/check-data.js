const pool = require('../config/database');

async function checkData() {
  console.log('=== users ===');
  const users = await pool.query('SELECT id, email, role, first_name, last_name FROM users');
  console.log(users.rows);

  console.log('\n=== teachers ===');
  const teachers = await pool.query('SELECT id, user_id, teacher_code, teacher_id, first_name, last_name, email, password, is_active, assigned_class_id FROM teachers');
  console.log(teachers.rows);

  console.log('\n=== parents ===');
  const parents = await pool.query('SELECT id, first_name, last_name, email, is_active FROM parents');
  console.log(parents.rows);

  await pool.end();
}

checkData();

