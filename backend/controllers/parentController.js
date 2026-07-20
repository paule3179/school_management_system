// backend/controllers/parentController.js
const parentModel = require('../models/parentModel');
const pool = require('../config/database');

const parentController = {
  // GET /api/parents/notifications - Get notifications for logged-in parent
  async getNotifications(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
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
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/messages - Get messages for logged-in parent
  async getMessages(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
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
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/profile - Get parent profile for logged-in parent
  async getProfile(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
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
        return res.status(404).json({
          success: false,
          error: 'Parent profile not found'
        });
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents - Get all parents
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
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/parents/:id - Get single parent
  async getParentById(req, res) {
    try {
      const parent = await parentModel.getParentById(req.params.id);
      if (!parent) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }
      res.json({
        success: true,
        data: parent
      });
    } catch (error) {
      console.error('Get parent by ID error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // POST /api/parents - Create parent (with auto-generated parent_id)
  async createParent(req, res) {
    try {
      const required = ['first_name', 'last_name', 'phone', 'email'];
      const missing = required.filter(field => !req.body[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`
        });
      }
      
      const countResult = await pool.query("SELECT COUNT(*) as count FROM parents");
      const count = parseInt(countResult.rows[0].count) + 1;
      const parentIdValue = `PARENT${count}`;
      
      let password = req.body.password;
      if (!password) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        password = '';
        for (let i = 0; i < 8; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }
      
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const result = await pool.query(`
        INSERT INTO parents (
          parent_id, 
          first_name, 
          last_name, 
          phone, 
          email, 
          password, 
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, true)
        RETURNING id, parent_id, first_name, last_name, email, phone
      `, [parentIdValue, req.body.first_name, req.body.last_name, req.body.phone, req.body.email, hashedPassword]);
      
      const newParent = result.rows[0];
      
      if (req.body.email) {
        try {
          const { sendEmail, getParentWelcomeTemplate } = require('../config/email');
          const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
          
          await sendEmail(
            req.body.email,
            'Welcome to Parent Portal - School Management System',
            getParentWelcomeTemplate(
              `${req.body.first_name} ${req.body.last_name}`,
              'Your Child',
              'N/A',
              parentIdValue,
              password,
              loginUrl
            )
          );
          console.log('Welcome email sent to parent');
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
      }
      
      res.status(201).json({
        success: true,
        message: 'Parent created successfully. Login credentials sent to email.',
        data: newParent,
        temp_password: password
      });
      
    } catch (error) {
      console.error('Create parent error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // PUT /api/parents/:id - Update parent
  async updateParent(req, res) {
    try {
      // Enforce required phone value (no empty string / whitespace)
      const phone = req.body?.phone;
      const phoneStr = typeof phone === 'string' ? phone.trim() : phone;

      // If your frontend always sends phone on update, treat it as required.
      // If it sometimes omits phone, uncomment the alternative validation below.
      const phoneMissing = phoneStr === undefined || phoneStr === null || phoneStr === '';
      if (phoneMissing) {
        return res.status(400).json({
          success: false,
          error: 'Phone is required'
        });
      }

      const updatedParent = await parentModel.updateParent(req.params.id, req.body);
      if (!updatedParent) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }
      res.json({
        success: true,
        data: updatedParent
      });
    } catch (error) {
      console.error('Update parent error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // DELETE /api/parents/:id - Delete parent
  async deleteParent(req, res) {
    try {
      const deleted = await parentModel.deleteParent(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }
      res.json({
        success: true,
        message: 'Parent deleted successfully'
      });
    } catch (error) {
      console.error('Delete parent error:', error);
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  },
  
  // GET /api/parents/:id/dashboard - Get parent dashboard
  async getParentDashboard(req, res) {
    try {
      const dashboard = await parentModel.getParentDashboard(req.params.id);
      if (!dashboard) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Get parent dashboard error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/children - Get all children of logged-in parent
  async getMyChildren(req, res) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const parentResult = await pool.query('SELECT id FROM parents WHERE user_id = $1', [userId]);
      if (parentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Parent not found'
        });
      }

      const parentId = parentResult.rows[0].id;

      const childrenResult = await pool.query(`
        SELECT DISTINCT
          s.id, 
          s.admission_number,
          s.first_name, 
          s.last_name, 
          s.class_id, 
          c.class_name,
          c.level,
          s.date_of_birth,
          s.gender,
          s.status
        FROM students s
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE LOWER(s.status) = 'active'
          AND (
            -- direct link
            s.parent_id = $1
            OR
            -- junction-table link
            EXISTS (
              SELECT 1 FROM parent_students ps
              WHERE ps.student_id = s.id
                AND ps.parent_id = $1
            )
            OR
            -- email link (email is stored in users table, not parents)
            s.parent_email IS NOT NULL
              AND s.parent_email = (
                SELECT u.email FROM parents p
                JOIN users u ON p.user_id = u.id
                WHERE p.id = $1
              )
          )
        ORDER BY s.first_name, s.last_name
      `, [parentId]);


      let finalChildren = childrenResult.rows;
      if (finalChildren.length === 0) {
        const parentEmailRes = await pool.query(
          `SELECT u.email 
           FROM parents p 
           JOIN users u ON p.user_id = u.id 
           WHERE p.id = $1`,
          [parentId]
        );
        const parentEmail = parentEmailRes.rows[0]?.email;

        if (parentEmail) {
          const emailChildrenResult = await pool.query(`
            SELECT 
              s.id, 
              s.admission_number,
              s.first_name, 
              s.last_name, 
              s.class_id, 
              c.class_name,
              c.level,
              s.date_of_birth,
              s.gender,
              s.status
            FROM students s
            LEFT JOIN classes c ON s.class_id = c.id
            WHERE s.parent_email = $1 AND LOWER(s.status) = 'active'
            ORDER BY s.first_name, s.last_name
          `, [parentEmail]);

          finalChildren = emailChildrenResult.rows;
        }
      }

      res.json({
        success: true,
        data: finalChildren,
        count: finalChildren.length
      });

    } catch (error) {
      console.error('Get my children error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/child/:childId/performance - Get child performance summary (FIXED)
  async getChildPerformance(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Verify parent has access to this child
      const parentResult = await pool.query(
        `SELECT id FROM parents WHERE user_id = $1`,
        [userId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Parent not found'
        });
      }

      const parentId = parentResult.rows[0].id;

      // Check if child belongs to this parent
      const childCheck = await pool.query(
        `SELECT id FROM parent_students WHERE parent_id = $1 AND student_id = $2`,
        [parentId, childId]
      );

      if (childCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this child'
        });
      }

      // Get child info
      const childResult = await pool.query(`
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
      `, [childId]);

      if (childResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      const child = childResult.rows[0];

      // Get grades - FIXED: removed created_at
      const gradesResult = await pool.query(`
        SELECT 
          COALESCE(AVG(continuous_assessment + exam_score), 0) as average,
          COUNT(*) as subject_count
        FROM grades 
        WHERE student_id = $1
      `, [childId]);

      const average = parseFloat(gradesResult.rows[0]?.average) || 0;
      const subjectCount = parseInt(gradesResult.rows[0]?.subject_count) || 0;

      // Get attendance - FIXED: removed created_at
      const attendanceResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN LOWER(status) = 'present' THEN 1 ELSE 0 END) as present,
          SUM(CASE WHEN LOWER(status) = 'absent' THEN 1 ELSE 0 END) as absent,
          SUM(CASE WHEN LOWER(status) = 'late' THEN 1 ELSE 0 END) as late
        FROM attendance 
        WHERE student_id = $1
      `, [childId]);

      const total = parseInt(attendanceResult.rows[0]?.total) || 0;
      const present = parseInt(attendanceResult.rows[0]?.present) || 0;
      const absent = parseInt(attendanceResult.rows[0]?.absent) || 0;
      const late = parseInt(attendanceResult.rows[0]?.late) || 0;
      const attendanceRate = total > 0 ? Math.round((present / total) * 100) : 0;

      // Get fees summary
      const feesResult = await pool.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_fees,
          COALESCE(SUM(paid_amount), 0) as total_paid,
          COALESCE(SUM(amount) - SUM(paid_amount), 0) as balance
        FROM fees 
        WHERE student_id = $1
      `, [childId]);

      const totalFees = parseFloat(feesResult.rows[0]?.total_fees) || 0;
      const totalPaid = parseFloat(feesResult.rows[0]?.total_paid) || 0;
      const balance = parseFloat(feesResult.rows[0]?.balance) || 0;

      // Get recent grades - FIXED: removed created_at
      const recentGrades = await pool.query(`
        SELECT 
          subject,
          continuous_assessment,
          exam_score,
          continuous_assessment + exam_score as total,
          grade,
          term,
          academic_year
        FROM grades 
        WHERE student_id = $1
        ORDER BY term DESC
        LIMIT 5
      `, [childId]);

      res.json({
        success: true,
        data: {
          student: child,
          performance: {
            average_score: Math.round(average),
            subject_count: subjectCount,
            attendance_rate: attendanceRate,
            total_days: total,
            present_days: present,
            absent_days: absent,
            late_days: late
          },
          fees: {
            total_fees: totalFees,
            total_paid: totalPaid,
            balance: balance
          },
          recent_grades: recentGrades.rows
        }
      });

    } catch (error) {
      console.error('Get child performance error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/child/:childId/grades - Get child's grades (FIXED)
  async getChildGrades(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const gradesResult = await pool.query(`
        SELECT 
          g.id,
          g.subject,
          g.continuous_assessment,
          g.exam_score,
          g.continuous_assessment + g.exam_score as total,
          g.grade,
          g.term,
          g.academic_year
        FROM grades g
        WHERE g.student_id = $1
        ORDER BY g.term, g.subject
      `, [childId]);

      res.json({
        success: true,
        data: gradesResult.rows,
        count: gradesResult.rows.length
      });

    } catch (error) {
      console.error('Get child grades error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/child/:childId/attendance - Get child's attendance (FIXED)
  async getChildAttendance(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const attendanceResult = await pool.query(`
        SELECT 
          a.id,
          a.date,
          a.status,
          a.term,
          a.term_name,
          a.remarks
        FROM attendance a
        WHERE a.student_id = $1
        ORDER BY a.date DESC
        LIMIT 30
      `, [childId]);

      res.json({
        success: true,
        data: attendanceResult.rows,
        count: attendanceResult.rows.length
      });

    } catch (error) {
      console.error('Get child attendance error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/child/:childId/fees - Get child's fees
  async getChildFees(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const feesResult = await pool.query(`
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
          f.receipt_number
        FROM fees f
        WHERE f.student_id = $1
        ORDER BY f.payment_date DESC
      `, [childId]);

      res.json({
        success: true,
        data: feesResult.rows,
        count: feesResult.rows.length
      });

    } catch (error) {
      console.error('Get child fees error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/child/:childId/subjects - Get subjects for a child
  async getChildSubjects(req, res) {
    try {
      const { childId } = req.params;
      
      const childResult = await pool.query(
        'SELECT class_id FROM students WHERE id = $1',
        [childId]
      );

      if (childResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      const classId = childResult.rows[0].class_id;
      if (!classId) {
        return res.json({
          success: true,
          data: []
        });
      }

      const subjectsResult = await pool.query(`
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

      res.json({
        success: true,
        data: subjectsResult.rows
      });
    } catch (error) {
      console.error('Get child subjects error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/child/:childId/teachers - Get teachers for a child's subjects
  async getChildTeachers(req, res) {
    try {
      const { childId } = req.params;

      const childResult = await pool.query(
        'SELECT class_id FROM students WHERE id = $1',
        [childId]
      );

      if (childResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      const classId = childResult.rows[0].class_id;
      if (!classId) {
        return res.json({
          success: true,
          data: []
        });
      }

      const teachersResult = await pool.query(`
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

      res.json({
        success: true,
        data: teachersResult.rows
      });
    } catch (error) {
      console.error('Get child teachers error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // POST /api/parents/child/:childId/pay - Parent pays fee for child
  async payChildFee(req, res) {
    try {
      const { childId } = req.params;
      const userId = req.user?.id;
      const { fee_type, amount, payment_method, transaction_id, term, term_name, academic_year } = req.body;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Verify parent has access to this child
      const parentResult = await pool.query(
        `SELECT id FROM parents WHERE user_id = $1`,
        [userId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Parent not found'
        });
      }

      const parentId = parentResult.rows[0].id;

      // Check if child belongs to this parent
      const childCheck = await pool.query(
        `SELECT id FROM parent_students WHERE parent_id = $1 AND student_id = $2`,
        [parentId, childId]
      );

      if (childCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'You do not have access to this child'
        });
      }

      if (!fee_type || !amount || !payment_method) {
        return res.status(400).json({
          success: false,
          error: 'fee_type, amount, and payment_method are required'
        });
      }

      const payAmount = parseFloat(amount);
      if (isNaN(payAmount) || payAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment amount'
        });
      }

      const payTerm = term || 1;
      const payTermName = term_name || 'Term 1';
      const payAcademicYear = academic_year || '2024-2025';

      // Check if fee record exists
      const existing = await pool.query(`
        SELECT id, paid_amount, balance, amount as total_amount FROM fees
        WHERE student_id = $1 AND fee_type = $2 AND term = $3 AND academic_year = $4
      `, [childId, fee_type, payTerm, payAcademicYear]);

      const receiptNumber = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      if (existing.rows.length > 0) {
        // Update existing record
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
        // Create new fee record
        const status = 'paid';
        const balance = 0;

        const result = await pool.query(`
          INSERT INTO fees (
            student_id, fee_type, term, term_name, academic_year,
            amount, paid_amount, balance, status, payment_date,
            payment_method, transaction_id, receipt_number, recorded_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, $10, $11, $12, $13)
          RETURNING *
        `, [childId, fee_type, payTerm, payTermName, payAcademicYear,
            payAmount, payAmount, balance, status,
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
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  // GET /api/parents/child/:childId/overview - Get complete child overview
  async getChildOverview(req, res) {
    try {
      const { childId } = req.params;

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
        return res.status(404).json({
          success: false,
          error: 'Student not found'
        });
      }

      const student = studentResult.rows[0];
      const classId = student.class_id;

      let subjects = [];
      let teachers = [];

      if (classId) {
        const subjectsResult = await pool.query(`
          SELECT 
            s.id,
            s.name,
            s.code
          FROM class_subjects cs
          JOIN subjects s ON cs.subject_id = s.id
          WHERE cs.class_id = $1
          ORDER BY s.name
        `, [classId]);
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
        `, [classId]);
        teachers = teachersResult.rows;
      }

      if (!classId) {
        const fallbackClassResult = await pool.query(`
          SELECT DISTINCT cs.class_id
          FROM class_students cs
          WHERE cs.student_id = $1 AND cs.academic_year = COALESCE($2, '2024-2025')
          LIMIT 1
        `, [childId, req.query.academic_year || null]);

        if (fallbackClassResult.rows.length > 0) {
          const fallbackClassId = fallbackClassResult.rows[0].class_id;

          const subjectsResult = await pool.query(`
            SELECT 
              s.id,
              s.name,
              s.code
            FROM class_subjects cs
            JOIN subjects s ON cs.subject_id = s.id
            WHERE cs.class_id = $1
            ORDER BY s.name
          `, [fallbackClassId]);
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
          `, [fallbackClassId]);
          teachers = teachersResult.rows;

          const classMeta = await pool.query(`
            SELECT id, class_name, level
            FROM classes
            WHERE id = $1
          `, [fallbackClassId]);

          if (classMeta.rows.length > 0) {
            student.class_id = fallbackClassId;
            student.class_name = classMeta.rows[0].class_name;
            student.level = classMeta.rows[0].level;
          }
        }
      }

      res.json({
        success: true,
        data: {
          student,
          subjects,
          teachers
        }
      });
    } catch (error) {
      console.error('Get child overview error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

module.exports = parentController;