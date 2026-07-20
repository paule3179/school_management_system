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
        c.class_name as class_name
      FROM fees f
      JOIN students s ON f.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;
    
    const values = [];
    let paramCount = 1;
    
    if (filters.student_id) {
      if (Array.isArray(filters.student_id)) {
        query += ` AND f.student_id = ANY($${paramCount}::int[])`;
        values.push(filters.student_id);
      } else {
        query += ` AND f.student_id = $${paramCount}`;
        values.push(filters.student_id);
      }
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

  // Get class fee summary
  async getClassFeeSummary(classId, term, academicYear, userContext = null) {
    // If parent: restrict to allowed students only
    const isParent = userContext?.role === 'parent';
    const allowedStudentIds = Array.isArray(userContext?.allowedStudentIds)
      ? userContext.allowedStudentIds.map(id => parseInt(id)).filter(Number.isFinite)
      : [];

    const params = [classId, term, academicYear];
    let studentFilterSQL = '';

    if (isParent) {
      // If no allowed students, return empty list quickly.
      if (allowedStudentIds.length === 0) return [];
      params.push(allowedStudentIds);
      studentFilterSQL = ` AND s.id = ANY($${params.length}::int[]) `;
    }

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
      WHERE s.class_id = $1 AND s.status = 'active' ${studentFilterSQL}
      GROUP BY s.id, s.first_name, s.last_name, s.admission_number
      ORDER BY s.last_name
    `, params);

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
      SELECT s.first_name, s.last_name, s.admission_number, c.class_name as class_name
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
      
      const receiptNumber = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;
      
      result = await pool.query(`
        UPDATE fees 
        SET paid_amount = $1,
            balance = $2,
            status = $3,
            payment_date = CURRENT_DATE,
            payment_method = $4,
            transaction_id = $5,
            receipt_number = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `, [newPaidAmount, newBalance, status, payment_method, transaction_id, receiptNumber, existing.rows[0].id]);
    } else {
      // Create new fee record
      const totalAmount = parseFloat(amount);
      const paidAmt = parseFloat(amount);
      const balance = 0;
      const status = 'paid';
      
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
    try {
      // First try to get from fee_settings table
      const settingsResult = await pool.query(`
        SELECT id, name, amount FROM fee_settings 
        WHERE is_active = true 
        ORDER BY id
      `);
      
      if (settingsResult.rows.length > 0) {
        return settingsResult.rows;
      }
      
      // Fallback: get distinct fee types from fees table
      const distinctResult = await pool.query(`
        SELECT DISTINCT fee_type as name, AVG(amount) as amount
        FROM fees
        GROUP BY fee_type
      `);
      
      if (distinctResult.rows.length > 0) {
        return distinctResult.rows;
      }
      
      // Default fee types
      return [
        { id: 1, name: 'School Fees', amount: 350 },
        { id: 2, name: 'PTA Levy', amount: 50 },
        { id: 3, name: 'Development Levy', amount: 100 },
        { id: 4, name: 'Examination Fees', amount: 75 }
      ];
    } catch (error) {
      console.error('Error in getFeeTypes:', error.message);
      return [
        { id: 1, name: 'School Fees', amount: 350 },
        { id: 2, name: 'PTA Levy', amount: 50 },
        { id: 3, name: 'Development Levy', amount: 100 },
        { id: 4, name: 'Examination Fees', amount: 75 }
      ];
    }
  }

  // Get school fee summary
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
        c.class_name as class_name
      FROM fees f
      JOIN students s ON f.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE f.id = $1
    `, [feeId]);
    
    return result.rows[0];
  }

  // ============================================
  // FEE SETTINGS METHODS
  // ============================================

  // Get fee settings
  async getFeeSettings() {
    try {
      // Check if fee_settings table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'fee_settings'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        // Create fee_settings table
        await pool.query(`
          CREATE TABLE IF NOT EXISTS fee_settings (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            amount DECIMAL(10,2) NOT NULL DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Insert default fee types
        const defaultFees = [
          { name: 'School Fees', amount: 350 },
          { name: 'PTA Levy', amount: 50 },
          { name: 'Development Levy', amount: 100 },
          { name: 'Examination Fees', amount: 75 }
        ];
        
        for (const fee of defaultFees) {
          await pool.query(`
            INSERT INTO fee_settings (name, amount) VALUES ($1, $2) 
            ON CONFLICT (name) DO NOTHING
          `, [fee.name, fee.amount]);
        }
      }
      
      const result = await pool.query(`
        SELECT * FROM fee_settings 
        WHERE is_active = true 
        ORDER BY id
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error in getFeeSettings:', error);
      throw error;
    }
  }

  // Create new fee type
  async createFeeType(name, amount) {
    try {
      const result = await pool.query(`
        INSERT INTO fee_settings (name, amount, is_active, created_at, updated_at)
        VALUES ($1, $2, true, NOW(), NOW())
        ON CONFLICT (name) DO UPDATE SET 
          amount = EXCLUDED.amount,
          is_active = true,
          updated_at = NOW()
        RETURNING *
      `, [name, amount]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in createFeeType:', error);
      throw error;
    }
  }
  // Update fee setting
  async updateFeeSetting(id, { amount, name }) {
    try {
      const result = await pool.query(`
        UPDATE fee_settings 
        SET amount = $1, name = $2, updated_at = NOW()
        WHERE id = $3 AND is_active = true
        RETURNING *
      `, [amount, name, id]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error in updateFeeSetting:', error);
      throw error;
    }
  }
  // Delete fee type (soft delete)
  async deleteFeeType(id) {
    try {
      const result = await pool.query(`
        UPDATE fee_settings 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
        RETURNING id
      `, [id]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error in deleteFeeType:', error);
      throw error;
    }
  }
}

module.exports = new FeeModel();