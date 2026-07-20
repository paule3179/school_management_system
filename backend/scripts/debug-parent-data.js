const pool = require('../config/database');

(async () => {
  try {
    console.log('=== PARENTS TABLE COLUMNS ===');
    const columns = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'parents'`
    );
    console.log(columns.rows.map(c => `${c.column_name} (${c.data_type})`).join('\n'));

    console.log('\n=== PARENTS TABLE (latest 5) ===');
    const parents = await pool.query('SELECT * FROM parents ORDER BY id DESC LIMIT 5');
    console.log(JSON.stringify(parents.rows, null, 2));

    console.log('\n=== STUDENTS WITH parent_id or parent_email (latest 10) ===');
    const students = await pool.query(
      `SELECT id, first_name, last_name, admission_number, parent_id, parent_email, class_id 
       FROM students 
       WHERE parent_id IS NOT NULL OR parent_email IS NOT NULL 
       ORDER BY id DESC LIMIT 10`
    );
    console.log(JSON.stringify(students.rows, null, 2));

    console.log('\n=== STUDENTS with NO parent_id OR parent_email (latest 5) ===');
    const orphans = await pool.query(
      `SELECT id, first_name, last_name, admission_number, parent_id, parent_email 
       FROM students 
       WHERE parent_id IS NULL AND (parent_email IS NULL OR parent_email = '')
       ORDER BY id DESC LIMIT 5`
    );
    console.log(JSON.stringify(orphans.rows, null, 2));

    console.log('\n=== PARENT_STUDENTS TABLE (if exists) ===');
    try {
      const ps = await pool.query('SELECT * FROM parent_students LIMIT 10');
      console.log(JSON.stringify(ps.rows, null, 2));
    } catch(e) {
      console.log('parent_students table does not exist:', e.message);
    }

    // Check if a parent has a user_id column
    console.log('\n=== PARENTS with user_id ===');
    try {
      const pu = await pool.query(
        `SELECT id, parent_id, first_name, last_name, email, user_id FROM parents WHERE user_id IS NOT NULL ORDER BY id DESC LIMIT 10`
      );
      console.log(JSON.stringify(pu.rows, null, 2));
    } catch(e) {
      console.log('user_id column may not exist:', e.message);
    }

    await pool.end();
  } catch (e) {
    console.error('Error:', e);
  }
})();

