const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/auth');
const pool = require('../config/database');

// Apply authentication to all routes
router.use(verifyToken, isAdmin);

// ============================================
// GET FEE TYPES
// ============================================
router.get('/types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, amount, category, description
      FROM fee_settings
      WHERE status = 'active'
      ORDER BY name
    `);
    
    if (result.rows.length === 0) {
      // Return default fee types
      return res.json({
        success: true,
        data: [
          { id: 1, name: 'School Fees', amount: 350, category: 'academic', description: 'Core tuition fees' },
          { id: 2, name: 'PTA Levy', amount: 50, category: 'development', description: 'Parent-Teacher Association' },
          { id: 3, name: 'Development Levy', amount: 100, category: 'development', description: 'School infrastructure' },
          { id: 4, name: 'Examination Fees', amount: 75, category: 'academic', description: 'Termly examinations' }
        ]
      });
    }
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching fee types:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET FEE SETTINGS
// ============================================
router.get('/settings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, amount, category, description, status, created_at, updated_at
      FROM fee_settings
      ORDER BY name
    `);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: [
          { id: 1, name: 'School Fees', amount: 350, category: 'academic', description: 'Core tuition fees' },
          { id: 2, name: 'PTA Levy', amount: 50, category: 'development', description: 'Parent-Teacher Association' },
          { id: 3, name: 'Development Levy', amount: 100, category: 'development', description: 'School infrastructure' },
          { id: 4, name: 'Examination Fees', amount: 75, category: 'academic', description: 'Termly examinations' }
        ]
      });
    }
    
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching fee settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// CREATE FEE SETTING
// ============================================
router.post('/settings', isAdmin, async (req, res) => {
  try {
    const { name, amount, description, category } = req.body;
    
    if (!name || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Name and amount are required'
      });
    }
    
    const result = await pool.query(`
      INSERT INTO fee_settings (name, amount, description, category, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
      RETURNING *
    `, [name, amount, description || null, category || 'other']);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Fee setting created successfully'
    });
  } catch (error) {
    console.error('Error creating fee setting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// UPDATE FEE SETTING
// ============================================
router.put('/settings/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, description, category } = req.body;
    
    const result = await pool.query(`
      UPDATE fee_settings 
      SET name = COALESCE($1, name),
          amount = COALESCE($2, amount),
          description = COALESCE($3, description),
          category = COALESCE($4, category),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [name, amount, description, category, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Fee setting not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Fee setting updated successfully'
    });
  } catch (error) {
    console.error('Error updating fee setting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// DELETE FEE SETTING
// ============================================
router.delete('/settings/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM fee_settings WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Fee setting not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Fee setting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting fee setting:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET STUDENT FEE SUMMARY
// ============================================
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academic_year } = req.query;
    
    // Get student info
    const studentResult = await pool.query(`
      SELECT s.id, s.first_name, s.last_name, s.admission_number, c.class_name
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1
    `, [studentId]);
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }
    
    const student = studentResult.rows[0];
    
    // Get fee summary
    const summaryResult = await pool.query(`
      SELECT 
        COALESCE(SUM(fees), 0) as total_fees,
        COALESCE(SUM(paid), 0) as total_paid,
        COALESCE(SUM(fees) - SUM(paid), 0) as total_balance
      FROM fee_transactions
      WHERE student_id = $1 AND academic_year = $2
    `, [studentId, academic_year || '2024-2025']);
    
    res.json({
      success: true,
      data: {
        student: student,
        summary: summaryResult.rows[0] || { total_fees: 0, total_paid: 0, total_balance: 0 }
      }
    });
  } catch (error) {
    console.error('Error fetching student fee summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// RECORD PAYMENT
// ============================================
router.post('/payment', isAdmin, async (req, res) => {
  try {
    const { 
      student_id, fee_type, amount, payment_method, 
      transaction_id, term, term_name, academic_year, recorded_by 
    } = req.body;
    
    if (!student_id || !fee_type || !amount || !payment_method) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    const receipt_number = `RCP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const result = await pool.query(`
      INSERT INTO fee_transactions (
        student_id, fee_type, amount, payment_method, transaction_id,
        term, term_name, academic_year, receipt_number, recorded_by,
        payment_date, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), 'completed', NOW())
      RETURNING *
    `, [
      student_id, fee_type, amount, payment_method, transaction_id || null,
      term || 1, term_name || 'Term 1', academic_year || '2024-2025',
      receipt_number, recorded_by || 1
    ]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Payment recorded successfully'
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET SCHOOL FEE SUMMARY
// ============================================
router.get('/school-summary', async (req, res) => {
  try {
    const { academic_year } = req.query;
    const year = academic_year || '2024-2025';
    
    const summaryResult = await pool.query(`
      SELECT 
        COALESCE(SUM(fees), 0) as expected,
        COALESCE(SUM(paid), 0) as collected,
        COALESCE(SUM(fees) - SUM(paid), 0) as outstanding
      FROM fee_transactions
      WHERE academic_year = $1
    `, [year]);
    
    res.json({
      success: true,
      data: {
        summary: summaryResult.rows[0] || { expected: 0, collected: 0, outstanding: 0 },
        academic_year: year
      }
    });
  } catch (error) {
    console.error('Error fetching school fee summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// GET CLASS FEE SUMMARY
// ============================================
router.get('/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { term, academic_year } = req.query;
    
    const result = await pool.query(`
      SELECT 
        s.id as student_id,
        s.admission_number,
        s.first_name,
        s.last_name,
        c.class_name,
        COALESCE(SUM(ft.fees), 0) as total_fees,
        COALESCE(SUM(ft.paid), 0) as total_paid,
        COALESCE(SUM(ft.fees) - SUM(ft.paid), 0) as balance
      FROM students s
      LEFT JOIN classes c ON s.class_id = c.id
      LEFT JOIN fee_transactions ft ON s.id = ft.student_id AND ft.academic_year = $1
      WHERE s.class_id = $2 AND s.status = 'Active'
      GROUP BY s.id, s.admission_number, s.first_name, s.last_name, c.class_name
      ORDER BY s.last_name, s.first_name
    `, [academic_year || '2024-2025', classId]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching class fee summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
