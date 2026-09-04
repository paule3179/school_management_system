// backend/controllers/gradeController.js
const pool = require('../config/database');

const gradeController = {};

// Helper function to calculate grade based on marks
function calculateGrade(marks) {
  const score = parseFloat(marks);
  if (isNaN(score)) return 'F';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

// ============================================
// GET ROUTES
// ============================================

// Get all grades with filters
gradeController.getAllGrades = async (req, res) => {
  try {
    const { class_id, exam_type, student_id, subject } = req.query;
    const academicYear = req.query.academic_year || '2024-2025';
    
    // Check if grades table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'grades'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({ success: true, data: [], message: 'Grades table not yet created' });
    }
    
    let query = `
      SELECT 
        g.id,
        g.student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        g.class_id,
        COALESCE(c.name, c.class_name, 'Unknown') as class_name,
        g.subject,
        g.exam_type,
        g.marks,
        g.grade,
        g.remarks,
        g.created_at
      FROM grades g
      JOIN students s ON g.student_id = s.id
      LEFT JOIN classes c ON g.class_id = c.id
      WHERE g.academic_year = $1
    `;
    
    const params = [academicYear];
    let paramCount = 2;
    
    if (class_id) {
      query += ` AND g.class_id = $${paramCount++}`;
      params.push(class_id);
    }
    
    if (exam_type) {
      query += ` AND g.exam_type = $${paramCount++}`;
      params.push(exam_type);
    }
    
    if (student_id) {
      query += ` AND g.student_id = $${paramCount++}`;
      params.push(student_id);
    }
    
    if (subject) {
      query += ` AND g.subject ILIKE $${paramCount++}`;
      params.push(`%${subject}%`);
    }
    
    query += ` ORDER BY s.first_name, s.last_name, g.subject, g.exam_type`;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getAllGrades:', error);
    // Return empty array instead of error
    res.json({ success: true, data: [], message: 'Unable to fetch grades' });
  }
};

// Get class grades (for grade entry UI)
gradeController.getClassGrades = async (req, res) => {
  try {
    const { classId } = req.params;
    const { exam_type, academic_year } = req.query;
    const year = academic_year || '2024-2025';
    const examType = exam_type || 'CA1';
    
    // Check if class_students table exists, otherwise use student_classes
    let studentsResult;
    try {
      studentsResult = await pool.query(`
        SELECT 
          s.id,
          s.first_name,
          s.last_name,
          s.admission_number,
          s.gender
        FROM students s
        JOIN student_classes sc ON s.id = sc.student_id
        WHERE sc.class_id = $1 AND sc.academic_year = $2
        ORDER BY s.first_name, s.last_name
      `, [classId, year]);
    } catch (err) {
      // Fallback - just get all students
      studentsResult = await pool.query(`
        SELECT 
          id,
          first_name,
          last_name,
          admission_number,
          gender
        FROM students
        WHERE status = 'Active'
        ORDER BY first_name, last_name
      `);
    }
    
    if (studentsResult.rows.length === 0) {
      return res.json({ 
        success: true, 
        data: { students: [], subjects: [] }, 
        message: 'No students found in this class' 
      });
    }
    
    // Get existing grades
    const studentIds = studentsResult.rows.map(s => s.id);
    let gradesResult = { rows: [] };
    
    try {
      gradesResult = await pool.query(`
        SELECT 
          student_id,
          subject,
          marks,
          grade,
          exam_type,
          remarks
        FROM grades
        WHERE class_id = $1 
          AND academic_year = $2 
          AND exam_type = $3
          AND student_id = ANY($4::int[])
      `, [classId, year, examType, studentIds]);
    } catch (err) {
      console.log('Grades table might not exist yet');
    }
    
    // Organize grades by student and subject
    const gradesMap = {};
    gradesResult.rows.forEach(grade => {
      if (!gradesMap[grade.student_id]) {
        gradesMap[grade.student_id] = {};
      }
      gradesMap[grade.student_id][grade.subject] = {
        marks: grade.marks,
        grade: grade.grade,
        remarks: grade.remarks
      };
    });
    
    // Get subjects - try different sources
    let subjects = ['Mathematics', 'English', 'Science', 'Social Studies'];
    try {
      const subjectsResult = await pool.query(`
        SELECT DISTINCT subject FROM teacher_classes WHERE class_id = $1
      `, [classId]);
      if (subjectsResult.rows.length > 0) {
        subjects = subjectsResult.rows.map(s => s.subject);
      }
    } catch (err) {
      console.log('Using default subjects list');
    }
    
    // Build response
    const classData = {
      class_id: classId,
      exam_type: examType,
      academic_year: year,
      subjects: subjects,
      students: studentsResult.rows.map(student => ({
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        grades: gradesMap[student.id] || {}
      }))
    };
    
    res.json({ success: true, data: classData });
  } catch (error) {
    console.error('Error in getClassGrades:', error);
    res.json({ success: true, data: { students: [], subjects: [] }, message: error.message });
  }
};

// Get class performance summary
gradeController.getClassPerformance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { exam_type, academic_year } = req.query;
    const year = academic_year || '2024-2025';
    const examType = exam_type || 'CA1';
    
    const result = await pool.query(`
      SELECT 
        g.subject,
        COUNT(DISTINCT g.student_id) as total_students,
        ROUND(AVG(g.marks), 2) as average_score,
        MAX(g.marks) as highest_score,
        MIN(g.marks) as lowest_score,
        COUNT(CASE WHEN g.grade = 'A' THEN 1 END) as grade_a,
        COUNT(CASE WHEN g.grade = 'B' THEN 1 END) as grade_b,
        COUNT(CASE WHEN g.grade = 'C' THEN 1 END) as grade_c,
        COUNT(CASE WHEN g.grade = 'D' THEN 1 END) as grade_d,
        COUNT(CASE WHEN g.grade = 'F' THEN 1 END) as grade_f
      FROM grades g
      WHERE g.class_id = $1 
        AND g.academic_year = $2 
        AND g.exam_type = $3
      GROUP BY g.subject
      ORDER BY g.subject
    `, [classId, year, examType]);
    
    // Calculate overall performance
    const overallResult = await pool.query(`
      SELECT 
        ROUND(AVG(g.marks), 2) as overall_average,
        COUNT(DISTINCT g.student_id) as total_students,
        COUNT(DISTINCT g.subject) as total_subjects
      FROM grades g
      WHERE g.class_id = $1 
        AND g.academic_year = $2 
        AND g.exam_type = $3
    `, [classId, year, examType]);
    
    res.json({ 
      success: true, 
      data: {
        overall: overallResult.rows[0] || { overall_average: 0, total_students: 0, total_subjects: 0 },
        subjects: result.rows
      }
    });
  } catch (error) {
    console.error('Error in getClassPerformance:', error);
    res.json({ success: true, data: { overall: {}, subjects: [] } });
  }
};

// Get student report card
gradeController.getStudentReportCard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academic_year, term } = req.query;
    const year = academic_year || '2024-2025';
    const requestedTerm = term !== undefined && term !== null && term !== '' ? Number(term) : null;

    const studentResult = await pool.query(`
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.gender
      FROM students s
      WHERE s.id = $1
    `, [studentId]);

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    let reportRows = [];

    const marksQuery = `
      SELECT
        m.student_id,
        s.name AS subject,
        m.exam_type,
        m.marks,
        m.grade,
        m.remarks,
        m.created_at,
        m.term_id,
        m.academic_year
      FROM marks m
      LEFT JOIN subjects s ON s.id = m.subject_id
      WHERE m.student_id = $1
        AND ($2::text IS NULL OR m.academic_year = $2)
        AND ($3::int IS NULL OR m.term_id = $3)
      ORDER BY m.exam_type, s.name
    `;

    const marksResult = await pool.query(marksQuery, [studentId, year, requestedTerm]);
    reportRows = marksResult.rows;

    if (reportRows.length === 0) {
      const legacyGradesResult = await pool.query(`
        SELECT
          subject,
          exam_type,
          marks,
          grade,
          remarks,
          created_at
        FROM grades
        WHERE student_id = $1 AND academic_year = $2
        ORDER BY exam_type, subject
      `, [studentId, year]);

      reportRows = legacyGradesResult.rows.map(row => ({
        subject: row.subject,
        exam_type: row.exam_type,
        marks: row.marks,
        grade: row.grade,
        remarks: row.remarks,
        created_at: row.created_at,
        academic_year: year,
        term_id: requestedTerm
      }));
    }

    if (reportRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No report card available for this student in the selected term/year.'
      });
    }

    const exams = {};
    reportRows.forEach(row => {
      const examType = row.exam_type || 'Exam';
      if (!exams[examType]) {
        exams[examType] = [];
      }

      const gradeLetter = row.grade || calculateGrade(row.marks);
      exams[examType].push({
        subject: row.subject || 'Unknown Subject',
        marks: row.marks,
        grade: gradeLetter,
        remarks: row.remarks
      });
    });

    const allMarks = reportRows
      .map(row => parseFloat(row.marks))
      .filter(value => !Number.isNaN(value));

    const totalMarks = allMarks.reduce((sum, value) => sum + value, 0);
    const average = allMarks.length > 0 ? (totalMarks / allMarks.length).toFixed(2) : 0;

    return res.json({
      success: true,
      data: {
        student: studentResult.rows[0],
        exams,
        summary: {
          total_marks: totalMarks,
          average,
          subjects_count: allMarks.length
        }
      }
    });
  } catch (error) {
    console.error('Error in getStudentReportCard:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get student remarks
gradeController.getStudentRemarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academic_year, exam_type } = req.query;
    const year = academic_year || '2024-2025';
    
    // Check if grades_remarks table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'grades_remarks'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({ success: true, data: [] });
    }
    
    let query = `
      SELECT 
        r.id,
        r.student_id,
        r.remarks,
        r.exam_type,
        r.academic_year,
        r.created_at,
        s.first_name,
        s.last_name
      FROM grades_remarks r
      JOIN students s ON r.student_id = s.id
      WHERE r.student_id = $1 AND r.academic_year = $2
    `;
    
    const params = [studentId, year];
    
    if (exam_type) {
      query += ` AND r.exam_type = $3`;
      params.push(exam_type);
    }
    
    query += ` ORDER BY r.exam_type`;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getStudentRemarks:', error);
    res.json({ success: true, data: [] });
  }
};

// Get student grades
gradeController.getStudentGrades = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academic_year } = req.query;
    const year = academic_year || '2024-2025';
    
    const result = await pool.query(`
      SELECT 
        g.id,
        g.class_id,
        COALESCE(c.name, c.class_name, 'Unknown') as class_name,
        g.subject,
        g.exam_type,
        g.marks,
        g.grade,
        g.remarks,
        g.created_at
      FROM grades g
      LEFT JOIN classes c ON g.class_id = c.id
      WHERE g.student_id = $1 AND g.academic_year = $2
      ORDER BY g.exam_type, g.subject
    `, [studentId, year]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getStudentGrades:', error);
    res.json({ success: true, data: [] });
  }
};

// Get performance summary (global) - FIXED VERSION
gradeController.getPerformanceSummary = async (req, res) => {
  try {
    const { class_id, exam_type, academic_year } = req.query;
    const year = academic_year || '2024-2025';
    
    // Check if grades table exists and has data
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'grades'
      )
    `);
    
    if (!tableCheck.rows[0].exists) {
      return res.json({ success: true, data: [], message: 'Grades table not yet created' });
    }
    
    let query = `
      SELECT 
        COALESCE(c.name, c.class_name, 'Unknown') as class_name,
        g.subject,
        COUNT(DISTINCT g.student_id) as student_count,
        ROUND(AVG(g.marks), 2) as average_score,
        MAX(g.marks) as highest_score,
        MIN(g.marks) as lowest_score
      FROM grades g
      LEFT JOIN classes c ON g.class_id = c.id
      WHERE g.academic_year = $1
    `;
    
    const params = [year];
    let paramCount = 2;
    
    if (class_id) {
      query += ` AND g.class_id = $${paramCount++}`;
      params.push(class_id);
    }
    
    if (exam_type) {
      query += ` AND g.exam_type = $${paramCount++}`;
      params.push(exam_type);
    }
    
    query += ` GROUP BY c.name, c.class_name, g.subject ORDER BY class_name, g.subject`;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getPerformanceSummary:', error);
    // Return empty array instead of error
    res.json({ success: true, data: [] });
  }
};

// Get grade statistics
gradeController.getGradeStatistics = async (req, res) => {
  try {
    const { class_id, exam_type, academic_year } = req.query;
    const year = academic_year || '2024-2025';
    
    let query = `
      SELECT 
        COUNT(DISTINCT g.student_id) as total_students,
        COUNT(DISTINCT g.subject) as total_subjects,
        COUNT(*) as total_records,
        ROUND(AVG(g.marks), 2) as overall_average,
        MAX(g.marks) as highest_mark,
        MIN(g.marks) as lowest_mark,
        COUNT(CASE WHEN g.grade = 'A' THEN 1 END) as a_count,
        COUNT(CASE WHEN g.grade = 'B' THEN 1 END) as b_count,
        COUNT(CASE WHEN g.grade = 'C' THEN 1 END) as c_count,
        COUNT(CASE WHEN g.grade = 'D' THEN 1 END) as d_count,
        COUNT(CASE WHEN g.grade = 'F' THEN 1 END) as f_count
      FROM grades g
      WHERE g.academic_year = $1
    `;
    
    const params = [year];
    let paramCount = 2;
    
    if (class_id) {
      query += ` AND g.class_id = $${paramCount++}`;
      params.push(class_id);
    }
    
    if (exam_type) {
      query += ` AND g.exam_type = $${paramCount++}`;
      params.push(exam_type);
    }
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows[0] || {} });
  } catch (error) {
    console.error('Error in getGradeStatistics:', error);
    res.json({ success: true, data: {} });
  }
};

// Get grade by ID
gradeController.getGradeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        g.*,
        s.first_name,
        s.last_name,
        s.admission_number,
        COALESCE(c.name, c.class_name, 'Unknown') as class_name
      FROM grades g
      JOIN students s ON g.student_id = s.id
      LEFT JOIN classes c ON g.class_id = c.id
      WHERE g.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grade record not found' });
    }
    
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error in getGradeById:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// POST ROUTES
// ============================================

// Create new grade
gradeController.createGrade = async (req, res) => {
  try {
    const { student_id, class_id, subject, exam_type, marks, grade, remarks, academic_year } = req.body;
    const userId = req.user?.id;
    
    if (!student_id || !class_id || !subject || !exam_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student ID, Class ID, Subject, and Exam Type are required' 
      });
    }
    
    const finalGrade = grade || calculateGrade(marks);
    const year = academic_year || '2024-2025';
    
    const result = await pool.query(`
      INSERT INTO grades (student_id, class_id, subject, exam_type, marks, grade, remarks, academic_year, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (student_id, class_id, subject, exam_type, academic_year) 
      DO UPDATE SET 
        marks = EXCLUDED.marks,
        grade = EXCLUDED.grade,
        remarks = EXCLUDED.remarks,
        updated_at = NOW()
      RETURNING *
    `, [student_id, class_id, subject, exam_type, marks, finalGrade, remarks, year]);
    
    res.status(201).json({ 
      success: true, 
      data: result.rows[0],
      message: 'Grade saved successfully' 
    });
  } catch (error) {
    console.error('Error in createGrade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Save student remarks
gradeController.saveStudentRemarks = async (req, res) => {
  try {
    const { student_id, remarks, exam_type, academic_year } = req.body;
    const userId = req.user?.id;
    
    if (!student_id || !remarks) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student ID and Remarks are required' 
      });
    }
    
    const year = academic_year || '2024-2025';
    const examType = exam_type || 'final';
    
    // Check if table exists
    const tableCheck = await pool.query(`
      CREATE TABLE IF NOT EXISTS grades_remarks (
        id SERIAL PRIMARY KEY,
        student_id INTEGER REFERENCES students(id),
        remarks TEXT,
        exam_type VARCHAR(50),
        academic_year VARCHAR(20),
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(student_id, exam_type, academic_year)
      )
    `);
    
    const result = await pool.query(`
      INSERT INTO grades_remarks (student_id, remarks, exam_type, academic_year, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (student_id, exam_type, academic_year) 
      DO UPDATE SET 
        remarks = EXCLUDED.remarks,
        updated_at = NOW()
      RETURNING *
    `, [student_id, remarks, examType, year, userId]);
    
    res.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Remarks saved successfully' 
    });
  } catch (error) {
    console.error('Error in saveStudentRemarks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Bulk upload grades
gradeController.bulkUploadGrades = async (req, res) => {
  try {
    const { grades } = req.body;
    
    if (!grades || !Array.isArray(grades) || grades.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Grades array is required' 
      });
    }
    
    let savedCount = 0;
    const errors = [];
    
    for (const grade of grades) {
      try {
        const { student_id, class_id, subject, exam_type, marks, grade: letterGrade, remarks, academic_year } = grade;
        
        const finalGrade = letterGrade || calculateGrade(marks);
        const year = academic_year || '2024-2025';
        
        await pool.query(`
          INSERT INTO grades (student_id, class_id, subject, exam_type, marks, grade, remarks, academic_year, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (student_id, class_id, subject, exam_type, academic_year) 
          DO UPDATE SET 
            marks = EXCLUDED.marks,
            grade = EXCLUDED.grade,
            remarks = EXCLUDED.remarks,
            updated_at = NOW()
        `, [student_id, class_id, subject, exam_type, marks, finalGrade, remarks, year]);
        
        savedCount++;
      } catch (err) {
        errors.push({ grade, error: err.message });
      }
    }
    
    res.json({ 
      success: true, 
      message: `${savedCount} out of ${grades.length} grades saved successfully`,
      saved: savedCount,
      total: grades.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Error in bulkUploadGrades:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// PUT ROUTES
// ============================================

// Update grade
gradeController.updateGrade = async (req, res) => {
  try {
    const { id } = req.params;
    const { marks, grade, remarks } = req.body;
    
    const finalGrade = grade || (marks ? calculateGrade(marks) : undefined);
    
    // Get current grade
    const current = await pool.query('SELECT * FROM grades WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grade record not found' });
    }
    
    const updatedMarks = marks !== undefined ? marks : current.rows[0].marks;
    const updatedGrade = finalGrade !== undefined ? finalGrade : current.rows[0].grade;
    const updatedRemarks = remarks !== undefined ? remarks : current.rows[0].remarks;
    
    const result = await pool.query(`
      UPDATE grades 
      SET marks = $1, grade = $2, remarks = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [updatedMarks, updatedGrade, updatedRemarks, id]);
    
    res.json({ 
      success: true, 
      data: result.rows[0],
      message: 'Grade updated successfully' 
    });
  } catch (error) {
    console.error('Error in updateGrade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================
// DELETE ROUTES
// ============================================

// Delete grade
gradeController.deleteGrade = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query('DELETE FROM grades WHERE id = $1 RETURNING id', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grade record not found' });
    }
    
    res.json({ success: true, message: 'Grade deleted successfully' });
  } catch (error) {
    console.error('Error in deleteGrade:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = gradeController;