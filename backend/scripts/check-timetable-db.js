const pool = require('../config/database');

async function checkTimetableData() {
  try {
    console.log('=== TIMETABLE DATABASE CHECK ===');
    
    // Check tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%timetable%' OR table_name LIKE '%subject%' OR table_name LIKE '%class%')
      ORDER BY table_name
    `);
    console.log('📋 Relevant tables:', tables.rows.map(t => t.table_name));
    
    // Count timetables
    const timetableCount = await pool.query('SELECT COUNT(*) as count FROM timetables');
    console.log('📊 timetables table count:', timetableCount.rows[0].count);
    
    // Sample timetables
    const samples = await pool.query('SELECT * FROM timetables LIMIT 3');
    console.log('📄 Sample timetables:', JSON.stringify(samples.rows, null, 2));
    
    // Count class_subjects
    const subjectsCount = await pool.query('SELECT COUNT(*) as count FROM class_subjects');
    console.log('📚 class_subjects count:', subjectsCount.rows[0].count);
    
    // Sample class_subjects
    const subjectSamples = await pool.query('SELECT * FROM class_subjects LIMIT 3');
    console.log('📖 Sample class_subjects:', JSON.stringify(subjectSamples.rows, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    pool.end();
  }
}

checkTimetableData();
