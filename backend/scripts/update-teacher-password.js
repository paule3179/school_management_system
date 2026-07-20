const bcrypt = require('bcryptjs');
const pool = require('../config/database');

async function setupTeacherPassword() {
  // Hash the password
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  
  // Update TCH001 with the password and set is_active = true
  const result = await pool.query(
    'UPDATE teachers SET password = $1, is_active = true WHERE teacher_id = $2 RETURNING id, teacher_id, first_name',
    [teacherPassword, 'TCH001']
  );
  
  console.log('Updated teachers:', result.rows.length);
  result.rows.forEach(t => console.log(`  ${t.first_name} (${t.teacher_id})`));
  
  // Also update any other teachers that need passwords
  const allTeachers = await pool.query(
    'SELECT teacher_id, first_name FROM teachers WHERE password IS NULL OR is_active IS NULL OR is_active = false'
  );
  
  console.log('\nTeachers needing password:', allTeachers.rows.length);
  for (const teacher of allTeachers.rows) {
    const hash = await bcrypt.hash('teacher123', 10);
    await pool.query(
      'UPDATE teachers SET password = $1, is_active = true WHERE teacher_id = $2',
      [hash, teacher.teacher_id]
    );
    console.log(`  Updated: ${teacher.first_name} (${teacher.teacher_id})`);
  }
  
  console.log('\n=== DEMO CREDENTIALS ===');
  console.log('Admin:    admin@school.edu / Admin123');
  console.log('Teacher: TCH001 / teacher123');
  
  await pool.end();
}

setupTeacherPassword().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
