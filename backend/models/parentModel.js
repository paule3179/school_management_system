// backend/models/parentModel.js
const pool = require('../config/database');
const bcrypt = require('bcrypt');

class ParentModel {
  // Get all parents
  async getAllParents() {
    const result = await pool.query(`
      SELECT p.*, COUNT(s.id) as children_count
      FROM parents p
      LEFT JOIN students s ON s.parent_id = p.id
      GROUP BY p.id
      ORDER BY p.id DESC
    `);
    
    const parentsWithChildren = [];
    for (const parent of result.rows) {
      const childrenResult = await pool.query(`
        SELECT id, admission_number, first_name, last_name, class_id
        FROM students 
        WHERE parent_id = $1 AND LOWER(status) = 'active'
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
  
  // Get parent by ID
  async getParentById(id) {
    const result = await pool.query(`
      SELECT p.*, COUNT(s.id) as children_count
      FROM parents p
      LEFT JOIN students s ON s.parent_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
    `, [id]);
    
    if (result.rows.length === 0) return null;
    
    const parent = result.rows[0];
    
    const childrenResult = await pool.query(`
      SELECT id, admission_number, first_name, last_name, class_id,
             (SELECT class_name FROM classes WHERE id = students.class_id) as class_name
      FROM students 
      WHERE parent_id = $1 AND LOWER(status) = 'active'
    `, [id]);
    
    return {
      ...parent,
      children: childrenResult.rows.map(c => ({
        ...c,
        full_name: `${c.first_name} ${c.last_name}`
      }))
    };
  }
  
  // Get parent by user ID
  async getParentByUserId(userId) {
    const result = await pool.query(`
      SELECT p.*, u.email, u.first_name, u.last_name
      FROM parents p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = $1
    `, [userId]);
    return result.rows[0] || null;
  }
  
  // Get parent by email
  async getParentByEmail(email) {
    const result = await pool.query(`
      SELECT * FROM parents WHERE email = $1
    `, [email]);
    return result.rows[0] || null;
  }
  
  // Get children for a parent
  async getMyChildren(parentId) {
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
      WHERE s.parent_id = $1 AND LOWER(s.status) = 'active'
      ORDER BY s.first_name, s.last_name
    `, [parentId]);
    return result.rows;
  }
  
  // Get children by parent email (fallback)
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
      WHERE s.parent_email = $1 AND LOWER(s.status) = 'active'
      ORDER BY s.first_name, s.last_name
    `, [email]);
    return result.rows;
  }
  
  // Get parent dashboard stats
  async getParentDashboard(parentId) {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT s.id) as total_children,
        COUNT(DISTINCT g.id) as total_grades,
        COUNT(DISTINCT a.id) as total_attendance,
        COUNT(DISTINCT f.id) as total_fees,
        ROUND(COALESCE(AVG(g.continuous_assessment + g.exam_score), 0), 2) as avg_performance,
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
      WHERE s.parent_id = $1 AND LOWER(s.status) = 'active'
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
  
  // Get child's grades
  async getChildGrades(studentId) {
    const result = await pool.query(`
      SELECT 
        g.*,
        s.first_name,
        s.last_name
      FROM grades g
      JOIN students s ON g.student_id = s.id
      WHERE g.student_id = $1
      ORDER BY g.term, g.created_at
    `, [studentId]);
    return result.rows;
  }
  
  // Get child's attendance
  async getChildAttendance(studentId) {
    const result = await pool.query(`
      SELECT 
        a.id,
        a.date,
        a.status,
        a.term,
        a.term_name,
        a.remarks,
        a.created_at
      FROM attendance a
      WHERE a.student_id = $1
      ORDER BY a.date DESC
      LIMIT 30
    `, [studentId]);
    return result.rows;
  }
  
  // Get child's fees
  async getChildFees(studentId) {
    const result = await pool.query(`
      SELECT 
        f.id,
        f.fee_type,
        f.term,
        f.term_name,
        f.academic_year,
        f.amount,
        f.paid_amount,
        f.balance,
        f.status,
        f.payment_date,
        f.payment_method,
        f.transaction_id,
        f.receipt_number,
        f.created_at,
        s.first_name,
        s.last_name
      FROM fees f
      JOIN students s ON f.student_id = s.id
      WHERE f.student_id = $1
      ORDER BY f.created_at DESC
    `, [studentId]);
    return result.rows;
  }
  
  // Create new parent
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
  
  // Update parent
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
  
  // Delete parent
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
  
  // Soft delete parent
  async deactivateParent(id) {
    const result = await pool.query(`
      UPDATE parents SET is_active = false WHERE id = $1 RETURNING id
    `, [id]);
    return result.rows.length > 0;
  }
  
  // Link parent to student
  async linkParentToStudent(parentId, studentId) {
    const result = await pool.query(`
      UPDATE students SET parent_id = $1 WHERE id = $2 RETURNING id
    `, [parentId, studentId]);
    return result.rows.length > 0;
  }
  
  // Get parent dashboard with full details
  async getParentDashboardDetails(parentId) {
    const parent = await this.getParentById(parentId);
    if (!parent) return null;
    
    const childrenPerformance = [];
    
    for (const child of parent.children) {
      const gradesResult = await pool.query(`
        SELECT * FROM grades 
        WHERE student_id = $1 
        ORDER BY term, created_at DESC
      `, [child.id]);
      
      const average = gradesResult.rows.length > 0 
        ? gradesResult.rows.reduce((sum, g) => sum + (g.continuous_assessment + g.exam_score), 0) / gradesResult.rows.length 
        : 0;
      
      const attendanceResult = await pool.query(`
        SELECT * FROM attendance 
        WHERE student_id = $1 
        ORDER BY date DESC
      `, [child.id]);
      
      const attendanceRate = attendanceResult.rows.length > 0
        ? (attendanceResult.rows.filter(a => LOWER(a.status) === 'present').length / attendanceResult.rows.length) * 100
        : 0;
      
      const feesResult = await pool.query(`
        SELECT SUM(amount) as total_fees, SUM(paid_amount) as total_paid
        FROM fees 
        WHERE student_id = $1
      `, [child.id]);
      
      childrenPerformance.push({
        student_id: child.id,
        student_name: child.full_name,
        class: child.class_name,
        class_id: child.class_id,
        admission_number: child.admission_number,
        average_grade: parseFloat(average).toFixed(2),
        attendance_rate: parseFloat(attendanceRate).toFixed(2),
        total_fees: parseFloat(feesResult.rows[0]?.total_fees || 0),
        total_paid: parseFloat(feesResult.rows[0]?.total_paid || 0),
        balance: parseFloat(feesResult.rows[0]?.total_fees || 0) - parseFloat(feesResult.rows[0]?.total_paid || 0),
        recent_grades: gradesResult.rows.slice(0, 5)
      });
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