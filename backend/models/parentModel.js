// backend/models/parentModel.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');

class ParentModel {
  async getAllParents() {
    const result = await pool.query(`
      SELECT p.*, COUNT(DISTINCT s.id) as children_count
      FROM parents p
      LEFT JOIN parent_students ps ON ps.parent_id = p.id
      LEFT JOIN students s ON (s.parent_id = p.id OR s.id = ps.student_id)
        AND LOWER(COALESCE(s.status, 'active')) = 'active'
      GROUP BY p.id
      ORDER BY p.id DESC
    `);
    
    const parentsWithChildren = [];
    for (const parent of result.rows) {
      const childrenResult = await pool.query(`
        SELECT id, admission_number, first_name, last_name, class_id
        FROM students 
        WHERE parent_id = $1 AND LOWER(COALESCE(status, 'active')) = 'active'
      `, [parent.id]);
      
      parentsWithChildren.push({
        ...parent,
        children: childrenResult.rows.map(c => ({
          id: c.id,
          name: `${c.first_name} ${c.last_name}`,
          class_id: c.class_id,
          admission_number: c.admission_number
        }))
      });
    }
    return parentsWithChildren;
  }

  async getParentById(id) {
    const result = await pool.query(`
      SELECT p.*, COUNT(DISTINCT s.id) as children_count
      FROM parents p
      LEFT JOIN parent_students ps ON ps.parent_id = p.id
      LEFT JOIN students s ON (s.parent_id = p.id OR s.id = ps.student_id)
        AND LOWER(COALESCE(s.status, 'active')) = 'active'
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const parent = result.rows[0];
    const childrenResult = await pool.query(`
      SELECT id, admission_number, first_name, last_name, class_id,
             (SELECT class_name FROM classes WHERE id = students.class_id) as class_name
      FROM students 
      WHERE (parent_id = $1 OR id IN (SELECT student_id FROM parent_students WHERE parent_id = $1))
        AND LOWER(COALESCE(status, 'active')) = 'active'
    `, [id]);
    
    return {
      ...parent,
      children: childrenResult.rows.map(c => ({
        ...c,
        full_name: `${c.first_name} ${c.last_name}`
      }))
    };
  }

  async getParentByUserId(userId) {
    const result = await pool.query(`
      SELECT p.*, u.email, u.first_name, u.last_name
      FROM parents p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `, [userId]);
    return result.rows[0] || null;
  }

  async getParentByEmail(email) {
    const result = await pool.query(`
      SELECT * FROM parents WHERE email = $1
    `, [email]);
    return result.rows[0] || null;
  }

  async getMyChildren(parentId) {
    const emailResult = await pool.query(`
      SELECT u.email 
      FROM parents p
      JOIN users u ON p.user_id = u.id
      WHERE p.id = $1
    `, [parentId]);
    const parentEmail = emailResult.rows[0]?.email || null;

    const query = `
      SELECT DISTINCT
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.class_id,
        s.date_of_birth,
        s.gender,
        s.status,
        c.class_name,
        c.level
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE (
        s.parent_id = $1
        OR EXISTS (
          SELECT 1 FROM parent_students ps
          WHERE ps.student_id = s.id AND ps.parent_id = $1
        )
        OR (s.parent_email IS NOT NULL AND LOWER(BTRIM(s.parent_email)) = LOWER(BTRIM($2)))
      )
        AND LOWER(COALESCE(s.status, 'active')) = 'active'
      ORDER BY s.first_name, s.last_name
    `;
    
    const params = [parentId, parentEmail];
    const result = await pool.query(query, params);
    return result.rows;
  }

  async getChildrenByParentEmail(email) {
    const result = await pool.query(`
      SELECT 
        s.id,
        s.admission_number,
        s.first_name,
        s.last_name,
        s.class_id,
        s.date_of_birth,
        s.gender,
        s.status,
        c.class_name,
        c.level
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE LOWER(BTRIM(s.parent_email)) = LOWER(BTRIM($1))
        AND LOWER(COALESCE(s.status, 'active')) = 'active'
      ORDER BY s.first_name, s.last_name
    `, [email]);
    return result.rows;
  }

  async getParentDashboard(parentId) {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_children,
        COUNT(DISTINCT g.id) as total_grades,
        COUNT(DISTINCT a.id) as total_attendance,
        COUNT(DISTINCT f.id) as total_fees,
        ROUND(COALESCE(AVG(COALESCE(g.continuous_assessment, 0) + COALESCE(g.project_score, 0) + COALESCE(g.exam_score, 0)), 0), 2) as avg_performance,
        ROUND(
          COALESCE(
            (SUM(CASE WHEN LOWER(a.status) = 'present' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(a.id), 0)) * 100, 
            0
          ), 2
        ) as attendance_rate
      FROM students s
      LEFT JOIN grades g ON s.id = g.student_id
      LEFT JOIN attendance a ON s.id = a.student_id
      LEFT JOIN fees f ON s.id = f.student_id
      WHERE (
        s.parent_id = $1
        OR EXISTS (SELECT 1 FROM parent_students ps WHERE ps.student_id = s.id AND ps.parent_id = $1)
        OR LOWER(BTRIM(s.parent_email)) = LOWER(BTRIM((SELECT u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = $1)))
      )
        AND LOWER(COALESCE(s.status, 'active')) = 'active'
    `, [parentId]);
    
    return result.rows[0] || {
      total_children: 0,
      total_grades: 0,
      total_attendance: 0,
      total_fees: 0,
      avg_performance: 0,
      attendance_rate: 0
    };
  }

  async getChildPerformance(studentId) {
    const studentResult = await pool.query(`
      SELECT 
        s.id,
        s.first_name,
        s.last_name,
        s.admission_number,
        s.class_id,
        c.class_name,
        c.level
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1
    `, [studentId]);
    if (studentResult.rows.length === 0) return null;
    const student = studentResult.rows[0];

    const gradeResult = await pool.query(`
      SELECT 
        COALESCE(AVG(COALESCE(continuous_assessment, 0) + COALESCE(project_score, 0) + COALESCE(exam_score, 0)), 0) as average,
        COUNT(*) as subject_count
      FROM grades
      WHERE student_id = $1
    `, [studentId]);
    const average = parseFloat(gradeResult.rows[0]?.average) || 0;
    const subjectCount = parseInt(gradeResult.rows[0]?.subject_count) || 0;

    const attendanceResult = await pool.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN LOWER(status) = 'present' THEN 1 ELSE 0 END) as present,
        SUM(CASE WHEN LOWER(status) = 'absent' THEN 1 ELSE 0 END) as absent,
        SUM(CASE WHEN LOWER(status) = 'late' THEN 1 ELSE 0 END) as late
      FROM attendance
      WHERE student_id = $1
    `, [studentId]);
    const total = parseInt(attendanceResult.rows[0]?.total) || 0;
    const present = parseInt(attendanceResult.rows[0]?.present) || 0;
    const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

    const feesResult = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_fees,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(amount) - SUM(paid_amount), 0) as balance
      FROM fees
      WHERE student_id = $1
    `, [studentId]);
    const totalFees = parseFloat(feesResult.rows[0]?.total_fees) || 0;
    const totalPaid = parseFloat(feesResult.rows[0]?.total_paid) || 0;
    const balance = parseFloat(feesResult.rows[0]?.balance) || 0;

    const recentGrades = await pool.query(`
      SELECT
        subject,
        continuous_assessment,
        project_score,
        exam_score,
        COALESCE(continuous_assessment, 0) + COALESCE(project_score, 0) + COALESCE(exam_score, 0) as total,
        grade,
        term,
        academic_year
      FROM grades
      WHERE student_id = $1
      ORDER BY term DESC, recorded_at DESC
      LIMIT 5
    `, [studentId]);

    return {
      student,
      performance: {
        average_score: Math.round(average),
        subject_count: subjectCount,
        attendance_rate: attendanceRate,
        total_days: total,
        present_days: present,
        absent_days: parseInt(attendanceResult.rows[0]?.absent) || 0,
        late_days: parseInt(attendanceResult.rows[0]?.late) || 0
      },
      fees: {
        total_fees: totalFees,
        total_paid: totalPaid,
        balance: balance
      },
      recent_grades: recentGrades.rows
    };
  }

  async getChildGrades(studentId) {
    const result = await pool.query(`
      SELECT 
        g.id,
        g.subject,
        g.continuous_assessment,
        g.project_score,
        g.exam_score,
        COALESCE(g.continuous_assessment, 0) + COALESCE(g.project_score, 0) + COALESCE(g.exam_score, 0) as total,
        g.grade,
        g.term,
        g.academic_year,
        g.recorded_at AS created_at
      FROM grades g
      WHERE g.student_id = $1
      ORDER BY g.term, g.subject
    `, [studentId]);
    return result.rows;
  }

  async getChildAttendance(studentId) {
    const result = await pool.query(`
      SELECT 
        id,
        date,
        status,
        term,
        term_name,
        remarks
      FROM attendance
      WHERE student_id = $1
      ORDER BY date DESC
      LIMIT 30
    `, [studentId]);
    return result.rows;
  }

  async getChildFees(studentId) {
    const result = await pool.query(`
      SELECT 
        id,
        fee_type,
        term,
        term_name,
        academic_year,
        amount,
        paid_amount,
        balance,
        status,
        payment_date,
        payment_method,
        transaction_id,
        receipt_number,
        created_at
      FROM fees
      WHERE student_id = $1
      ORDER BY payment_date DESC, created_at DESC
    `, [studentId]);
    return result.rows;
  }

  async getChildSubjects(studentId) {
    const classResult = await pool.query(
      'SELECT class_id FROM students WHERE id = $1',
      [studentId]
    );
    if (classResult.rows.length === 0) return [];
    const classId = classResult.rows[0].class_id;
    if (!classId) return [];

    const result = await pool.query(`
      SELECT 
        s.id,
        s.name,
        s.code,
        s.description,
        cs.hours_per_week
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.id
      WHERE cs.class_id = $1
      ORDER BY s.name
    `, [classId]);
    return result.rows;
  }

  async getChildTeachers(studentId) {
    const classResult = await pool.query(
      'SELECT class_id FROM students WHERE id = $1',
      [studentId]
    );
    if (classResult.rows.length === 0) return [];
    const classId = classResult.rows[0].class_id;
    if (!classId) return [];

    const result = await pool.query(`
      SELECT DISTINCT
        t.id,
        t.teacher_code,
        t.first_name,
        t.last_name,
        t.subject_specialty,
        t.email,
        t.phone,
        s.name as subject_name,
        s.code as subject_code
      FROM class_subjects cs
      JOIN subjects s ON cs.subject_id = s.id
      LEFT JOIN teacher_subjects ts ON s.id = ts.subject_id
      LEFT JOIN teachers t ON ts.teacher_id = t.id
      WHERE cs.class_id = $1 AND t.id IS NOT NULL
      ORDER BY t.first_name, t.last_name, s.name
    `, [classId]);
    return result.rows;
  }

  async createParent(parentData) {
    const { first_name, last_name, phone, email, address } = parentData;

    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let tempPassword = '';
    for (let i = 0; i < 8; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const insertResult = await pool.query(`
      INSERT INTO parents (
        first_name, last_name, phone, email, address, password, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING id
    `, [first_name, last_name, phone, email, address || null, hashedPassword]);

    const newId = insertResult.rows[0].id;
    const parentIdValue = `PARENT${newId}`;

    await pool.query(`
      UPDATE parents SET parent_id = $1 WHERE id = $2
    `, [parentIdValue, newId]);

    const result = await pool.query(`
      SELECT id, parent_id, first_name, last_name, email, phone
      FROM parents WHERE id = $1
    `, [newId]);

    // Send welcome email (if configured)
    if (email) {
      try {
        const { sendEmail, getParentWelcomeTemplate } = require('../config/email');
        const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
        await sendEmail(
          email,
          'Welcome to Parent Portal',
          getParentWelcomeTemplate(
            `${first_name} ${last_name}`,
            'Your Child',
            'N/A',
            parentIdValue,
            tempPassword,
            loginUrl
          )
        );
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError.message);
      }
    }

    return {
      ...result.rows[0],
      temp_password: tempPassword
    };
  }

  async updateParent(id, updateData) {
    const { first_name, last_name, phone, email, address, is_active } = updateData;

    const result = await pool.query(`
      UPDATE parents 
      SET first_name = COALESCE($1, first_name),
          last_name = COALESCE($2, last_name),
          phone = COALESCE($3, phone),
          email = COALESCE($4, email),
          address = COALESCE($5, address),
          is_active = COALESCE($6, is_active),
          updated_at = NOW()
      WHERE id = $7
      RETURNING *
    `, [first_name, last_name, phone, email, address, is_active, id]);

    return result.rows[0] || null;
  }

  async deleteParent(id) {
    const childCheck = await pool.query(`
      SELECT COUNT(*) as count FROM students WHERE parent_id = $1 AND LOWER(status) = 'active'
    `, [id]);

    if (parseInt(childCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete parent with registered children. Deactivate instead.');
    }

    const result = await pool.query(`
      DELETE FROM parents WHERE id = $1 RETURNING id
    `, [id]);

    return result.rows.length > 0;
  }

  async deactivateParent(id) {
    const result = await pool.query(`
      UPDATE parents SET is_active = false WHERE id = $1 RETURNING id
    `, [id]);
    return result.rows.length > 0;
  }

  async linkParentToStudent(parentId, studentId) {
    const result = await pool.query(`
      UPDATE students SET parent_id = $1 WHERE id = $2 RETURNING id
    `, [parentId, studentId]);
    return result.rows.length > 0;
  }

  async getParentDashboardDetails(parentId) {
    const parent = await this.getParentById(parentId);
    if (!parent) return null;

    const childrenPerformance = [];
    for (const child of parent.children) {
      const perf = await this.getChildPerformance(child.id);
      if (perf) {
        childrenPerformance.push({
          student_id: child.id,
          student_name: child.full_name,
          class: child.class_name,
          class_id: child.class_id,
          admission_number: child.admission_number,
          average_grade: perf.performance.average_score,
          attendance_rate: perf.performance.attendance_rate,
          total_fees: perf.fees.total_fees,
          total_paid: perf.fees.total_paid,
          balance: perf.fees.balance,
          recent_grades: perf.recent_grades
        });
      }
    }

    return {
      parent_info: {
        id: parent.id,
        parent_id: parent.parent_id,
        name: `${parent.first_name} ${parent.last_name}`,
        email: parent.email,
        phone: parent.phone
      },
      children: childrenPerformance
    };
  }
}

module.exports = new ParentModel();
