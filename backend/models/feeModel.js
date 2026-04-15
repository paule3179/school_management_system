const pool = require('../config/database');

class FeeModel {
  // Get all fee records with filters
  async getAllFees(filters = {}) {
    let query = `
      SELECT 
        f.*,
        s.first_name,
        s.last_name,
        s.admission_number,
        c.name as class_name
      FROM fees f
      JOIN students s ON f.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;
    
    if (filters.student_id) {
      query += ` AND f.student_id = $${paramCount}`;
      values.push(filters.student_id);
      paramCount++;
    }
    if (filters.class_id) {
      query += ` AND s.class_id = $${paramCount}`;
      values.push(filters.class_id);
      paramCount++;
    }
    if (filters.term) {
      query += ` AND f.term = $${paramCount}`;
      values.push(filters.term);
      paramCount++;
    }
    if (filters.academic_year) {
      query += ` AND f.academic_year = $${paramCount}`;
      values.push(filters.academic_year);
      paramCount++;
    }
    if (filters.status) {
      query += ` AND f.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }
    
    query += ` ORDER BY s.last_name, f.term`;
    
    const result = await pool.query(query, values);
    return result.rows;
  }

  // Get student fee summary
  async getStudentFeeSummary(studentId, academicYear) {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_fees,
        COALESCE(SUM(paid_amount), 0) as total_paid,
        COALESCE(SUM(balance), 0) as total_balance,
        COUNT(*) as fee_count
      FROM fees
      WHERE student_id = $1 AND academic_year = $2
    `, [studentId, academicYear]);
    
    const details = await pool.query(`
      SELECT * FROM fees
      WHERE student_id = $1 AND academic_year = $2
      ORDER BY term, fee_type
    `, [studentId, academicYear]);
    
    const studentInfo = await pool.query(`
      SELECT s.first_name, s.last_name, s.admission_number, c.name as class_name
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1
    `, [studentId]);
    
    return {
      student: studentInfo.rows[0] || null,
      summary: result.rows[0],
      details: details.rows
    };
  }

  // Get class fee summary
  async getClassFeeSummary(classId, term, academicYear) {
    const result = await pool.query(`
      SELECT 
        s.id as student_id,
        s.first_name,
        s.last_name,
        s.admission_number,
        COALESCE(SUM(f.amount), 0) as total_fees,
        COALESCE(SUM(f.paid_amount), 0) as total_paid,
        COALESCE(SUM(f.balance), 0) as balance
      FROM students s
      LEFT JOIN fees f ON s.id = f.student_id 
        AND f.term = $2 
        AND f.academic_year = $3
      WHERE s.class_id = $1 AND s.status = 'active'
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number
      ORDER BY s.last_name
    `, [classId, term, academicYear]);
    
    return result.rows;
  }

  // Record fee payment
  async recordPayment(paymentData) {
    const { student_id, fee_type, term, term_name, academic_year, amount, payment_method, transaction_id, recorded_by } = paymentData;
    
    // Check if fee record exists
    const existing = await pool.query(`
      SELECT id, paid_amount, balance, amount as total_amount FROM fees
      WHERE student_id = $1 AND fee_type = $2 AND term = $3 AND academic_year = $4
    `, [student_id, fee_type, term, academic_year]);
    
    let result;
    if (existing.rows.length > 0) {
      // Update existing record
      const newPaidAmount = parseFloat(existing.rows[0].paid_amount) + parseFloat(amount);
      const newBalance = parseFloat(existing.rows[0].total_amount) - newPaidAmount;
      const status = newBalance <= 0 ? 'paid' : 'partial';
      
      result = await pool.query(`
        UPDATE fees 
        SET paid_amount = $1,
            balance = $2,
            status = $3,
            payment_date = CURRENT_DATE,
            payment_method = $4,
            transaction_id = $5,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [newPaidAmount, newBalance, status, payment_method, transaction_id, existing.rows[0].id]);
    } else {
      // Get fee amount from fee_types
      const feeTypeResult = await pool.query(`
        SELECT amount FROM fee_types WHERE name = $1
      `, [fee_type]);
      
      const totalAmount = feeTypeResult.rows.length > 0 ? parseFloat(feeTypeResult.rows[0].amount) : parseFloat(amount);
      const paidAmt = parseFloat(amount);
      const balance = totalAmount - paidAmt;
      const status = balance <= 0 ? 'paid' : 'partial';
      
      // Generate receipt number
      const receiptNumber = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      result = await pool.query(`
        INSERT INTO fees (
          student_id, fee_type, term, term_name, academic_year,
          amount, paid_amount, balance, status, payment_date,
          payment_method, transaction_id, receipt_number, recorded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_DATE, $10, $11, $12, $13)
        RETURNING *
      `, [student_id, fee_type, term, term_name, academic_year, 
          totalAmount, paidAmt, balance, status,
          payment_method, transaction_id, receiptNumber, recorded_by]);
    }
    
    return result.rows[0];
  }

  // Get fee types
  async getFeeTypes() {
    const result = await pool.query(`
      SELECT * FROM fee_types WHERE is_active = true ORDER BY name
    `);
    return result.rows;
  }

  // Get school fee collection summary
  async getSchoolFeeSummary(academicYear) {
    const result = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0) as expected,
        COALESCE(SUM(paid_amount), 0) as collected,
        COALESCE(SUM(balance), 0) as outstanding,
        COUNT(DISTINCT student_id) as paying_students,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as fully_paid,
        COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_paid,
        COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid
      FROM fees
      WHERE academic_year = $1
    `, [academicYear]);
    
    const byTerm = await pool.query(`
      SELECT 
        term,
        term_name,
        COALESCE(SUM(amount), 0) as expected,
        COALESCE(SUM(paid_amount), 0) as collected,
        ROUND(COALESCE(SUM(paid_amount) / NULLIF(SUM(amount), 0) * 100, 0), 2) as percentage
      FROM fees
      WHERE academic_year = $1
      GROUP BY term, term_name
      ORDER BY term
    `, [academicYear]);
    
    return {
      summary: result.rows[0],
      by_term: byTerm.rows
    };
  }

  // Generate receipt
  async generateReceipt(feeId) {
    const result = await pool.query(`
      SELECT 
        f.*,
        s.first_name,
        s.last_name,
        s.admission_number,
        c.name as class_name
      FROM fees f
      JOIN students s ON f.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE f.id = $1
    `, [feeId]);
    
    return result.rows[0];
  }
}

module.exports = new FeeModel();