import { apiFetch } from '../services/api.js';
// src/pages/Fees.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMoneyBillWave, faWallet, faExclamationTriangle, 
  faPlus, faEdit, faTrash, faSave, faTimes, faEye,
  faPrint, faRefresh, faChartLine
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from "../components/ToastNotification";
import './Fees.css';

const Fees = ({ API_BASE }) => {
  // State
  const [classes, setClasses] = useState([]);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);
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
  const [schoolFeeSummary, setSchoolFeeSummary] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [feeSummary, setFeeSummary] = useState(null);

  // Fee Settings State
  const [activeTab, setActiveTab] = useState('fees');
  const [feeSettings, setFeeSettings] = useState([]);
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', amount: '', description: '' });
  const [newFeeType, setNewFeeType] = useState({ name: '', amount: '', description: '' });
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'academic', name: 'Academic Fees' },
    { id: 'development', name: 'Development Fees' },
    { id: 'extracurricular', name: 'Extracurricular' },
    { id: 'technology', name: 'Technology Fees' },
    { id: 'other', name: 'Other Fees' }
  ];

  // ============================================
  // LOAD FUNCTIONS
  // ============================================

  const loadClasses = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/classes`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      setClasses(result.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  }, [API_BASE]);

  const loadSchoolFeeSummary = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/school-summary?academic_year=${selectedFeeYear}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success) setSchoolFeeSummary(result.data);
    } catch (error) {
      console.error('Error loading school fee summary:', error);
    }
  }, [API_BASE, selectedFeeYear]);

  const loadFeeTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/types`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        setFeeTypes(result.data);
        return;
      }
      setFeeTypes([
        { id: 1, name: 'School Fees', amount: 350 },
        { id: 2, name: 'PTA Levy', amount: 50 },
        { id: 3, name: 'Development Levy', amount: 100 },
        { id: 4, name: 'Examination Fees', amount: 75 }
      ]);
    } catch (error) {
      console.error('Error loading fee types:', error);
      setFeeTypes([
        { id: 1, name: 'School Fees', amount: 350 },
        { id: 2, name: 'PTA Levy', amount: 50 },
        { id: 3, name: 'Development Levy', amount: 100 },
        { id: 4, name: 'Examination Fees', amount: 75 }
      ]);
    }
  }, [API_BASE]);

  const loadFeeSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/settings`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success && result.data && result.data.length > 0) {
        setFeeSettings(result.data);
      } else {
        setFeeSettings([
          { id: 1, name: 'School Fees', amount: 350, category: 'academic', description: 'Core tuition fees' },
          { id: 2, name: 'PTA Levy', amount: 50, category: 'development', description: 'Parent-Teacher Association' },
          { id: 3, name: 'Development Levy', amount: 100, category: 'development', description: 'School infrastructure' },
          { id: 4, name: 'Examination Fees', amount: 75, category: 'academic', description: 'Termly examinations' }
        ]);
      }
    } catch (error) {
      console.error('Error loading fee settings:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadClasses();
    loadFeeTypes();
    loadFeeSettings();
    loadSchoolFeeSummary();
  }, [loadClasses, loadFeeTypes, loadFeeSettings, loadSchoolFeeSummary]);

  const loadFeeStudents = async () => {
    if (!selectedFeeClass) {
      showToast('Please select a class', 'warning');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/class/${selectedFeeClass}?term=${selectedFeeTerm}&academic_year=${selectedFeeYear}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success) {
        setFeeStudents(result.data || []);
      } else {
        showToast(result.error || 'Error loading fee data', 'error');
      }
    } catch (error) {
      console.error('Error loading fees:', error);
      showToast('Error loading fee data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FEE SETTINGS FUNCTIONS
  // ============================================

  const updateFeeAmount = async (feeId, newAmount, feeName) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/settings/${feeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ amount: parseFloat(newAmount) })
      });
      const result = await response.json();
      if (result.success) {
        showToast(`${feeName} updated to ₵${parseFloat(newAmount).toLocaleString()}`, 'success');
        loadFeeSettings();
        loadFeeTypes();
        setEditingFeeId(null);
      } else {
        showToast('Error updating fee amount', 'error');
      }
    } catch (error) {
      console.error('Error updating fee:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addNewFeeType = async () => {
    if (!newFeeType.name || !newFeeType.amount) {
      showToast('Please enter both fee name and amount', 'warning');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: newFeeType.name,
          amount: parseFloat(newFeeType.amount),
          description: newFeeType.description,
          category: 'other'
        })
      });
      const result = await response.json();
      if (result.success) {
        showToast(`"${newFeeType.name}" added successfully!`, 'success');
        loadFeeSettings();
        loadFeeTypes();
        setNewFeeType({ name: '', amount: '', description: '' });
        setShowAddForm(false);
      } else {
        showToast('Error adding fee type', 'error');
      }
    } catch (error) {
      console.error('Error adding fee:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteFeeType = async (feeId, feeName) => {
    if (!window.confirm(`Delete "${feeName}"? This will affect all student fee records.`)) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/settings/${feeId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const result = await response.json();
      if (result.success) {
        showToast(`"${feeName}" deleted`, 'success');
        loadFeeSettings();
        loadFeeTypes();
      } else {
        showToast('Error deleting fee type', 'error');
      }
    } catch (error) {
      console.error('Error deleting fee:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (fee) => {
    setEditingFeeId(fee.id);
    setEditFormData({ name: fee.name, amount: fee.amount, description: fee.description || '' });
  };

  // ============================================
  // PAYMENT FUNCTIONS
  // ============================================

  const openPaymentModal = (student) => {
    setSelectedStudentForPayment(student);
    setPaymentData({
      fee_type: feeTypes.length > 0 ? feeTypes[0].name : '',
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
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          student_id: selectedStudentForPayment.student_id,
          fee_type: paymentData.fee_type,
          term: parseInt(selectedFeeTerm),
          term_name: `Term ${selectedFeeTerm}`,
          academic_year: selectedFeeYear,
          amount: parseFloat(paymentData.amount),
          payment_method: paymentData.payment_method,
          transaction_id: paymentData.transaction_id || null,
          recorded_by: 1
        })
      });
      const result = await response.json();
      if (response.ok) {
        showToast('Payment recorded successfully!', 'success');
        setShowPaymentModal(false);
        loadFeeStudents();
        loadSchoolFeeSummary();

        const receiptInfo = {
          receipt_number: result.data?.receipt_number || `RCP-${Date.now()}`,
          payment_date: new Date().toISOString(),
          first_name: selectedStudentForPayment.first_name,
          last_name: selectedStudentForPayment.last_name,
          admission_number: selectedStudentForPayment.admission_number,
          class_name: selectedStudentForPayment.class_name,
          fee_type: paymentData.fee_type,
          paid_amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          transaction_id: paymentData.transaction_id,
          academic_year: selectedFeeYear,
          term: selectedFeeTerm
        };
        setReceiptData(receiptInfo);
        setShowReceiptModal(true);
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Payment error:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const viewStudentFeeSummary = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(`${API_BASE}/fees/student/${studentId}?academic_year=${selectedFeeYear}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success && result.data) {
        setFeeSummary(result.data);
      } else {
        showToast('No fee data found for this student', 'warning');
      }
    } catch (error) {
      console.error('Error loading fee summary:', error);
      showToast('Error loading fee details', 'error');
    }
  };

  const printReceipt = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head><title>Payment Receipt</title></head>
      <body>
        <div class="receipt">
          <h2>Payment Receipt</h2>
          <p><strong>Receipt No:</strong> ${receiptData.receipt_number}</p>
          <p><strong>Date:</strong> ${new Date(receiptData.payment_date).toLocaleDateString()}</p>
          <p><strong>Student:</strong> ${receiptData.first_name} ${receiptData.last_name}</p>
          <p><strong>Admission No:</strong> ${receiptData.admission_number}</p>
          <p><strong>Class:</strong> ${receiptData.class_name}</p>
          <p><strong>Fee Type:</strong> ${receiptData.fee_type}</p>
          <p><strong>Amount Paid:</strong> ₵${receiptData.paid_amount}</p>
          <p><strong>Payment Method:</strong> ${receiptData.payment_method}</p>
        </div>
        <script>window.print();setTimeout(function(){window.close();},500);</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (balance, totalFees) => {
    if (!totalFees || totalFees === 0) return { status: 'no-fee', text: 'NO FEE' };
    if (balance <= 0) return { status: 'paid', text: 'PAID' };
    if (balance > 0 && balance < totalFees) return { status: 'partial', text: 'PARTIAL' };
    return { status: 'unpaid', text: 'UNPAID' };
  };

  const refreshAll = () => {
    loadClasses();
    loadFeeTypes();
    loadFeeSettings();
    loadSchoolFeeSummary();
    if (selectedFeeClass) loadFeeStudents();
    showToast('Data refreshed!', 'success');
  };

  const filteredFeeSettings = selectedCategory === 'all' 
    ? feeSettings 
    : feeSettings.filter(fee => fee.category === selectedCategory);

  // ========== RENDER ==========
  return (
    <div className="fees-page">
      {/* Tabs */}
      <div className="fees-tabs">
        <button className={`tab-btn ${activeTab === 'fees' ? 'active' : ''}`} onClick={() => setActiveTab('fees')}>
          Fee Management
        </button>
        <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => { setActiveTab('settings'); loadFeeSettings(); }}>
          Fee Settings
        </button>
      </div>

      {/* ========== FEE MANAGEMENT TAB ========== */}
      {activeTab === 'fees' && (
        <>
          {/* STATS CARDS - At the top before any buttons */}
          {schoolFeeSummary && schoolFeeSummary.summary && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><FontAwesomeIcon icon={faWallet} /></div>
                <div className="stat-info">
                  <h3>₵{parseFloat(schoolFeeSummary.summary.expected || 0).toLocaleString()}</h3>
                  <p>Expected</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><FontAwesomeIcon icon={faMoneyBillWave} /></div>
                <div className="stat-info">
                  <h3>₵{parseFloat(schoolFeeSummary.summary.collected || 0).toLocaleString()}</h3>
                  <p>Collected</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><FontAwesomeIcon icon={faExclamationTriangle} /></div>
                <div className="stat-info">
                  <h3>₵{parseFloat(schoolFeeSummary.summary.outstanding || 0).toLocaleString()}</h3>
                  <p>Outstanding</p>
                </div>
              </div>
            </div>
          )}

          {/* PAGE HEADER - Title and buttons aligned right */}
          <div className="section-header">
            <h2>Fee Management</h2>
            <div className="header-buttons">
              <button className="btn-refresh" onClick={refreshAll}>
                <FontAwesomeIcon icon={faRefresh} /> Refresh
              </button>
            </div>
          </div>

          {/* FILTERS ROW */}
          <div className="filters-row">
            <div className="filter-group">
              <label>Class</label>
              <select value={selectedFeeClass} onChange={(e) => setSelectedFeeClass(e.target.value)} className="filter-select">
                <option value="">Select Class</option>
                {classes.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
              </select>
            </div>
            <div className="filter-group">
              <label>Term</label>
              <select value={selectedFeeTerm} onChange={(e) => setSelectedFeeTerm(e.target.value)} className="filter-select">
                <option value="1">Term 1</option>
                <option value="2">Term 2</option>
                <option value="3">Term 3</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Academic Year</label>
              <input type="text" value={selectedFeeYear} onChange={(e) => setSelectedFeeYear(e.target.value)} placeholder="Academic Year" className="filter-input" />
            </div>
            <div className="filter-group">
              <button className="btn-primary" onClick={loadFeeStudents} disabled={loading}>
                {loading ? 'Loading...' : 'Load Students'}
              </button>
            </div>
          </div>

          {/* STUDENTS TABLE */}
          {feeStudents.length > 0 ? (
            <div className="table-container">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Admission No</th>
                    <th>Class</th>
                    <th>Total Fees (₵)</th>
                    <th>Paid (₵)</th>
                    <th>Balance (₵)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feeStudents.map(student => {
                    const totalFees = parseFloat(student.total_fees || 0);
                    const totalPaid = parseFloat(student.total_paid || 0);
                    const balance = parseFloat(student.balance || 0);
                    const statusInfo = getStatusBadge(balance, totalFees);
                    return (
                      <tr key={student.student_id}>
                        <td><strong>{student.first_name} {student.last_name}</strong></td>
                        <td>{student.admission_number}</td>
                        <td>{student.class_name || '-'}</td>
                        <td>₵{totalFees.toLocaleString()}</td>
                        <td>₵{totalPaid.toLocaleString()}</td>
                        <td style={{color: balance > 0 ? '#dc3545' : '#28a745', fontWeight: 'bold'}}>
                          ₵{balance.toLocaleString()}
                        </td>
                        <td><span className={`status-badge status-${statusInfo.status}`}>{statusInfo.text}</span></td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-pay" onClick={() => openPaymentModal(student)} title="Record Payment">
                              <FontAwesomeIcon icon={faMoneyBillWave} />
                            </button>
                            <button className="btn-info" onClick={() => viewStudentFeeSummary(student.student_id)} title="View Details">
                              <FontAwesomeIcon icon={faEye} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : selectedFeeClass ? (
            <div className="empty-state">
              <div className="empty-icon"><FontAwesomeIcon icon={faMoneyBillWave} /></div>
              <p>No fee records found for this class.</p>
            </div>
          ) : null}
        </>
      )}

      {/* ========== FEE SETTINGS TAB ========== */}
      {activeTab === 'settings' && (
        <div className="fee-settings-container">
          <div className="section-header">
            <h2>Fee Settings</h2>
            <div className="header-buttons">
              <button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
                <FontAwesomeIcon icon={faPlus} /> Add New Fee
              </button>
              <button className="btn-refresh" onClick={refreshAll}>
                <FontAwesomeIcon icon={faRefresh} /> Refresh
              </button>
            </div>
          </div>

          <div className="category-filter">
            <button className={`filter-chip ${selectedCategory === 'all' ? 'active' : ''}`} onClick={() => setSelectedCategory('all')}>
              All Categories
            </button>
            {categories.map(cat => (
              <button key={cat.id} className={`filter-chip ${selectedCategory === cat.id ? 'active' : ''}`} onClick={() => setSelectedCategory(cat.id)}>
                {cat.name}
              </button>
            ))}
          </div>

          {showAddForm && (
            <div className="add-fee-form">
              <h3>Add New Fee Type</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Fee Name *</label>
                  <input type="text" placeholder="e.g., Sports Levy" value={newFeeType.name} onChange={(e) => setNewFeeType({...newFeeType, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Amount (₵) *</label>
                  <input type="number" step="0.01" placeholder="0.00" value={newFeeType.amount} onChange={(e) => setNewFeeType({...newFeeType, amount: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <input type="text" placeholder="Brief description" value={newFeeType.description} onChange={(e) => setNewFeeType({...newFeeType, description: e.target.value})} />
              </div>
              <div className="form-actions">
                <button className="btn-save" onClick={addNewFeeType} disabled={loading}>
                  <FontAwesomeIcon icon={faSave} /> {loading ? 'Adding...' : 'Add Fee'}
                </button>
                <button className="btn-cancel" onClick={() => setShowAddForm(false)}>
                  <FontAwesomeIcon icon={faTimes} /> Cancel
                </button>
              </div>
            </div>
          )}

          <div className="table-container">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Fee Name</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount (₵)</th>
                  <th>New Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFeeSettings.length > 0 ? filteredFeeSettings.map(fee => (
                  <tr key={fee.id}>
                    <td><strong>{fee.name}</strong></td>
                    <td><span className="category-badge">{fee.category || 'other'}</span></td>
                    <td><small>{fee.description || '-'}</small></td>
                    <td className="current-amount">₵{parseFloat(fee.amount).toLocaleString()}</td>
                    <td>
                      {editingFeeId === fee.id ? (
                        <input type="number" className="edit-amount-input" value={editFormData.amount} onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})} step="0.01" />
                      ) : (
                        <span style={{ color: '#999' }}>-</span>
                      )}
                    </td>
                    <td>
                      {editingFeeId === fee.id ? (
                        <div className="action-buttons">
                          <button className="btn-save-small" onClick={() => updateFeeAmount(fee.id, editFormData.amount, fee.name)} disabled={loading}>
                            <FontAwesomeIcon icon={faSave} />
                          </button>
                          <button className="btn-cancel-small" onClick={() => setEditingFeeId(null)}>
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      ) : (
                        <div className="action-buttons">
                          <button className="btn-edit" onClick={() => startEditing(fee)}>
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button className="btn-delete" onClick={() => deleteFeeType(fee.id, fee.name)} disabled={loading}>
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" className="empty-state">No fee settings found. Add fee types to get started.朴实</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && selectedStudentForPayment && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon"><FontAwesomeIcon icon={faMoneyBillWave} /></div>
                <div><h2>Record Payment</h2><p className="modal-subtitle">Enter payment details</p></div>
              </div>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body">
                <div className="form-group"><label>Student: <strong>{selectedStudentForPayment.first_name} {selectedStudentForPayment.last_name}</strong></label></div>
                <div className="form-group"><label>Balance: ₵{parseFloat(selectedStudentForPayment.balance || 0).toLocaleString()}</label></div>
                <div className="form-group"><label>Fee Type *</label>
                  <select value={paymentData.fee_type} onChange={(e) => setPaymentData({...paymentData, fee_type: e.target.value})} required>
                    <option value="">Select Fee Type</option>
                    {feeTypes.map(type => (<option key={type.id} value={type.name}>{type.name} - ₵{parseFloat(type.amount).toLocaleString()}</option>))}
                  </select>
                </div>
                <div className="form-group"><label>Amount (₵) *</label>
                  <input type="number" step="0.01" value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} required placeholder="Enter amount" />
                </div>
                <div className="form-group"><label>Payment Method *</label>
                  <select value={paymentData.payment_method} onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile">Mobile Money</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="form-group"><label>Transaction ID (optional)</label>
                  <input type="text" value={paymentData.transaction_id} onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})} placeholder="e.g., MOMO-123456" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-save-modal" disabled={loading}><FontAwesomeIcon icon={faSave} /> {loading ? 'Processing...' : 'Record Payment'}</button>
                <button type="button" className="btn-cancel-modal" onClick={() => setShowPaymentModal(false)}><FontAwesomeIcon icon={faTimes} /> Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {showReceiptModal && receiptData && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="modal-content receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon"><FontAwesomeIcon icon={faPrint} /></div>
                <div><h2>Payment Receipt</h2><p className="modal-subtitle">Transaction confirmed</p></div>
              </div>
              <button className="modal-close" onClick={() => setShowReceiptModal(false)}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="modal-body">
              <div className="receipt-details">
                <p><strong>Receipt No:</strong> {receiptData.receipt_number}</p>
                <p><strong>Date:</strong> {new Date(receiptData.payment_date).toLocaleDateString()}</p>
                <p><strong>Student:</strong> {receiptData.first_name} {receiptData.last_name}</p>
                <p><strong>Admission No:</strong> {receiptData.admission_number}</p>
                <p><strong>Class:</strong> {receiptData.class_name || 'N/A'}</p>
                <p><strong>Fee Type:</strong> {receiptData.fee_type}</p>
                <p><strong>Amount Paid:</strong> <span style={{color: '#28a745', fontWeight: 'bold'}}>₵{parseFloat(receiptData.paid_amount).toLocaleString()}</span></p>
                <p><strong>Payment Method:</strong> {receiptData.payment_method?.toUpperCase()}</p>
                {receiptData.transaction_id && <p><strong>Transaction ID:</strong> {receiptData.transaction_id}</p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={printReceipt}><FontAwesomeIcon icon={faPrint} /> Print Receipt</button>
              <button className="btn-cancel-modal" onClick={() => setShowReceiptModal(false)}><FontAwesomeIcon icon={faTimes} /> Close</button>
            </div>
          </div>
        </div>
      )}

      {/* FEE SUMMARY MODAL */}
      {feeSummary && (
        <div className="modal-overlay" onClick={() => setFeeSummary(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon"><FontAwesomeIcon icon={faChartLine} /></div>
                <div><h2>Fee Details</h2><p className="modal-subtitle">Complete fee breakdown</p></div>
              </div>
              <button className="modal-close" onClick={() => setFeeSummary(null)}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="modal-body">
              <p><strong>Student:</strong> {feeSummary.student?.first_name} {feeSummary.student?.last_name}</p>
              <p><strong>Admission No:</strong> {feeSummary.student?.admission_number}</p>
              <p><strong>Class:</strong> {feeSummary.student?.class_name}</p><hr />
              <p><strong>Total Fees:</strong> ₵{parseFloat(feeSummary.summary?.total_fees || 0).toLocaleString()}</p>
              <p><strong>Total Paid:</strong> ₵{parseFloat(feeSummary.summary?.total_paid || 0).toLocaleString()}</p>
              <p><strong>Balance:</strong> ₵{parseFloat(feeSummary.summary?.total_balance || 0).toLocaleString()}</p>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-modal" onClick={() => setFeeSummary(null)}><FontAwesomeIcon icon={faTimes} /> Close</button>
            </div>
          </div>
        </div>
      )}

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default Fees;