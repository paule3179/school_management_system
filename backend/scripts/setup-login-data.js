const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function setupLoginData() {
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const parentPassword = await bcrypt.hash('parent123', 10);

  // Update teachers: set teacher_id = teacher_code, and set password
  const teachersResult = await pool.query(`
    UPDATE teachers 
    SET teacher_id = teacher_code, 
        password = $1,
        is_active = true
    WHERE password IS NULL OR teacher_id IS NULL
    RETURNING id, teacher_code, teacher_id, first_name
  `, [teacherPassword]);
  console.log('Updated teachers:', teachersResult.rows.length);
  teachersResult.rows.forEach(t => console.log(`  ${t.teacher_code} -> teacher_id=${t.teacher_id}`));

  // Update parents: set password
  const parentsResult = await pool.query(`
    UPDATE parents 
    SET password = $1,
        is_active = true
    WHERE password IS NULL
    RETURNING id, first_name, last_name
  `, [parentPassword]);
  console.log('Updated parents:', parentsResult.rows.length);
  parentsResult.rows.forEach(p => console.log(`  ${p.first_name} ${p.last_name} (id=${p.id})`));

  // Show demo credentials
  console.log('\n=== DEMO CREDENTIALS ===');
  console.log('Admin:    admin@school.edu / Admin123');
  console.log('Teacher:  TCH001 / teacher123');
  console.log('Parent:   1 / parent123  (use numeric ID)');

  await pool.end();
}

setupLoginData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

