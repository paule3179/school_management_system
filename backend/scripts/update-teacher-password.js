require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const bcrypt = require('bcrypt');
const pool = require('../config/database');

async function updateTeacherPassword() {
  const email = process.env.TEACHER_EMAIL?.trim().toLowerCase();
  const password = process.env.TEACHER_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error('Set TEACHER_EMAIL and TEACHER_PASSWORD (at least 8 characters) in backend/.env.');
  }
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(`
    UPDATE users u SET password = $1, status = 'active', updated_at = CURRENT_TIMESTAMP
    FROM teachers t
    WHERE t.user_id = u.id AND LOWER(u.email) = $2 AND u.role = 'teacher'
    RETURNING u.id, u.email
  `, [hash, email]);
  if (!result.rows[0]) throw new Error('No linked teacher account found for that email.');
  console.log(`Updated development password for ${result.rows[0].email}.`);
}

updateTeacherPassword()
  .catch((error) => {
    console.error('Could not update teacher password:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
