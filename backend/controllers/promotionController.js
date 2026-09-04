// backend/controllers/promotionController.js
const pool = require('../config/database');

const promotionController = {};

// ============================================================
// 1. GET STUDENTS WITH QUALIFICATION (for Teachers & Admins)
// ============================================================
promotionController.getStudentsWithQualification = async (req, res) => {
  try {
    const { class_id, academic_year, term } = req.query;
    const year = academic_year || '2025-2026';
    const currentTerm = parseInt(term) || 1;

    const studentQuery = `
      SELECT 
        s.id, s.admission_number, s.first_name, s.last_name, s.gender,
        c.class_name AS class_name, c.level
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

    const enriched = await Promise.all(students.map(async (student) => {
      // Average grade
      const gradeRes = await pool.query(`
        SELECT COALESCE(AVG(continuous_assessment + exam_score), 0) AS avg
        FROM grades
        WHERE student_id = $1 AND term = $2 AND academic_year = $3
      `, [student.id, currentTerm, year]);
      const avgGrade = parseFloat(gradeRes.rows[0]?.avg) || 0;

      // Attendance rate
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

      // Check existing promotion status
      const promoRes = await pool.query(`
        SELECT status FROM promotions
        WHERE student_id = $1 AND from_academic_year = $2 AND term = $3
      `, [student.id, year, currentTerm]);
      const existingStatus = promoRes.rows[0]?.status || null;

      const hasPassingGrade = avgGrade >= 50;
      const hasGoodAttendance = attendanceRate >= 75;
      const qualified = hasPassingGrade && hasGoodAttendance;

      return {
        ...student,
        average_grade: Math.round(avgGrade * 100) / 100,
        attendance_rate: Math.round(attendanceRate * 100) / 100,
        qualified,
        current_promotion_status: existingStatus,
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
// 2. SAVE PROMOTIONS (Admin only)
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
          await client.query(`
            UPDATE student_classes
            SET is_active = false, left_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
            WHERE student_id = $1
              AND academic_year = $2
              AND term = $3
              AND is_active = true
          `, [student_id, from_academic_year, term]);

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
// 3. GET PROMOTION HISTORY
// ============================================================
promotionController.getPromotionHistory = async (req, res) => {
  try {
    const { student_id, class_id, academic_year } = req.query;
    let query = `
      SELECT 
        p.*,
        s.first_name, s.last_name, s.admission_number,
        fc.class_name AS from_class_name,
        tc.class_name AS to_class_name,
        u.username AS recorded_by_name
      FROM promotions p
      JOIN students s ON p.student_id = s.id
      LEFT JOIN classes fc ON p.from_class_id = fc.id
      LEFT JOIN classes tc ON p.to_class_id = tc.id
      LEFT JOIN users u ON p.recorded_by = u.id
      WHERE 1=1
    `;
    const params = [];
    let idx = 1;
    if (student_id) {
      query += ` AND p.student_id = $${idx++}`;
      params.push(parseInt(student_id));
    }
    if (class_id) {
      query += ` AND (p.from_class_id = $${idx++} OR p.to_class_id = $${idx++})`;
      params.push(parseInt(class_id), parseInt(class_id));
    }
    if (academic_year) {
      query += ` AND (p.from_academic_year = $${idx++} OR p.to_academic_year = $${idx++})`;
      params.push(academic_year, academic_year);
    }
    query += ' ORDER BY p.promotion_date DESC, p.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching promotion history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ============================================================
// 4. GET NEXT CLASS (helper for preview)
// ============================================================
promotionController.getNextClass = async (req, res) => {
  try {
    const { classId } = req.params;
    const classRes = await pool.query('SELECT class_name, level FROM classes WHERE id = $1', [classId]);
    if (classRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Class not found' });
    }
    const { class_name, level } = classRes.rows[0];
    const match = class_name?.match(/(\d+)/);
    let nextName = 'GRADUATED';
    if (match) {
      const num = parseInt(match[1]);
      if (level === 'KG' && num < 2) nextName = 'Primary 1A';
      else if (level === 'Primary' && num < 6) nextName = `Primary ${num + 1}A`;
      else if (level === 'JHS' && num < 3) nextName = `JHS${num + 1}A`;
    }
    res.json({ success: true, data: { current_class: class_name, next_class: nextName } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = promotionController;