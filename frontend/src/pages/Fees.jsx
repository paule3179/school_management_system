import { apiFetch } from '../services/api.js';
// src/pages/Fees.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faMoneyBillWave, faWallet, faExclamationTriangle, 
  faPlus, faEdit, faTrash, faSave, faTimes, faEye,
  faPrint, faRefresh, faChartLine, faSearch,
  faFileExport,
  
  faUndo, faUserGraduate,

  faReceipt 
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from "../components/ToastNotification";
import './Fees.css';

// Import school logo from correct path
import schoolLogo from '/src/assets/logo.png';

const Fees = ({ API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api') }) => {
  // State
  const [classes, setClasses] = useState([]);
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);
  const [feeStudents, setFeeStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
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
  const [searchTerm, setSearchTerm] = useState('');

  const categories = [
    { id: 'academic', name: 'Academic Fees' },
    { id: 'development', name: 'Development Fees' },
    { id: 'extracurricular', name: 'Extracurricular' },
    { id: 'technology', name: 'Technology Fees' },
    { id: 'other', name: 'Other Fees' }
  ];

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // ============================================
  // LOAD FUNCTIONS
  // ============================================

  const loadClasses = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('⚠️ No token found, using fallback classes');
        setClasses([
          { id: 1, class_name: 'JHS 1', name: 'JHS 1' },
          { id: 2, class_name: 'JHS 2', name: 'JHS 2' },
          { id: 3, class_name: 'JHS 3', name: 'JHS 3' },
          { id: 4, class_name: 'Primary 6', name: 'Primary 6' }
        ]);
        return;
      }

      const response = await apiFetch(`${API_BASE}/classes`, {
        headers: headers
      });
      
      const result = await response.json();
      console.log('lasses API Response:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        setClasses(result.data);
        console.log('Classes loaded:', result.data.length);
      } else {
        console.warn('⚠️ No classes from API, using fallback');
        setClasses([
          { id: 1, class_name: 'JHS 1', name: 'JHS 1' },
          { id: 2, class_name: 'JHS 2', name: 'JHS 2' },
          { id: 3, class_name: 'JHS 3', name: 'JHS 3' }
        ]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([
        { id: 1, class_name: 'JHS 1', name: 'JHS 1' },
        { id: 2, class_name: 'JHS 2', name: 'JHS 2' },
        { id: 3, class_name: 'JHS 3', name: 'JHS 3' }
      ]);
    }
  }, [API_BASE]);

  const loadSchoolFeeSummary = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/fees/school-summary?academic_year=${selectedFeeYear}`, {
        headers: headers
      });
      const result = await response.json();
      if (result.success) {
        setSchoolFeeSummary(result.data);
        console.log('School fee summary loaded');
      }
    } catch (error) {
      console.error('Error loading school fee summary:', error);
    }
  }, [API_BASE, selectedFeeYear]);

  const loadFeeTypes = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/fees/types`, {
        headers: headers
      });
      const result = await response.json();
      if (result.success && result.data) {
        setFeeTypes(result.data);
        console.log('Fee types loaded:', result.data.length);
      } else {
        setFeeTypes([
          { id: 1, name: 'School Fees', amount: 350 },
          { id: 2, name: 'PTA Levy', amount: 50 },
          { id: 3, name: 'Development Levy', amount: 100 },
          { id: 4, name: 'Examination Fees', amount: 75 }
        ]);
      }
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
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/fees/settings`, {
        headers: headers
      });
      const result = await response.json();
      if (result.success && result.data) {
        setFeeSettings(result.data);
        console.log('✅ Fee settings loaded:', result.data.length);
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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      await loadClasses();
      await loadFeeTypes();
      await loadFeeSettings();
      await loadSchoolFeeSummary();
    };
    loadInitialData();
  }, [loadClasses, loadFeeTypes, loadFeeSettings, loadSchoolFeeSummary]);

  // ============================================
  // LOAD FEE STUDENTS
  // ============================================
  const loadFeeStudents = async () => {
    if (!selectedFeeClass) {
      showToast('Please select a class', 'warning');
      return;
    }
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      
      const studentsResponse = await apiFetch(`${API_BASE}/classes/${selectedFeeClass}/students`, {
        headers: headers
      });
      const studentsResult = await studentsResponse.json();
      
      if (!studentsResult.success) {
        showToast('Error loading students', 'error');
        setLoading(false);
        return;
      }
      
      const students = studentsResult.data || [];
      
      const feeData = await Promise.all(
        students.map(async (student) => {
          try {
            const feeResponse = await apiFetch(
              `${API_BASE}/fees/student/${student.id}?academic_year=${selectedFeeYear}`,
              { headers: headers }
            );
            const feeResult = await feeResponse.json();
            
            if (feeResult.success && feeResult.data) {
              return {
                student_id: student.id,
                admission_number: student.admission_number || 'N/A',
                first_name: student.first_name || '',
                last_name: student.last_name || '',
                class_name: student.class_name || 'N/A',
                total_fees: feeResult.data.summary?.total_fees || 0,
                total_paid: feeResult.data.summary?.total_paid || 0,
                balance: feeResult.data.summary?.total_balance || 0
              };
            }
            return {
              student_id: student.id,
              admission_number: student.admission_number || 'N/A',
              first_name: student.first_name || '',
              last_name: student.last_name || '',
              class_name: student.class_name || 'N/A',
              total_fees: 0,
              total_paid: 0,
              balance: 0
            };
          } catch {

            return {
              student_id: student.id,
              admission_number: student.admission_number || 'N/A',
              first_name: student.first_name || '',
              last_name: student.last_name || '',
              class_name: student.class_name || 'N/A',
              total_fees: 0,
              total_paid: 0,
              balance: 0
            };
          }

        })
      );
      
      setFeeStudents(feeData);
      setFilteredStudents(feeData);
      if (feeData.length === 0) {
        showToast('No students found in this class', 'info');
      } else {
        showToast(`Loaded ${feeData.length} students`, 'success');
      }
      
    } catch (error) {
      console.error('Error loading fees:', error);
      showToast('Error loading fee data: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // FILTER STUDENTS
  // ============================================
  useEffect(() => {
    applyFilters();
  }, [searchTerm, feeStudents]);

  const applyFilters = () => {
    let filtered = [...feeStudents];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => 
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(term) ||
        student.admission_number?.toLowerCase().includes(term) ||
        student.class_name?.toLowerCase().includes(term)
      );
    }
    
    setFilteredStudents(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilteredStudents(feeStudents);
  };


  // ============================================
  // FEE SETTINGS FUNCTIONS
  // ============================================

  const updateFeeAmount = async (feeId, newAmount, feeName) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/fees/settings/${feeId}`, {
        method: 'PUT',
        headers: headers,
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
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/fees/settings`, {
        method: 'POST',
        headers: headers,
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
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/fees/settings/${feeId}`, {
        method: 'DELETE',
        headers: headers
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
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/fees/payment`, {
        method: 'POST',
        headers: headers,
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
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/fees/student/${studentId}?academic_year=${selectedFeeYear}`, {
        headers: headers
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
      <head>
        <title>Payment Receipt</title>
        <style>
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 40px;
            background: #f5f7fa;
          }
          .receipt-container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .receipt-header {
            background: linear-gradient(135deg, #1e293b, #0f172a);
            padding: 30px;
            text-align: center;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
          }
          .school-logo-circle {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: white;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          }
          .school-logo-circle img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .school-name {
            text-align: left;
          }
          .school-name h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }
          .school-name p {
            margin: 2px 0 0 0;
            font-size: 12px;
            opacity: 0.8;
          }
          .receipt-body {
            padding: 30px;
          }
          .receipt-title {
            text-align: center;
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 20px 0;
            padding-bottom: 12px;
            border-bottom: 2px solid #e2e8f0;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #f1f5f9;
          }
          .receipt-row:last-child {
            border-bottom: none;
          }
          .receipt-label {
            color: #64748b;
            font-size: 13px;
            font-weight: 500;
          }
          .receipt-value {
            color: #0f172a;
            font-size: 14px;
            font-weight: 600;
            text-align: right;
          }
          .receipt-value.amount {
            color: #10b981;
            font-size: 18px;
          }
          .receipt-footer {
            background: #f8fafc;
            padding: 16px 30px;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            font-size: 12px;
            color: #94a3b8;
          }
          .receipt-footer strong {
            color: #475569;
          }
          @media print {
            body { padding: 20px; background: white; }
            .receipt-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="receipt-header">
            <div class="school-logo-circle">
              <img src="${schoolLogo}" alt="School Logo" />
            </div>
            <div class="school-name">
              <h1>King School</h1>
              <p>Excellence in Education</p>
            </div>
          </div>
          <div class="receipt-body">
            <div class="receipt-title">🧾 Payment Receipt</div>
            <div class="receipt-row">
              <span class="receipt-label">Receipt No</span>
              <span class="receipt-value">${receiptData.receipt_number}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Date</span>
              <span class="receipt-value">${new Date(receiptData.payment_date).toLocaleDateString()}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Student</span>
              <span class="receipt-value">${receiptData.first_name} ${receiptData.last_name}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Admission No</span>
              <span class="receipt-value">${receiptData.admission_number}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Class</span>
              <span class="receipt-value">${receiptData.class_name}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Fee Type</span>
              <span class="receipt-value">${receiptData.fee_type}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Payment Method</span>
              <span class="receipt-value">${receiptData.payment_method?.toUpperCase()}</span>
            </div>
            ${receiptData.transaction_id ? `
            <div class="receipt-row">
              <span class="receipt-label">Transaction ID</span>
              <span class="receipt-value">${receiptData.transaction_id}</span>
            </div>
            ` : ''}
            <div class="receipt-row" style="border-top: 2px solid #e2e8f0; margin-top: 10px; padding-top: 16px;">
              <span class="receipt-label" style="font-weight: 700; font-size: 15px;">Amount Paid</span>
              <span class="receipt-value amount">₵${parseFloat(receiptData.paid_amount).toLocaleString()}</span>
            </div>
          </div>
          <div class="receipt-footer">
            <strong>Thank you for your payment!</strong><br>
            This is a system-generated receipt. No signature required.
          </div>
        </div>
        <script>
          window.print();
          setTimeout(function(){ window.close(); }, 500);
        </script>
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

  const exportToCSV = () => {
    try {
      const dataToExport = filteredStudents.length > 0 ? filteredStudents : feeStudents;
      
      if (dataToExport.length === 0) {
        showToast('No data to export', 'error');
        return;
      }

      const exportData = dataToExport.map(student => ({
        'Student Name': `${student.first_name} ${student.last_name}`,
        'Admission No': student.admission_number || 'N/A',
        'Class': student.class_name || 'N/A',
        'Total Fees': student.total_fees || 0,
        'Total Paid': student.total_paid || 0,
        'Balance': student.balance || 0,
        'Status': getStatusBadge(student.balance, student.total_fees).text
      }));

      const headers = Object.keys(exportData[0]);
      const csvRows = [headers.join(',')];
      
      for (const row of exportData) {
        const values = headers.map(header => {
          const value = row[header];
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const filename = `fee_summary_${dateStr}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast(`Exported ${dataToExport.length} records successfully!`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Error exporting data', 'error');
    }
  };

  const filteredFeeSettings = selectedCategory === 'all' 
    ? feeSettings 
    : feeSettings.filter(fee => fee.category === selectedCategory);

  const totalStudents = feeStudents.length;

  if (loading && feeStudents.length === 0) {
    return (
      <div className="fees-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading fee data...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========
  return (
    <div className="fees-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faWallet} />
          </div>
          <div className="stat-info">
            <h3>₵{schoolFeeSummary?.summary?.expected ? parseFloat(schoolFeeSummary.summary.expected).toLocaleString() : '0'}</h3>
            <p>Expected</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faMoneyBillWave} />
          </div>
          <div className="stat-info">
            <h3>₵{schoolFeeSummary?.summary?.collected ? parseFloat(schoolFeeSummary.summary.collected).toLocaleString() : '0'}</h3>
            <p>Collected</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div className="stat-info">
            <h3>₵{schoolFeeSummary?.summary?.outstanding ? parseFloat(schoolFeeSummary.summary.outstanding).toLocaleString() : '0'}</h3>
            <p>Outstanding</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faUserGraduate} />
          </div>
          <div className="stat-info">
            <h3>{totalStudents}</h3>
            <p>Students</p>
          </div>
        </div>
      </div>

      {/* Tabs - No white line */}
      <div className="fees-tabs">
        <button 
          className={`tab-btn ${activeTab === 'fees' ? 'active' : ''}`} 
          onClick={() => setActiveTab('fees')}
        >
          <FontAwesomeIcon icon={faMoneyBillWave} /> Fee Management
        </button>
        <button 
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('settings'); loadFeeSettings(); }}
        >
          <FontAwesomeIcon icon={faPlus} /> Fee Settings
        </button>
      </div>

      {/* ========== FEE MANAGEMENT TAB ========== */}
      {activeTab === 'fees' && (
  <>
    {/* Action Buttons - Right aligned */}
    <div className="fees-action-bar">
      <div className="action-buttons-right">
        <button className="btn-export" onClick={exportToCSV}>
          <FontAwesomeIcon icon={faFileExport} /> Export
        </button>
        <button className="btn-refresh" onClick={refreshAll}>
          <FontAwesomeIcon icon={faRefresh} /> Refresh
        </button>
      </div>
    </div>

    {/* Search Row - Left: Search/Filter/Reset, Right: Class/Term/Year/Load */}
    <div className="search-filters-row">
      {/* Left Side */}
      <div className="search-left">
        <div className="search-input-wrapper">
          <FontAwesomeIcon icon={faSearch} className="search-icon" />
          <input
            type="text"
            placeholder="Search by name, admission number, or class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          {searchTerm && (
            <button className="clear-search" onClick={clearFilters}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>
        {/* Filter button removed (UI request) */}
        {/* <button className="btn-filter" onClick={() => setShowFilters(!showFilters)}>
          <FontAwesomeIcon icon={faFilter} /> Filter
        </button> */}
        <button className="btn-reset" onClick={clearFilters}>
          <FontAwesomeIcon icon={faUndo} /> Reset
        </button>
      </div>

      {/* Right Side - Class, Term, Year, Load Button */}
      <div className="fee-filters-right">
        <div className="filter-group">
          <label>Class</label>
          <select 
            value={selectedFeeClass} 
            onChange={(e) => setSelectedFeeClass(e.target.value)}
            className="filter-select"
          >
            <option value="">Select Class</option>
            {classes && classes.length > 0 ? (
              classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name || cls.name || `Class ${cls.id}`}
                </option>
              ))
            ) : (
              <option value="" disabled>No classes available</option>
            )}
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
          <input type="text" value={selectedFeeYear} onChange={(e) => setSelectedFeeYear(e.target.value)} placeholder="2024-2025" className="filter-input" />
        </div>
        <div className="filter-group load-btn-group">
          <label>&nbsp;</label>
          <button className="btn-primary" onClick={loadFeeStudents} disabled={loading}>
            <FontAwesomeIcon icon={faSearch} /> {loading ? 'Loading...' : 'Load Students'}
          </button>
        </div>
      </div>
    </div>

          {/* Table */}
          <div className="table-container">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Class</th>
                  <th>Total Fees</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="empty-state">
                    <div className="loading-spinner"></div>
                    <p>Loading students...</p>
                  </td></tr>
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map(student => {
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
                  })
                ) : selectedFeeClass ? (
                  <tr><td colSpan="8" className="empty-state">
                    <div className="empty-icon"><FontAwesomeIcon icon={faMoneyBillWave} /></div>
                    <p>No students found in this class.</p>
                  </td></tr>
                ) : (
                  <tr><td colSpan="8" className="empty-state">
                    <div className="empty-icon"><FontAwesomeIcon icon={faSearch} /></div>
                    <p>Select a class and click "Load Students"</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========== FEE SETTINGS TAB ========== */}
      {activeTab === 'settings' && (
        <div className="fee-settings-container">
          {/* Action Buttons - Right aligned */}
          <div className="fees-action-bar">
            <div className="action-buttons-right">
              <button className="btn-add" onClick={() => setShowAddForm(!showAddForm)}>
                <FontAwesomeIcon icon={faPlus} /> Add New Fee
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
                  <label>Fee Name <span className="required">*</span></label>
                  <input type="text" placeholder="e.g., Sports Levy" value={newFeeType.name} onChange={(e) => setNewFeeType({...newFeeType, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Amount (₵) <span className="required">*</span></label>
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
                  <th>Amount</th>
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
                        <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
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
                  <tr><td colSpan="6" className="empty-state">
                    <div className="empty-icon"><FontAwesomeIcon icon={faPlus} /></div>
                    <p>No fee settings found. Add fee types to get started.</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedStudentForPayment && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon"><FontAwesomeIcon icon={faMoneyBillWave} /></div>
                <div>
                  <h2>Record Payment</h2>
                  <p className="modal-subtitle">Enter payment details</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label><FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: '6px' }} /> Student</label>
                  <p style={{ fontWeight: 600, margin: '4px 0 0 0', fontSize: '15px', color: '#0f172a' }}>
                    {selectedStudentForPayment.first_name} {selectedStudentForPayment.last_name}
                  </p>
                </div>
                <div className="form-group">
                  <label><FontAwesomeIcon icon={faWallet} style={{ marginRight: '6px' }} /> Balance</label>
                  <p style={{ fontWeight: 600, margin: '4px 0 0 0', fontSize: '15px', color: parseFloat(selectedStudentForPayment.balance || 0) > 0 ? '#dc3545' : '#28a745' }}>
                    ₵{parseFloat(selectedStudentForPayment.balance || 0).toLocaleString()}
                  </p>
                </div>
                <div className="form-group">
                  <label>Fee Type <span className="required">*</span></label>
                  <select value={paymentData.fee_type} onChange={(e) => setPaymentData({...paymentData, fee_type: e.target.value})} required>
                    <option value="">Select Fee Type</option>
                    {feeTypes.map(type => (
                      <option key={type.id} value={type.name}>{type.name} - ₵{parseFloat(type.amount).toLocaleString()}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₵) <span className="required">*</span></label>
                  <input type="number" step="0.01" value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} required placeholder="Enter amount" />
                </div>
                <div className="form-group">
                  <label>Payment Method <span className="required">*</span></label>
                  <select value={paymentData.payment_method} onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="mobile">Mobile Money</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Transaction ID <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                  <input type="text" value={paymentData.transaction_id} onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})} placeholder="e.g., MOMO-123456" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel-modal" onClick={() => setShowPaymentModal(false)}>
                  <FontAwesomeIcon icon={faTimes} /> Cancel
                </button>
                <button type="submit" className="btn-save-modal" disabled={loading}>
                  <FontAwesomeIcon icon={faSave} /> {loading ? 'Processing...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="modal-content receipt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon"><FontAwesomeIcon icon={faReceipt} /></div>
                <div>
                  <h2>Payment Receipt</h2>
                  <p className="modal-subtitle">Transaction confirmed</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowReceiptModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="receipt-details">
                <p><strong>Receipt No:</strong> <span>{receiptData.receipt_number}</span></p>
                <p><strong>Date:</strong> <span>{new Date(receiptData.payment_date).toLocaleDateString()}</span></p>
                <p><strong>Student:</strong> <span>{receiptData.first_name} {receiptData.last_name}</span></p>
                <p><strong>Admission No:</strong> <span>{receiptData.admission_number}</span></p>
                <p><strong>Class:</strong> <span>{receiptData.class_name || 'N/A'}</span></p>
                <p><strong>Fee Type:</strong> <span>{receiptData.fee_type}</span></p>
                <p><strong>Amount Paid:</strong> <span style={{color: '#10b981', fontWeight: 'bold', fontSize: '16px'}}>₵{parseFloat(receiptData.paid_amount).toLocaleString()}</span></p>
                <p><strong>Payment Method:</strong> <span>{receiptData.payment_method?.toUpperCase()}</span></p>
                {receiptData.transaction_id && <p><strong>Transaction ID:</strong> <span>{receiptData.transaction_id}</span></p>}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-modal" onClick={() => setShowReceiptModal(false)}>
                <FontAwesomeIcon icon={faTimes} /> Close
              </button>
              <button className="btn-save-modal" onClick={printReceipt} style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                <FontAwesomeIcon icon={faPrint} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fee Summary Modal */}
      {feeSummary && (
        <div className="modal-overlay" onClick={() => setFeeSummary(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon"><FontAwesomeIcon icon={faChartLine} /></div>
                <div>
                  <h2>Fee Details</h2>
                  <p className="modal-subtitle">Complete fee breakdown</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setFeeSummary(null)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="receipt-details">
                <p><strong>Student:</strong> <span>{feeSummary.student?.first_name} {feeSummary.student?.last_name}</span></p>
                <p><strong>Admission No:</strong> <span>{feeSummary.student?.admission_number}</span></p>
                <p><strong>Class:</strong> <span>{feeSummary.student?.class_name}</span></p>
                <hr style={{ margin: '12px 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />
                <p><strong>Total Fees:</strong> <span>₵{parseFloat(feeSummary.summary?.total_fees || 0).toLocaleString()}</span></p>
                <p><strong>Total Paid:</strong> <span>₵{parseFloat(feeSummary.summary?.total_paid || 0).toLocaleString()}</span></p>
                <p><strong style={{ fontSize: '16px' }}>Balance:</strong> <span style={{ fontSize: '16px', fontWeight: 'bold', color: parseFloat(feeSummary.summary?.total_balance || 0) > 0 ? '#dc3545' : '#28a745' }}>
                  ₵{parseFloat(feeSummary.summary?.total_balance || 0).toLocaleString()}
                </span></p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel-modal" onClick={() => setFeeSummary(null)}>
                <FontAwesomeIcon icon={faTimes} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default Fees;
