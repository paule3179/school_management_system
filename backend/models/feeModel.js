const mockData = require('../data/mockData');

class FeeModel {
  // Get all fee records
  async getAllFees(filters = {}) {
    let fees = [...mockData.fees];
    
    if (filters.student_id) {
      fees = fees.filter(f => f.student_id === parseInt(filters.student_id));
    }
    if (filters.status) {
      fees = fees.filter(f => f.status === filters.status);
    }
    if (filters.term) {
      fees = fees.filter(f => f.term === parseInt(filters.term));
    }
    if (filters.academic_year) {
      fees = fees.filter(f => f.academic_year === filters.academic_year);
    }
    
    const feesWithNames = fees.map(fee => {
      const student = mockData.students.find(s => s.id === fee.student_id);
      return {
        ...fee,
        student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown',
        admission_number: student ? student.admission_number : 'Unknown'
      };
    });
    
    return feesWithNames;
  }
  
  // Get fee by ID
  async getFeeById(id) {
    const fee = mockData.fees.find(f => f.id === parseInt(id));
    if (!fee) return null;
    
    const student = mockData.students.find(s => s.id === fee.student_id);
    return {
      ...fee,
      student_name: student ? `${student.first_name} ${student.last_name}` : 'Unknown'
    };
  }
  
  // Get student fee summary
  async getStudentFeeSummary(studentId, academicYear) {
    const student = mockData.students.find(s => s.id === parseInt(studentId));
    if (!student) return null;
    
    const fees = mockData.fees.filter(f => 
      f.student_id === parseInt(studentId) && 
      f.academic_year === academicYear
    );
    
    const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalPaid = fees.reduce((sum, f) => sum + f.paid_amount, 0);
    const totalBalance = fees.reduce((sum, f) => sum + f.balance, 0);
    
    const byTerm = {};
    fees.forEach(fee => {
      if (!byTerm[fee.term]) {
        byTerm[fee.term] = { term: fee.term, term_name: fee.term_name, total: 0, paid: 0, balance: 0, fees: [] };
      }
      byTerm[fee.term].total += fee.amount;
      byTerm[fee.term].paid += fee.paid_amount;
      byTerm[fee.term].balance += fee.balance;
      byTerm[fee.term].fees.push(fee);
    });
    
    return {
      student: {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        admission_number: student.admission_number,
        class: student.class_id
      },
      academic_year,
      summary: {
        total_amount: totalAmount,
        total_paid: totalPaid,
        total_balance: totalBalance,
        status: totalBalance === 0 ? 'fully_paid' : totalPaid > 0 ? 'partial' : 'unpaid'
      },
      breakdown: Object.values(byTerm)
    };
  }
  
  // Record fee payment
  async recordPayment(paymentData) {
    const { student_id, fee_type, term, academic_year, amount_paid, payment_method, transaction_id } = paymentData;
    
    let feeRecord = mockData.fees.find(f => 
      f.student_id === student_id && 
      f.fee_type === fee_type && 
      f.term === term && 
      f.academic_year === academic_year
    );
    
    if (feeRecord) {
      const newPaidAmount = feeRecord.paid_amount + amount_paid;
      const newBalance = feeRecord.amount - newPaidAmount;
      const status = newBalance === 0 ? 'paid' : newBalance < feeRecord.amount ? 'partial' : 'unpaid';
      
      feeRecord.paid_amount = newPaidAmount;
      feeRecord.balance = newBalance;
      feeRecord.status = status;
      feeRecord.payment_date = new Date().toISOString().split('T')[0];
      feeRecord.payment_method = payment_method;
      feeRecord.transaction_id = transaction_id;
      feeRecord.updated_at = new Date().toISOString();
      
      return feeRecord;
    } else {
      const feeTypeData = mockData.fee_types.find(ft => ft.name === fee_type);
      const amount = feeTypeData ? feeTypeData.amount : 0;
      
      const newFee = {
        id: mockData.getNextId('fees'),
        student_id,
        fee_type,
        term,
        term_name: `Term ${term}`,
        academic_year,
        amount,
        paid_amount: amount_paid,
        balance: amount - amount_paid,
        status: amount_paid === amount ? 'paid' : 'partial',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method,
        transaction_id,
        receipt_number: `RCP${String(mockData.fees.length + 1).padStart(3, '0')}`,
        recorded_by: paymentData.recorded_by || 1,
        created_at: new Date().toISOString()
      };
      
      mockData.fees.push(newFee);
      return newFee;
    }
  }
  
  // Get fee types
  async getFeeTypes() {
    return mockData.fee_types;
  }
  
  // Get school fee summary
  async getSchoolFeeSummary(academicYear) {
    const fees = mockData.fees.filter(f => f.academic_year === academicYear);
    
    const totalExpected = fees.reduce((sum, f) => sum + f.amount, 0);
    const totalCollected = fees.reduce((sum, f) => sum + f.paid_amount, 0);
    const totalOutstanding = totalExpected - totalCollected;
    
    const byStatus = {
      paid: fees.filter(f => f.status === 'paid').length,
      partial: fees.filter(f => f.status === 'partial').length,
      unpaid: fees.filter(f => f.status === 'unpaid').length
    };
    
    return {
      academic_year,
      summary: {
        total_expected: totalExpected,
        total_collected: totalCollected,
        total_outstanding: totalOutstanding,
        collection_rate: totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(2) : 0
      },
      by_status: byStatus,
      details: fees
    };
  }
}

module.exports = new FeeModel();