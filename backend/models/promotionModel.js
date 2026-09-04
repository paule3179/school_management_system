// backend/controllers/promotionController.js
const pool = require('../config/database');
const promotionModel = require('../models/promotionModel');

const promotionController = {};

// ============================================================
//  GET STUDENTS WITH QUALIFICATION (for Teachers & Admins)
// ============================================================
promotionController.getStudentsWithQualification = async (req, res) => {
  try {
    const { class_id, academic_year, term } = req.query;
    const year = academic_year || '2024-2025';
    const currentTerm = parseInt(term) || 1;

    // 1. Get active students in the class (using student_classes)
    const studentQuery = `
      SELECT 
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.gender,
        c.id AS class_id,
        c.class_name,
        c.level,
        sc.academic_year,
        sc.term
      FROM students s
      JOIN student_classes sc ON s.id = sc.student_id AND sc.is_active = true
      JOIN classes c ON sc.class_id = c.id
      WHERE sc.class_id = $1
        AND sc.academic_year = $2
        AND sc.term = $3
      ORDER BY s.last_name, s.first_name
    `;
    const studentRes = await pool.query(studentQuery, [class_id, year, currentTerm]);
    const students = studentRes.rows;

    if (students.length === 0) {
      return res.json({ success: true, data: [], counts: { total: 0, qualified: 0, unqualified: 0 } });
    }

    // 2. For each student, compute average grade & attendance rate
    const enriched = await Promise.all(students.map(async (student) => {
      // Average grade from 'grades' table
      const gradeRes = await pool.query(`
        SELECT COALESCE(AVG(continuous_assessment + exam_score), 0) AS avg
        FROM grades
        WHERE student_id = $1 AND term = $2 AND academic_year = $3
      `, [student.id, currentTerm, year]);
      const avgGrade = parseFloat(gradeRes.rows[0]?.avg) || 0;

      // Attendance rate from 'attendance' table
      const attRes = await pool.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present
        FROM attendance
        WHERE student_id = $1 AND term = $2 AND academic_year = $3
      `, [student.id, currentTerm, year]);
      const totalDays = parseInt(attRes.rows[0]?.total) || 0;
      const presentDays = parseInt(attRes.rows[0]?.present) || 0;
      const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      // Check if student already has a promotion record for this year/term
      const promoRes = await pool.query(`
        SELECT status FROM promotions
        WHERE student_id = $1 AND from_academic_year = $2 AND term = $3
      `, [student.id, year, currentTerm]);
      const existingStatus = promoRes.rows[0]?.status || null;

      // Qualification criteria (adjust thresholds as needed)
      const hasPassingGrade = avgGrade >= 50;
      const hasGoodAttendance = attendanceRate >= 75;
      const qualified = hasPassingGrade && hasGoodAttendance;

      // Get suggested next class
      const nextClass = await promotionModel.getNextClass(student.class_id);

      return {
        ...student,
        average_grade: Math.round(avgGrade * 100) / 100,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        qualified,
        current_promotion_status: existingStatus,
        suggested_next_class: nextClass?.next_class_name || 'GRADUATED',
        reasons: {
          low_grades: !hasPassingGrade,
          poor_attendance: !hasGoodAttendance
        }
      };
    }));

    const counts = {
      total: enriched.length,
      qualified: enriched.filter(s => s.qualified).length,
      unqualified: enriched.filter(s => !s.qualified).length
    };

    res.json({ success: true, data: enriched, counts });
  } catch (error) {
    console.error('Error in getStudentsWithQualification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
//  SAVE PROMOTIONS (Admin only – with transaction)
// ============================================================
promotionController.savePromotions = async (req, res) => {
  const client = await pool.connect();
  try {
    const {
      from_academic_year,
      to_academic_year,
      term,
      from_class_id,
      to_class_id,
      students
    } = req.body;

    const recordedBy = req.user?.id;
    if (!recordedBy) {
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!students || students.length === 0) {
      return res.status(400).json({ success: false, error: 'No students provided' });
    }

    const pending = students.filter(s => !s.status || s.status === 'pending');
    if (pending.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Please set a status for ${pending.length} student(s).`
      });
    }

    await client.query('BEGIN');

    let promotedCount = 0;
    let retainedCount = 0;
    let graduatedCount = 0;
    const errors = [];

    for (const item of students) {
      try {
        const { student_id, status, remarks } = item;

        // Insert into promotions
        await client.query(`
          INSERT INTO promotions (
            student_id, from_class_id, to_class_id,
            from_academic_year, to_academic_year, term,
            status, remarks, recorded_by, promotion_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE)
          ON CONFLICT (student_id, from_academic_year, term)
          DO UPDATE SET
            to_class_id = EXCLUDED.to_class_id,
            to_academic_year = EXCLUDED.to_academic_year,
            status = EXCLUDED.status,
            remarks = EXCLUDED.remarks,
            recorded_by = EXCLUDED.recorded_by,
            promotion_date = CURRENT_DATE,
            updated_at = CURRENT_TIMESTAMP
        `, [
          student_id,
          from_class_id,
          status === 'Promoted' ? to_class_id : from_class_id,
          from_academic_year,
          to_academic_year,
          term,
          status,
          remarks || null,
          recordedBy
        ]);

        // If status is 'Promoted', update student_classes
        if (status === 'Promoted') {
          // Deactivate old active enrollment
          await client.query(`
            UPDATE student_classes
            SET is_active = false, left_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = $1
              AND academic_year = $2
              AND term = $3
              AND is_active = true
          `, [student_id, from_academic_year, term]);

          // Insert new active enrollment
          await client.query(`
            INSERT INTO student_classes (
              student_id, class_id, academic_year, term,
              is_active, enrolled_date
            ) VALUES ($1, $2, $3, $4, true, CURRENT_DATE)
          `, [student_id, to_class_id, to_academic_year, term]);

          promotedCount++;
        } else if (status === 'Retained') {
          retainedCount++;
        } else if (status === 'Graduated') {
          await client.query(`
            UPDATE student_classes
            SET is_active = false, left_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = $1
              AND academic_year = $2
              AND term = $3
              AND is_active = true
          `, [student_id, from_academic_year, term]);
          graduatedCount++;
        }
      } catch (err) {
        errors.push({ student_id: item.student_id, error: err.message });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      promoted_count: promotedCount,
      retained_count: retainedCount,
      graduated_count: graduatedCount,
      total_processed: students.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Processed ${students.length} students (${promotedCount} promoted, ${retainedCount} retained, ${graduatedCount} graduated).`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error in savePromotions:', error);
    res.status(500).json({ success: false, error: error.message });
  } finally {
    client.release();
  }
};

// ============================================================
//  GET PROMOTION HISTORY
// ============================================================
promotionController.getPromotionHistory = async (req, res) => {
  try {
    const { student_id, class_id, academic_year } = req.query;
    const filters = {};
    if (student_id) filters.student_id = parseInt(student_id);
    if (class_id) filters.class_id = parseInt(class_id);
    if (academic_year) filters.academic_year = academic_year;
    const history = await promotionModel.getPromotionHistory(filters);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error fetching promotion history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
//  GET NEXT CLASS (helper for preview)
// ============================================================
promotionController.getNextClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const result = await promotionModel.getNextClass(parseInt(classId));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
//  GET TEACHER'S CLASSES (for dropdown)
// ============================================================
promotionController.getTeacherClasses = async (req, res) => {
  try {
    const teacherId = req.user.id;
    const result = await pool.query(`
      SELECT 
        c.id,
        c.class_name,
        c.level,
        COUNT(DISTINCT sc.student_id) AS student_count
      FROM teacher_classes tc
      JOIN classes c ON tc.class_id = c.id
      LEFT JOIN student_classes sc ON c.id = sc.class_id AND sc.is_active = true
      WHERE tc.teacher_id = $1
      GROUP BY c.id, c.class_name, c.level
      ORDER BY c.level, c.class_name
    `, [teacherId]);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching teacher classes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = promotionController;