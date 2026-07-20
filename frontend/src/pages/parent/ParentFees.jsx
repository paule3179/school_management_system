import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMoneyBillWave,
  faWallet,
  faExclamationTriangle,
  faCheckCircle,
  faSpinner,
  faReceipt,
  faCreditCard,
  faUniversity,
  faTimes,
  faSave,
  faPrint,
  faUserGraduate
} from '@fortawesome/free-solid-svg-icons';
import schoolLogo from '/src/assets/logo.png';

const ParentFees = ({ API_BASE }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [fees, setFees] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    fee_type: '',
    amount: '',
    payment_method: 'cash',
    transaction_id: ''
  });
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(null);

  // Receipt modal state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // Load children list
  const loadChildren = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/parent/children`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setChildren(data.data || []);
        if (data.data.length > 0) {
          setSelectedChild(data.data[0]);
          await loadFees(data.data[0].id);
        }
      } else {
        setError('Failed to load children.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Load fees for a specific child
  const loadFees = useCallback(async (childId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/parent/child/${childId}/fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFees(data.data || []);
        setError(null);
      } else {
        setError(data.message || 'Failed to load fee records.');
      }
    } catch {
      setError('Network error while loading fee records.');
    }
  }, [API_BASE]);

  // Initial load
  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  // Handle child change
  const handleChildChange = (child) => {
    setSelectedChild(child);
    setFees(null);
    setError(null);
    loadFees(child.id);
  };

  // Open payment modal for a specific fee
  const openPaymentModal = (fee) => {
    setPaymentData({
      fee_type: fee.fee_type,
      amount: fee.balance > 0 ? String(fee.balance) : String(fee.amount || 0),
      payment_method: 'cash',
      transaction_id: ''
    });
    setPaymentError(null);
    setPaymentSuccess(null);
    setShowPaymentModal(true);
  };

  // Open payment modal for custom fee
  const openCustomPaymentModal = () => {
    setPaymentData({
      fee_type: '',
      amount: '',
      payment_method: 'cash',
      transaction_id: ''
    });
    setPaymentError(null);
    setPaymentSuccess(null);
    setShowPaymentModal(true);
  };

  // Handle payment submission
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setPaymentProcessing(true);
    setPaymentError(null);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPaymentError('Please login to continue');
        setPaymentProcessing(false);
        return;
      }

      if (!selectedChild) {
        setPaymentError('No child selected');
        setPaymentProcessing(false);
        return;
      }

      if (!paymentData.fee_type || !paymentData.amount || !paymentData.payment_method) {
        setPaymentError('Fee type, amount, and payment method are required');
        setPaymentProcessing(false);
        return;
      }

      const requestBody = {
        fee_type: paymentData.fee_type,
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.payment_method,
        transaction_id: paymentData.transaction_id || null,
        term: 1,
        term_name: 'Term 1',
        academic_year: '2024-2025'
      };

      const response = await fetch(`${API_BASE}/parent/child/${selectedChild.id}/pay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.success) {
        setPaymentSuccess(result.message || 'Payment recorded successfully!');

        // Set receipt data
        setReceiptData({
          receipt_number: result.receipt?.receipt_number || result.data?.receipt_number || `RCP-${Date.now()}`,
          payment_date: result.receipt?.payment_date || new Date().toISOString(),
          first_name: selectedChild.first_name,
          last_name: selectedChild.last_name,
          admission_number: selectedChild.admission_number,
          class_name: selectedChild.class_name || 'N/A',
          fee_type: paymentData.fee_type,
          paid_amount: paymentData.amount,
          payment_method: paymentData.payment_method,
          transaction_id: paymentData.transaction_id,
        });

        setTimeout(() => {
          setShowReceiptModal(true);
        }, 1000);
      } else {
        setPaymentError(result.error || 'Payment failed. Please try again.');
      }
    } catch (err) {
      setPaymentError('Network error: ' + err.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // Print receipt
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
              <h1>School Management System</h1>
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

  // Compute summary from fees array
  const feesArray = Array.isArray(fees) ? fees : [];
  const totalFees = feesArray.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
  const totalPaid = feesArray.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);
  const totalBalance = feesArray.reduce((sum, f) => sum + parseFloat(f.balance || 0), 0);
  const paidCount = feesArray.filter(f => f.status?.toLowerCase() === 'paid' || f.balance <= 0).length;

  const getStatusBadge = (balance, status) => {
    if (status?.toLowerCase() === 'paid' || balance <= 0) {
      return { className: 'status-paid', text: 'PAID' };
    }
    if (balance > 0 && status?.toLowerCase() === 'partial') {
      return { className: 'status-partial', text: 'PARTIAL' };
    }
    return { className: 'status-unpaid', text: 'UNPAID' };
  };

  const getPaymentMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'cash': return faMoneyBillWave;
      case 'mobile': return faCreditCard;
      case 'bank': return faUniversity;
      default: return faWallet;
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <FontAwesomeIcon icon={faSpinner} spin /> Loading fee records...
      </div>
    );
  }

  if (error && !selectedChild) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="parent-fees-page">
      <div className="section-header">
        <h2><FontAwesomeIcon icon={faMoneyBillWave} /> Fee Records</h2>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">No children found.</div>
      ) : (
        <>
          {/* Child Selector */}
          <div className="child-selector">
            <label>Select Child:</label>
            <select
              className="child-dropdown"
              value={selectedChild?.id || ''}
              onChange={(e) => {
                const child = children.find(c => c.id === parseInt(e.target.value));
                if (child) handleChildChange(child);
              }}
            >
              {children.map(child => (
                <option key={child.id} value={child.id}>
                  {child.first_name} {child.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Fee Summary */}
          {fees && (
            <div className="fees-container">
              <div className="stats-grid fees-summary">
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <FontAwesomeIcon icon={faMoneyBillWave} />
                  </div>
                  <div className="stat-info">
                    <h3>₵{totalFees.toLocaleString()}</h3>
                    <p>Total Fees</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </div>
                  <div className="stat-info">
                    <h3>₵{totalPaid.toLocaleString()}</h3>
                    <p>Total Paid</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon yellow">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                  </div>
                  <div className="stat-info">
                    <h3>₵{totalBalance.toLocaleString()}</h3>
                    <p>Outstanding</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon purple">
                    <FontAwesomeIcon icon={faWallet} />
                  </div>
                  <div className="stat-info">
                    <h3>{paidCount}/{feesArray.length}</h3>
                    <p>Paid Items</p>
                  </div>
                </div>
              </div>

              {/* Pay Button */}
              {totalBalance > 0 && (
                <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                  <button
                    className="btn-primary"
                    onClick={openCustomPaymentModal}
                    style={{ padding: '12px 24px', fontSize: '14px' }}
                  >
                    <FontAwesomeIcon icon={faMoneyBillWave} /> Pay Outstanding (₵{totalBalance.toLocaleString()})
                  </button>
                </div>
              )}

              {/* Fee Records Table */}
              <div className="table-container">
                <table className="professional-table">
                  <thead>
                    <tr>
                      <th>Fee Type</th>
                      <th>Amount (₵)</th>
                      <th>Paid (₵)</th>
                      <th>Balance (₵)</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Receipt</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feesArray.length > 0 ? (
                      feesArray.map((fee, idx) => {
                        const amount = parseFloat(fee.amount || 0);
                        const paid = parseFloat(fee.paid_amount || 0);
                        const balance = parseFloat(fee.balance || 0);
                        const badge = getStatusBadge(balance, fee.status);
                        const canPay = balance > 0;
                        return (
                          <tr key={fee.id || idx}>
                            <td>
                              <strong>{fee.fee_type || '-'}</strong>
                              {fee.term_name && (
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: '11px' }}>
                                  {fee.term_name} • {fee.academic_year || 'N/A'}
                                </small>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>₵{amount.toLocaleString()}</td>
                            <td style={{ textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                              ₵{paid.toLocaleString()}
                            </td>
                            <td style={{
                              textAlign: 'center',
                              color: balance > 0 ? '#dc2626' : '#059669',
                              fontWeight: 700
                            }}>
                              ₵{balance.toLocaleString()}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`status-badge ${badge.className}`}>{badge.text}</span>
                            </td>
                            <td>
                              {fee.payment_date
                                ? new Date(fee.payment_date).toLocaleDateString()
                                : <span style={{ color: '#94a3b8' }}>—</span>
                              }
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {fee.payment_method ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <FontAwesomeIcon icon={getPaymentMethodIcon(fee.payment_method)} style={{ fontSize: '11px', color: '#64748b' }} />
                                  <span style={{ textTransform: 'capitalize', fontSize: '12px' }}>{fee.payment_method}</span>
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {fee.receipt_number ? (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  background: '#f1f5f9',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  color: '#475569',
                                  fontFamily: 'monospace'
                                }}>
                                  <FontAwesomeIcon icon={faReceipt} style={{ fontSize: '10px' }} />
                                  {fee.receipt_number}
                                </span>
                              ) : (
                                <span style={{ color: '#94a3b8' }}>—</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              {canPay ? (
                                <button
                                  className="btn-pay-now"
                                  onClick={() => openPaymentModal(fee)}
                                  style={{
                                    padding: '6px 14px',
                                    background: '#059669',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  <FontAwesomeIcon icon={faMoneyBillWave} /> Pay Now
                                </button>
                              ) : (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  color: '#059669',
                                  fontSize: '12px',
                                  fontWeight: 600
                                }}>
                                  <FontAwesomeIcon icon={faCheckCircle} /> Paid
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="9" className="empty-state">
                          <div className="empty-icon"><FontAwesomeIcon icon={faReceipt} /></div>
                          <p>No fee records found for this student.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => !paymentProcessing && setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon"><FontAwesomeIcon icon={faMoneyBillWave} /></div>
                <div>
                  <h2>Make Payment</h2>
                  <p className="modal-subtitle">Pay fee for {selectedChild?.first_name} {selectedChild?.last_name}</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => !paymentProcessing && setShowPaymentModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handlePaymentSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label><FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: '6px' }} /> Student</label>
                  <p style={{ fontWeight: 600, margin: '4px 0 0 0', fontSize: '15px', color: '#0f172a' }}>
                    {selectedChild?.first_name} {selectedChild?.last_name}
                    <span style={{ fontWeight: 400, fontSize: '13px', color: '#64748b', marginLeft: '8px' }}>
                      ({selectedChild?.admission_number})
                    </span>
                  </p>
                </div>

                {paymentSuccess ? (
                  <div style={{
                    padding: '16px',
                    background: '#d1fae5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '8px',
                    color: '#065f46',
                    textAlign: 'center',
                    fontWeight: 600
                  }}>
                    <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '8px' }} />
                    {paymentSuccess}
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Fee Type <span className="required">*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={paymentData.fee_type}
                        onChange={(e) => setPaymentData({...paymentData, fee_type: e.target.value})}
                        placeholder="e.g., School Fees, PTA Levy"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Amount (₵) <span className="required">*</span></label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        value={paymentData.amount}
                        onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                        placeholder="Enter amount"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Payment Method <span className="required">*</span></label>
                      <select
                        className="form-select"
                        value={paymentData.payment_method}
                        onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                      >
                        <option value="cash">Cash</option>
                        <option value="mobile">Mobile Money</option>
                        <option value="bank">Bank Transfer</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Transaction ID <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={paymentData.transaction_id}
                        onChange={(e) => setPaymentData({...paymentData, transaction_id: e.target.value})}
                        placeholder="e.g., MOMO-123456"
                      />
                    </div>

                    {paymentError && (
                      <div style={{
                        padding: '12px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: '8px',
                        color: '#991b1b',
                        fontSize: '13px',
                        marginBottom: '12px'
                      }}>
                        <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '6px' }} />
                        {paymentError}
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-cancel-modal"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentProcessing}
                >
                  <FontAwesomeIcon icon={faTimes} /> Cancel
                </button>
                {!paymentSuccess && (
                  <button
                    type="submit"
                    className="btn-save-modal"
                    disabled={paymentProcessing}
                  >
                    <FontAwesomeIcon icon={paymentProcessing ? faSpinner : faSave} spin={paymentProcessing} />
                    {paymentProcessing ? 'Processing...' : 'Pay Now'}
                  </button>
                )}
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
                  <p className="modal-subtitle">Transaction confirmed successfully</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowReceiptModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="receipt-details">
                <div className="receipt-row-detail">
                  <span className="receipt-label-detail">Receipt No:</span>
                  <span className="receipt-value-detail">{receiptData.receipt_number}</span>
                </div>
                <div className="receipt-row-detail">
                  <span className="receipt-label-detail">Date:</span>
                  <span className="receipt-value-detail">{new Date(receiptData.payment_date).toLocaleDateString()}</span>
                </div>
                <div className="receipt-row-detail">
                  <span className="receipt-label-detail">Student:</span>
                  <span className="receipt-value-detail">{receiptData.first_name} {receiptData.last_name}</span>
                </div>
                <div className="receipt-row-detail">
                  <span className="receipt-label-detail">Admission No:</span>
                  <span className="receipt-value-detail">{receiptData.admission_number}</span>
                </div>
                <div className="receipt-row-detail">
                  <span className="receipt-label-detail">Class:</span>
                  <span className="receipt-value-detail">{receiptData.class_name}</span>
                </div>
                <div className="receipt-row-detail">
                  <span className="receipt-label-detail">Fee Type:</span>
                  <span className="receipt-value-detail">{receiptData.fee_type}</span>
                </div>
                <div className="receipt-row-detail">
                  <span className="receipt-label-detail">Payment Method:</span>
                  <span className="receipt-value-detail">{receiptData.payment_method?.toUpperCase()}</span>
                </div>
                {receiptData.transaction_id && (
                  <div className="receipt-row-detail">
                    <span className="receipt-label-detail">Transaction ID:</span>
                    <span className="receipt-value-detail">{receiptData.transaction_id}</span>
                  </div>
                )}
                <hr style={{ margin: '12px 0', border: 'none', borderTop: '2px solid #e2e8f0' }} />
                <div className="receipt-row-detail" style={{ marginTop: '12px' }}>
                  <span className="receipt-label-detail" style={{ fontSize: '15px', fontWeight: 700 }}>Amount Paid:</span>
                  <span className="receipt-value-detail" style={{ color: '#10b981', fontWeight: 'bold', fontSize: '18px' }}>
                    ₵{parseFloat(receiptData.paid_amount).toLocaleString()}
                  </span>
                </div>
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

      {/* Receipt Detail Styles */}
      <style>{`
        .receipt-details {
          padding: 8px 0;
        }
        .receipt-row-detail {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #f1f5f9;
        }
        .receipt-row-detail:last-child {
          border-bottom: none;
        }
        .receipt-label-detail {
          color: #64748b;
          font-size: 13px;
          font-weight: 500;
        }
        .receipt-value-detail {
          color: #0f172a;
          font-size: 14px;
          font-weight: 600;
          text-align: right;
        }
        .btn-pay-now:hover {
          background: #047857 !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(5, 150, 105, 0.3);
        }
      `}</style>
    </div>
  );
};

export default ParentFees;

