import React, { useState, useEffect } from 'react';
import './Fees.css';

const Fees = ({ API_BASE }) => {
  const [classes, setClasses] = useState([]);
  const [feeStudents, setFeeStudents] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [selectedFeeClass, setSelectedFeeClass] = useState('');
  const [selectedFeeTerm, setSelectedFeeTerm] = useState('1');
  const [selectedFeeYear, setSelectedFeeYear] = useState('2024-2025');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudentForPayment, setSelectedStudentForPayment] = useState(null);
  const [paymentData, setPaymentData] = useState({
    fee_type: '',
    amount: '',
    payment_method: 'cash',
    transaction_id: ''
  });

  useEffect(() => {
    loadClasses();
    loadFeeTypes();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await fetch(`${API_BASE}/classes`);
      const result = await response.json();
      setClasses(result.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadFeeStudents = async () => {
    if (!selectedFeeClass) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/fees/class/${selectedFeeClass}?term=${selectedFeeTerm}&academic_year=${selectedFeeYear}`);
      const result = await response.json();
      setFeeStudents(result.data || []);
    } catch (error) {
      console.error('Error loading fees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFeeTypes = async () => {
    try {
      const response = await fetch(`${API_BASE}/fees/types`);
      const result = await response.json();
      setFeeTypes(result.data || []);
    } catch (error) {
      console.error('Error loading fee types:', error);
    }
  };

  const openPaymentModal = (student) => {
    setSelectedStudentForPayment(student);
    setPaymentData({
      fee_type: '',
      amount: '',
      payment_method: 'cash',
      transaction_id: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/fees/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: selectedStudentForPayment.student_id,
          fee_type: paymentData.fee_type,
          term: parseInt(selectedFeeTerm),
          academic_year: selectedFeeYear,
          amount: parseFloat(paymentData.amount),
          payment_method: paymentData.payment_method,
          transaction_id: paymentData.transaction_id || null,
          recorded_by: 1
        })
      });
      if (response.ok) {
        alert('Payment recorded!');
        setShowPaymentModal(false);
        loadFeeStudents();
      } else {
        alert('Payment error');
      }
    } catch (error) {
      console.error('Payment error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fees-page">
      <div className="section-header">
        <h2>💰 Fee Management</h2>
      </div>

      <div className="filters-row">
        <select value={selectedFeeClass} onChange={(e) => setSelectedFeeClass(e.target.value)} className="filter-select">
          <option value="">Select Class</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
        <select value={selectedFeeTerm} onChange={(e) => setSelectedFeeTerm(e.target.value)} className="filter-select">
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
        <input 
          type="text" 
          value={selectedFeeYear} 
          onChange={(e) => setSelectedFeeYear(e.target.value)} 
          placeholder="Year" 
          className="filter-input"
        />
        <button className="btn-primary" onClick={loadFeeStudents} disabled={loading}>
          Load Fees
        </button>
      </div>

      {feeStudents.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Adm No</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Balance</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {feeStudents.map(student => (
                <tr key={student.student_id}>
                  <td>{`${student.first_name} ${student.last_name}`}</td>
                  <td>{student.admission_number}</td>
                  <td>₵{parseFloat(student.total_fees || 0).toLocaleString()}</td>
                  <td style={{color: '#28a745'}}>₵{parseFloat(student.total_paid || 0).toLocaleString()}</td>
                  <td style={{color: student.balance > 0 ? '#dc3545' : '#28a745'}}>
                    ₵{parseFloat(student.balance || 0).toLocaleString()}
                  </td>
                  <td>
                    <span className={`status-badge ${student.balance === 0 ? 'paid' : 'partial'}`}>
                      {student.balance === 0 ? 'PAID' : 'BALANCE'}
                    </span>
                  </td>
                  <td>
                    <button className="btn-pay" onClick={() => openPaymentModal(student)}>
                      Pay Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPaymentModal && selectedStudentForPayment && (
        <div className="payment-modal-overlay">
          <div className="payment-card">
            <div className="payment-header">
              <h3>Record Payment</h3>
              <button className="close-btn" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <div className="payment-student">
              <strong>{selectedStudentForPayment.first_name} {selectedStudentForPayment.last_name}</strong>
              <span>Balance: ₵{parseFloat(selectedStudentForPayment.balance || 0).toLocaleString()}</span>
            </div>
            <form onSubmit={handlePaymentSubmit} className="payment-form">
              <div className="form-group">
                <label>Fee Type</label>
                <select value={paymentData.fee_type} onChange={(e) => setPaymentData({...paymentData, fee_type: e.target.value})} required>
                  <option value="">Select</option>
                  {feeTypes.map(type => (
                    <option key={type.id} value={type.name}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₵)</label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Method</label>
                  <select value={paymentData.payment_method} onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile">Mobile Money</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Transaction ID (optional)</label>
                <input
                  type="text"
                  value={paymentData.transaction_id}
                  onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})}
                />
              </div>
              <div className="payment-actions">
                <button type="submit" className="btn-pay-submit" disabled={loading}>
                  {loading ? 'Processing...' : 'Record Payment'}
                </button>
                <button type="button" className="btn-cancel" onClick={() => setShowPaymentModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;

