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

function numericScore(value, field) {
  if (value === undefined || value === null || value === '') return 0;
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    throw new Error(`${field} must be a number between 0 and 100`);
  }
  return score;
}

async function saveGradeRecord(data, recordedBy) {
  const studentId = Number(data.student_id);
  const classId = Number(data.class_id);
  const subject = typeof data.subject === 'string' ? data.subject.trim() : '';
  const term = Number(data.term || 1);
  const academicYear = typeof data.academic_year === 'string' && data.academic_year.trim()
    ? data.academic_year.trim()
    : '2024-2025';
  if (!Number.isInteger(studentId) || studentId <= 0 || !Number.isInteger(classId) || classId <= 0 ||
      !subject || !Number.isInteger(term) || term < 1 || term > 3) {
    throw new Error('Student, class, subject, term, and academic year are required');
  }

  const continuousAssessment = numericScore(data.continuous_assessment ?? data.ca, 'Continuous assessment');
  const projectScore = numericScore(data.project_score, 'Project score');
  const examScore = numericScore(data.exam_score ?? data.exam, 'Exam score');
  const totalScore = continuousAssessment + projectScore + examScore;
  if (totalScore > 100) throw new Error('Combined grade score cannot exceed 100');
  const letterGrade = calculateGrade(totalScore);

  const existing = await pool.query(`
    SELECT id FROM grades
    WHERE student_id = $1 AND class_id = $2 AND subject = $3 AND term = $4 AND academic_year = $5
    ORDER BY id DESC LIMIT 1
  `, [studentId, classId, subject, term, academicYear]);

  const values = [continuousAssessment, projectScore, examScore, totalScore, letterGrade, data.remarks || null];
  if (existing.rows[0]) {
    const updated = await pool.query(`
      UPDATE grades SET continuous_assessment = $1, project_score = $2, exam_score = $3,
        total_score = $4, grade = $5, remarks = $6, recorded_by = $7, recorded_at = NOW()
      WHERE id = $8 RETURNING *
    `, [...values, recordedBy || null, existing.rows[0].id]);
    return updated.rows[0];
  }

  const inserted = await pool.query(`
    INSERT INTO grades (
      student_id, class_id, subject, term, term_name, academic_year,
      continuous_assessment, project_score, exam_score, total_score, grade, remarks, recorded_by, recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
    RETURNING *
  `, [studentId, classId, subject, term, data.term_name || `Term ${term}`, academicYear,
    continuousAssessment, projectScore, examScore, totalScore, letterGrade, data.remarks || null, recordedBy || null]);
  return inserted.rows[0];
}

// ============================================
// GET ROUTES
// ============================================

// Get all grades with filters
gradeController.getAllGrades = async (req, res) => {
  try {
    const { class_id, student_id, subject, term } = req.query;
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
        c.class_name,
        g.subject,
        g.term,
        g.continuous_assessment,
        g.project_score,
        g.exam_score,
        g.total_score AS marks,
        g.grade,
        g.remarks,
        g.recorded_at AS created_at
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
    
    if (term) {
      query += ` AND g.term = $${paramCount++}`;
      params.push(term);
    }
    
    if (student_id) {
      query += ` AND g.student_id = $${paramCount++}`;
      params.push(student_id);
    }
    
    if (subject) {
      query += ` AND g.subject ILIKE $${paramCount++}`;
      params.push(`%${subject}%`);
    }
    
    query += ` ORDER BY s.first_name, s.last_name, g.subject, g.term`;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getAllGrades:', error);
    res.status(500).json({ success: false, error: 'Unable to fetch grades' });
  }
};

// Get class grades (for grade entry UI)
gradeController.getClassGrades = async (req, res) => {
  try {
    const { classId } = req.params;
    const { academic_year, term } = req.query;
    const year = academic_year || '2024-2025';
    const currentTerm = Number(term || 1);
    
    const studentsResult = await pool.query(`
        SELECT 
          s.id,
          s.first_name,
          s.last_name,
          s.admission_number,
          s.gender
        FROM students s
        WHERE s.class_id = $1 AND LOWER(COALESCE(s.status, 'active')) = 'active'
        ORDER BY s.first_name, s.last_name
      `, [classId]);
    
    if (studentsResult.rows.length === 0) {
      return res.json({ 
        success: true, 
        data: { students: [], subjects: [] }, 
        message: 'No students found in this class' 
      });
    }
    
    const gradesResult = await pool.query(`
      SELECT g.*, g.total_score AS marks
      FROM grades g
      WHERE g.class_id = $1 AND g.academic_year = $2 AND g.term = $3
      ORDER BY g.student_id, g.subject
    `, [classId, year, currentTerm]);

    res.json({ success: true, data: gradesResult.rows });
  } catch (error) {
    console.error('Error in getClassGrades:', error);
    res.status(500).json({ success: false, error: 'Unable to fetch class grades' });
  }
};

// Get class performance summary
gradeController.getClassPerformance = async (req, res) => {
  try {
    const { classId } = req.params;
    const { term, academic_year } = req.query;
    const year = academic_year || '2024-2025';
    const currentTerm = Number(term || 1);
    
    const result = await pool.query(`
      SELECT 
        g.subject,
        COUNT(DISTINCT g.student_id) as total_students,
        ROUND(AVG(g.total_score), 2) as average_score,
        MAX(g.total_score) as highest_score,
        MIN(g.total_score) as lowest_score,
        COUNT(CASE WHEN g.grade = 'A' THEN 1 END) as grade_a,
        COUNT(CASE WHEN g.grade = 'B' THEN 1 END) as grade_b,
        COUNT(CASE WHEN g.grade = 'C' THEN 1 END) as grade_c,
        COUNT(CASE WHEN g.grade = 'D' THEN 1 END) as grade_d,
        COUNT(CASE WHEN g.grade = 'F' THEN 1 END) as grade_f
      FROM grades g
      WHERE g.class_id = $1 
        AND g.academic_year = $2 
        AND g.term = $3
      GROUP BY g.subject
      ORDER BY g.subject
    `, [classId, year, currentTerm]);
    
    // Calculate overall performance
    const overallResult = await pool.query(`
      SELECT 
        ROUND(AVG(g.total_score), 2) as overall_average,
        COUNT(DISTINCT g.student_id) as total_students,
        COUNT(DISTINCT g.subject) as total_subjects
      FROM grades g
      WHERE g.class_id = $1 
        AND g.academic_year = $2 
        AND g.term = $3
    `, [classId, year, currentTerm]);
    
    res.json({ 
      success: true, 
      data: {
        overall: overallResult.rows[0] || { overall_average: 0, total_students: 0, total_subjects: 0 },
        subjects: result.rows
      }
    });
  } catch (error) {
    console.error('Error in getClassPerformance:', error);
    res.status(500).json({ success: false, error: 'Unable to fetch class performance' });
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
        m.term,
        m.academic_year
      FROM marks m
      LEFT JOIN subjects s ON s.id = m.subject_id
      WHERE m.student_id = $1
        AND ($2::text IS NULL OR m.academic_year = $2)
        AND ($3::int IS NULL OR m.term = $3)
      ORDER BY m.exam_type, s.name
    `;

    const marksResult = await pool.query(marksQuery, [studentId, year, requestedTerm]);
    reportRows = marksResult.rows;

    if (reportRows.length === 0) {
      const legacyGradesResult = await pool.query(`
        SELECT
          subject,
          term_name AS exam_type,
          total_score AS marks,
          grade,
          remarks,
          recorded_at AS created_at,
          term
        FROM grades
        WHERE student_id = $1 AND academic_year = $2
          AND ($3::int IS NULL OR term = $3)
        ORDER BY term, subject
      `, [studentId, year, requestedTerm]);

      reportRows = legacyGradesResult.rows.map(row => ({
        subject: row.subject,
        exam_type: row.exam_type,
        marks: row.marks,
        grade: row.grade,
        remarks: row.remarks,
        created_at: row.created_at,
        academic_year: year,
        term_id: row.term
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
    const { academic_year, term } = req.query;
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
        r.term,
        r.academic_year,
        r.created_at,
        s.first_name,
        s.last_name
      FROM grades_remarks r
      JOIN students s ON r.student_id = s.id
      WHERE r.student_id = $1 AND r.academic_year = $2
    `;
    
    const params = [studentId, year];
    
    if (term) {
      query += ` AND r.term = $3`;
      params.push(term);
    }
    
    query += ` ORDER BY r.term`;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getStudentRemarks:', error);
    res.status(500).json({ success: false, error: 'Unable to fetch student remarks' });
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
        c.class_name,
        g.subject,
        g.term,
        g.continuous_assessment,
        g.project_score,
        g.exam_score,
        g.total_score AS marks,
        g.grade,
        g.remarks,
        g.recorded_at AS created_at
      FROM grades g
      LEFT JOIN classes c ON g.class_id = c.id
      WHERE g.student_id = $1 AND g.academic_year = $2
      ORDER BY g.term, g.subject
    `, [studentId, year]);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getStudentGrades:', error);
    res.status(500).json({ success: false, error: 'Unable to fetch student grades' });
  }
};

// Get performance summary (global) - FIXED VERSION
gradeController.getPerformanceSummary = async (req, res) => {
  try {
    const { class_id, term, academic_year } = req.query;
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
        c.class_name,
        g.subject,
        COUNT(DISTINCT g.student_id) as student_count,
        ROUND(AVG(g.total_score), 2) as average_score,
        MAX(g.total_score) as highest_score,
        MIN(g.total_score) as lowest_score
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
    
    if (term) {
      query += ` AND g.term = $${paramCount++}`;
      params.push(term);
    }
    
    query += ` GROUP BY c.class_name, g.subject ORDER BY class_name, g.subject`;
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error in getPerformanceSummary:', error);
    res.status(500).json({ success: false, error: 'Unable to fetch performance summary' });
  }
};

// Get grade statistics
gradeController.getGradeStatistics = async (req, res) => {
  try {
    const { class_id, term, academic_year } = req.query;
    const year = academic_year || '2024-2025';
    
    let query = `
      SELECT 
        COUNT(DISTINCT g.student_id) as total_students,
        COUNT(DISTINCT g.subject) as total_subjects,
        COUNT(*) as total_records,
        ROUND(AVG(g.total_score), 2) as overall_average,
        MAX(g.total_score) as highest_mark,
        MIN(g.total_score) as lowest_mark,
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
    
    if (term) {
      query += ` AND g.term = $${paramCount++}`;
      params.push(term);
    }
    
    const result = await pool.query(query, params);
    
    res.json({ success: true, data: result.rows[0] || {} });
  } catch (error) {
    console.error('Error in getGradeStatistics:', error);
    res.status(500).json({ success: false, error: 'Unable to fetch grade statistics' });
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
        c.class_name
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
    const data = req.body || {};
    const saved = await saveGradeRecord(data, req.user?.id);
    
    res.status(201).json({ 
      success: true, 
      data: saved,
      message: 'Grade saved successfully' 
    });
  } catch (error) {
    console.error('Error in createGrade:', error);
    const status = /required|must be|cannot exceed/i.test(error.message) ? 400 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Save student remarks
gradeController.saveStudentRemarks = async (req, res) => {
  try {
    const { student_id, remarks, term, academic_year } = req.body;
    
    if (!student_id || !remarks) {
      return res.status(400).json({ 
        success: false, 
        error: 'Student ID and Remarks are required' 
      });
    }
    
    const year = academic_year || '2024-2025';
    const currentTerm = Number(term || 1);
    if (!Number.isInteger(currentTerm) || currentTerm < 1 || currentTerm > 3) {
      return res.status(400).json({ success: false, error: 'Term must be between 1 and 3' });
    }
    
    const result = await pool.query(`
      INSERT INTO grades_remarks (student_id, remarks, term, academic_year, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      ON CONFLICT (student_id, term, academic_year)
      DO UPDATE SET 
        remarks = EXCLUDED.remarks,
        updated_at = NOW()
      RETURNING *
    `, [student_id, remarks, currentTerm, year]);
    
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
        await saveGradeRecord(grade, req.user?.id);
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
    const { continuous_assessment, project_score, exam_score, marks, grade, remarks } = req.body;
    
    // Get current grade
    const current = await pool.query('SELECT * FROM grades WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grade record not found' });
    }
    
    const row = current.rows[0];
    const ca = continuous_assessment !== undefined
      ? numericScore(continuous_assessment, 'Continuous assessment') : Number(row.continuous_assessment || 0);
    const project = project_score !== undefined
      ? numericScore(project_score, 'Project score') : Number(row.project_score || 0);
    const exam = exam_score !== undefined
      ? numericScore(exam_score, 'Exam score') : marks !== undefined
        ? numericScore(marks, 'Exam score') : Number(row.exam_score || 0);
    const total = ca + project + exam;
    if (total > 100) return res.status(400).json({ success: false, error: 'Combined grade score cannot exceed 100' });
    const updatedGrade = grade || calculateGrade(total);
    const updatedRemarks = remarks !== undefined ? remarks : current.rows[0].remarks;
    
    const result = await pool.query(`
      UPDATE grades 
      SET continuous_assessment = $1, project_score = $2, exam_score = $3,
          total_score = $4, grade = $5, remarks = $6, recorded_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [ca, project, exam, total, updatedGrade, updatedRemarks, id]);
    
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
