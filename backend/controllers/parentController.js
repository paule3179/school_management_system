// backend/controllers/parentController.js
const parentModel = require('../models/parentModel');
const pool = require('../config/database');

// ============================================================
// HELPERS
// ============================================================

async function hasAccessToChild(parentId, childId) {
  const result = await pool.query(`
    SELECT 1
    FROM students s
    WHERE s.id = $2
      AND (
        s.parent_id = $1
        OR EXISTS (SELECT 1 FROM parent_students ps WHERE ps.student_id = s.id AND ps.parent_id = $1)
        OR (s.parent_email IS NOT NULL AND s.parent_email = (
          SELECT u.email FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = $1
        ))
      )
  `, [parentId, childId]);
  return result.rows.length > 0;
}

async function getParentIdFromUserId(userId) {
  const result = await pool.query('SELECT id FROM parents WHERE user_id = $1', [userId]);
  if (result.rows.length === 0) return null;
  return result.rows[0].id;
}

/**
 * Helper to safely build GROUP BY queries – prevents the "column must appear in GROUP BY" error
 * @param {string} selectColumns - comma-separated columns (can include aggregates)
 * @param {string} table - table name
 * @param {string} groupByColumns - comma-separated columns for GROUP BY
 * @param {string} whereClause - optional WHERE clause (with placeholders)
 * @param {array} params - parameter values
 * @param {string} orderBy - optional ORDER BY
 * @returns {string} complete SQL query
 */
function buildSafeGroupQuery(selectColumns, table, groupByColumns, whereClause = '', params = [], orderBy = '') {
  let sql = `SELECT ${selectColumns} FROM ${table}`;
  if (whereClause) sql += ` WHERE ${whereClause}`;
  sql += ` GROUP BY ${groupByColumns}`;
  if (orderBy) sql += ` ORDER BY ${orderBy}`;
  return sql;
}

// ============================================================
// CONTROLLER
// ============================================================

const parentController = {

  // GET /api/parents/notifications
  async getNotifications(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const result = await pool.query(
        `SELECT 
          n.id,
          n.title,
          n.message,
          n.type,
          n.is_read,
          n.read_at,
          n.created_at
        FROM notifications n
        WHERE n.user_id = $1
        ORDER BY n.created_at DESC
        LIMIT 50`,
        [userId]
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/messages
  async getMessages(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const result = await pool.query(
        `SELECT 
          m.id,
          m.sender_id,
          m.sender_type,
          m.receiver_id,
          m.receiver_type,
          m.subject,
          m.message,
          m.status,
          m.priority,
          m.sent_at,
          m.read_at,
          COALESCE(m.is_read, false) as is_read,
          u.first_name as sender_first_name,
          u.last_name as sender_last_name,
          u.email as sender_email
        FROM messages m
        LEFT JOIN users u ON m.sender_id = u.id
        WHERE m.receiver_id = $1 AND m.receiver_type = 'parent'
        ORDER BY m.sent_at DESC
        LIMIT 50`,
        [userId]
      );

      res.json({
        success: true,
        data: result.rows,
        count: result.rows.length
      });
    } catch (error) {
      console.error('Get messages error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/profile
  async getProfile(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const result = await pool.query(
        `SELECT 
          u.id as user_id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone,
          u.role,
          u.status,
          u.profile_picture,
          p.id as parent_id,
          p.occupation,
          p.address,
          p.relationship,
          p.is_active
        FROM users u
        JOIN parents p ON u.id = p.user_id
        WHERE u.id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Parent profile not found' });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents
  async getAllParents(req, res) {
    try {
      const parents = await parentModel.getAllParents();
      res.json({
        success: true,
        count: parents.length,
        data: parents
      });
    } catch (error) {
      console.error('Get all parents error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/:id
  async getParentById(req, res) {
    try {
      const parent = await parentModel.getParentById(req.params.id);
      if (!parent) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }
      res.json({ success: true, data: parent });
    } catch (error) {
      console.error('Get parent by ID error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/parents
  async createParent(req, res) {
    try {
      const newParent = await parentModel.createParent(req.body);
      res.status(201).json({
        success: true,
        data: newParent,
        message: 'Parent created successfully. Temporary password generated.'
      });
    } catch (error) {
      console.error('Create parent error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // PUT /api/parents/:id
  async updateParent(req, res) {
    try {
      const updated = await parentModel.updateParent(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }
      res.json({ success: true, data: updated, message: 'Parent updated successfully' });
    } catch (error) {
      console.error('Update parent error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // DELETE /api/parents/:id
  async deleteParent(req, res) {
    try {
      const deleted = await parentModel.deleteParent(req.params.id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Parent not found or cannot be deleted' });
      }
      res.json({ success: true, message: 'Parent deleted successfully' });
    } catch (error) {
      console.error('Delete parent error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/:id/dashboard
  async getParentDashboard(req, res) {
    try {
      const parentId = req.params.id;
      const dashboardData = await parentModel.getParentDashboardDetails(parentId);
      if (!dashboardData) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }
      res.json({ success: true, data: dashboardData });
    } catch (error) {
      console.error('Get parent dashboard error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/children
  async getMyChildren(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent record not found for this user' });
      }

      const children = await parentModel.getMyChildren(parentId);
      res.json({
        success: true,
        data: children,
        count: children.length
      });
    } catch (error) {
      console.error('Get my children error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/child/:childId/performance
  async getChildPerformance(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }

      const hasAccess = await hasAccessToChild(parentId, childId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'You do not have access to this child' });
      }

      const performanceData = await parentModel.getChildPerformance(childId);
      if (!performanceData) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      // Get all subjects with grades for breakdown  
      let subjects = [];
      try {
        const allGrades = await pool.query(`
          SELECT
            g.subject,
            g.continuous_assessment,
            g.exam_score,
            g.continuous_assessment + g.exam_score as total,
            g.grade,
            g.term,
            g.academic_year,
            g.id as grade_id
          FROM grades g
          WHERE g.student_id = $1
          ORDER BY g.subject, g.term DESC
        `, [childId]);

        const subjectMap = {};
        for (const g of allGrades.rows) {
          if (!subjectMap[g.subject]) {
            subjectMap[g.subject] = {
              name: g.subject,
              subject_id: g.grade_id,
              score: Math.round(parseFloat(g.total) || 0),
              grade: g.grade || '—',
              term: g.term,
              academic_year: g.academic_year
            };
          }
        }
        subjects = Object.values(subjectMap);
      } catch (gradeErr) {
        console.warn('Grades query failed for child', childId, gradeErr.message);
      }

      const data = {
        student: performanceData.student,
        performance: {
          ...performanceData.performance,
          subjects: subjects,
          rank: 'N/A',
          comment: null
        },
        fees: performanceData.fees,
        recent_grades: performanceData.recent_grades
      };

      res.json({ success: true, data });
    } catch (error) {
      console.error('Get child performance error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/child/:childId/grades
  async getChildGrades(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }

      const hasAccess = await hasAccessToChild(parentId, childId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'You do not have access to this child' });
      }

      const grades = await parentModel.getChildGrades(childId);
      res.json({ success: true, data: grades, count: grades.length });
    } catch (error) {
      console.error('Get child grades error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/child/:childId/attendance
  async getChildAttendance(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }

      const hasAccess = await hasAccessToChild(parentId, childId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'You do not have access to this child' });
      }

      const attendance = await parentModel.getChildAttendance(childId);
      res.json({ success: true, data: attendance, count: attendance.length });
    } catch (error) {
      console.error('Get child attendance error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/child/:childId/fees
  async getChildFees(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }

      const hasAccess = await hasAccessToChild(parentId, childId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'You do not have access to this child' });
      }

      const fees = await parentModel.getChildFees(childId);
      res.json({ success: true, data: fees, count: fees.length });
    } catch (error) {
      console.error('Get child fees error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/child/:childId/subjects
  async getChildSubjects(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }

      const hasAccess = await hasAccessToChild(parentId, childId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'You do not have access to this child' });
      }

      const subjects = await parentModel.getChildSubjects(childId);
      res.json({ success: true, data: subjects });
    } catch (error) {
      console.error('Get child subjects error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/child/:childId/teachers
  async getChildTeachers(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }

      const hasAccess = await hasAccessToChild(parentId, childId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'You do not have access to this child' });
      }

      const teachers = await parentModel.getChildTeachers(childId);
      res.json({ success: true, data: teachers });
    } catch (error) {
      console.error('Get child teachers error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // POST /api/parents/child/:childId/pay
  async payChildFee(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;
      const { fee_type, amount, payment_method, transaction_id, term, term_name, academic_year } = req.body;

      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }

      const hasAccess = await hasAccessToChild(parentId, childId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'You do not have access to this child' });
      }

      if (!fee_type || !amount || !payment_method) {
        return res.status(400).json({
          success: false,
          error: 'fee_type, amount, and payment_method are required'
        });
      }

      const payAmount = parseFloat(amount);
      if (isNaN(payAmount) || payAmount <= 0) {
        return res.status(400).json({ success: false, error: 'Invalid payment amount' });
      }

      const payTerm = term || 1;
      const payTermName = term_name || 'Term 1';
      const payAcademicYear = academic_year || '2024-2025';
      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const existing = await pool.query(`
        SELECT id, paid_amount, balance, amount as total_amount FROM fees
        WHERE student_id = $1 AND fee_type = $2 AND term = $3 AND academic_year = $4
      `, [childId, fee_type, payTerm, payAcademicYear]);

      if (existing.rows.length > 0) {
        const existingPaid = parseFloat(existing.rows[0].paid_amount) || 0;
        const existingTotal = parseFloat(existing.rows[0].total_amount) || payAmount;
        const newPaidAmount = existingPaid + payAmount;
        const newBalance = Math.max(0, existingTotal - newPaidAmount);
        const status = newBalance <= 0 ? 'paid' : 'partial';

        const result = await pool.query(`
          UPDATE fees
          SET paid_amount = $1,
              balance = $2,
              status = $3,
              payment_date = CURRENT_DATE,
              payment_method = $4,
              transaction_id = COALESCE($5, transaction_id),
              receipt_number = $6,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $7
          RETURNING *
        `, [newPaidAmount, newBalance, status, payment_method, transaction_id, receiptNumber, existing.rows[0].id]);

        res.json({
          success: true,
          data: result.rows[0],
          receipt: {
            receipt_number: receiptNumber,
            amount_paid: payAmount,
            payment_method,
            payment_date: new Date().toISOString()
          },
          message: 'Payment recorded successfully'
        });
      } else {
        const result = await pool.query(`
          INSERT INTO fees (
            student_id, fee_type, term, term_name, academic_year,
            amount, paid_amount, balance, status, payment_date,
            payment_method, transaction_id, receipt_number, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, $10, $11, $12, $13)
          RETURNING *
        `, [childId, fee_type, payTerm, payTermName, payAcademicYear,
            payAmount, payAmount, 0, 'paid',
            payment_method, transaction_id, receiptNumber, null]);

        res.json({
          success: true,
          data: result.rows[0],
          receipt: {
            receipt_number: receiptNumber,
            amount_paid: payAmount,
            payment_method,
            payment_date: new Date().toISOString()
          },
          message: 'Payment recorded successfully'
        });
      }
    } catch (error) {
      console.error('Pay child fee error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/dashboard-summary
  async getDashboardSummary(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent record not found' });
      }

      const children = await parentModel.getMyChildren(parentId);

      let totalAvgScore = 0, totalAttRate = 0, childCount = 0;
      let totalFeeBalance = 0, totalFeePaid = 0, totalFeeAmount = 0;

      for (const child of children) {
        childCount++;
        const gradesRes = await pool.query(`
          SELECT COALESCE(AVG(continuous_assessment + exam_score), 0) as avg_score
          FROM grades WHERE student_id = $1
        `, [child.id]);
        totalAvgScore += parseFloat(gradesRes.rows[0]?.avg_score) || 0;

        const attRes = await pool.query(`
          SELECT COUNT(*) as total,
                 SUM(CASE WHEN LOWER(status) = 'present' THEN 1 ELSE 0 END) as present
          FROM attendance WHERE student_id = $1
        `, [child.id]);
        const attTotal = parseInt(attRes.rows[0]?.total) || 0;
        const attPresent = parseInt(attRes.rows[0]?.present) || 0;
        totalAttRate += attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 0;

        const feesRes = await pool.query(`
          SELECT COALESCE(SUM(amount), 0) as total_amount,
                 COALESCE(SUM(paid_amount), 0) as total_paid,
                 COALESCE(SUM(balance), 0) as total_balance
          FROM fees WHERE student_id = $1
        `, [child.id]);
        totalFeeAmount += parseFloat(feesRes.rows[0]?.total_amount) || 0;
        totalFeePaid += parseFloat(feesRes.rows[0]?.total_paid) || 0;
        totalFeeBalance += parseFloat(feesRes.rows[0]?.total_balance) || 0;
      }

      const avgPerformance = childCount > 0 ? Math.round(totalAvgScore / childCount) : 0;
      const avgAttendance = childCount > 0 ? Math.round(totalAttRate / childCount) : 0;

      const notifResult = await pool.query(`
        SELECT id, title, message, type, is_read, created_at
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]);
      const unreadCount = notifResult.rows.filter(n => !n.is_read).length;

      res.json({
        success: true,
        data: {
          children: children,
          stats: {
            total_children: children.length,
            avg_performance: avgPerformance,
            avg_attendance: avgAttendance,
            unread_notifications: unreadCount,
            total_notifications: notifResult.rows.length
          },
          fees_summary: {
            total_fees: totalFeeAmount,
            total_paid: totalFeePaid,
            total_balance: totalFeeBalance
          },
          notifications: notifResult.rows
        }
      });
    } catch (error) {
      console.error('Get dashboard summary error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/parents/child/:childId/overview
  async getChildOverview(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User not authenticated' });
      }

      const parentId = await getParentIdFromUserId(userId);
      if (!parentId) {
        return res.status(404).json({ success: false, error: 'Parent not found' });
      }

      const hasAccess = await hasAccessToChild(parentId, childId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'You do not have access to this child' });
      }

      const studentResult = await pool.query(`
        SELECT
          s.id,
          s.admission_number,
          s.first_name,
          s.last_name,
          s.class_id,
          c.class_name,
          c.level,
          (SELECT COUNT(*) FROM grades WHERE student_id = s.id) as grades_count,
          (SELECT COUNT(*) FROM attendance WHERE student_id = s.id) as attendance_count
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE s.id = $1
      `, [childId]);

      if (studentResult.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Student not found' });
      }

      const student = studentResult.rows[0];
      let subjects = [];
      let teachers = [];

      if (student.class_id) {
        const subjectsResult = await pool.query(`
          SELECT s.id, s.name, s.code
          FROM class_subjects cs
          JOIN subjects s ON cs.subject_id = s.id
          WHERE cs.class_id = $1
          ORDER BY s.name
        `, [student.class_id]);
        subjects = subjectsResult.rows;

        const teachersResult = await pool.query(`
          SELECT DISTINCT
            t.id,
            t.first_name,
            t.last_name,
            t.email,
            t.subject_specialty
          FROM teacher_subjects ts
          JOIN teachers t ON ts.teacher_id = t.id
          JOIN class_subjects cs ON ts.subject_id = cs.subject_id
          WHERE cs.class_id = $1
          ORDER BY t.first_name, t.last_name
        `, [student.class_id]);
        teachers = teachersResult.rows;
      }

      res.json({
        success: true,
        data: { student, subjects, teachers }
      });
    } catch (error) {
      console.error('Get child overview error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

module.exports = parentController;