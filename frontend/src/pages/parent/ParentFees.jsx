import { apiFetch } from '../../services/api.js';
// src/pages/parent/ParentFees.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoneyBillWave, faSpinner, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ParentFees = ({ API_BASE }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const childId = searchParams.get('child');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fees, setFees] = useState([]);

  // Auto-fetch children if no childId in URL
  useEffect(() => {
    if (!childId) {
      const fetchChildren = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await apiFetch(`${API_BASE}/parent/children`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const json = await res.json();
          if (json.success && json.data && json.data.length > 0) {
            navigate(`/parent/fees?child=${json.data[0].id}`, { replace: true });
          } else {
            setError('No children found. Contact school administrator.');
            setLoading(false);
          }
        } catch {
          setError('Failed to load children');
          setLoading(false);
        }
      };
      fetchChildren();
    }
  }, [childId, API_BASE, navigate]);

  useEffect(() => {
    if (!childId) return;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await apiFetch(`${API_BASE}/parent/child/${childId}/fees`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setFees(json.data || []);
        } else {
          setError(json.error || 'Failed to load fees');
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [childId, API_BASE]);

  if (loading) return <div className="loading-state"><FontAwesomeIcon icon={faSpinner} spin /> Loading fees...</div>;
  if (error) return <div className="error-state">{error}</div>;

  const total = fees.reduce((sum, f) => sum + parseFloat(f.amount || 0), 0);
  const paid = fees.reduce((sum, f) => sum + parseFloat(f.paid_amount || 0), 0);
  const balance = fees.reduce((sum, f) => sum + parseFloat(f.balance || 0), 0);

  return (
    <div className="parent-fees-page">
      <div className="section-header">
        <h2><FontAwesomeIcon icon={faMoneyBillWave} /> Fees</h2>
      </div>
      <div className="stats-grid fees-summary">
        <div className="stat-card">
          <div className="stat-icon blue"><FontAwesomeIcon icon={faMoneyBillWave} /></div>
          <div className="stat-info"><h3>₵{total.toFixed(2)}</h3><p>Total Fees</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FontAwesomeIcon icon={faCheckCircle} /></div>
          <div className="stat-info"><h3>₵{paid.toFixed(2)}</h3><p>Paid</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FontAwesomeIcon icon={faExclamationTriangle} /></div>
          <div className="stat-info"><h3>₵{balance.toFixed(2)}</h3><p>Balance</p></div>
        </div>
      </div>
      {fees.length > 0 ? (
        <table className="professional-table">
          <thead><tr><th>Fee Type</th><th>Amount (₵)</th><th>Paid (₵)</th><th>Balance (₵)</th><th>Status</th></tr></thead>
          <tbody>
            {fees.map((f, i) => (
              <tr key={i}>
                <td>{f.fee_type}</td>
                <td>{parseFloat(f.amount || 0).toFixed(2)}</td>
                <td>{parseFloat(f.paid_amount || 0).toFixed(2)}</td>
                <td>{parseFloat(f.balance || 0).toFixed(2)}</td>
                <td><span className={`status-badge ${f.status?.toLowerCase() === 'paid' ? 'paid' : 'pending'}`}>{f.status || 'Pending'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="empty-state">No fee records found.</div>}
    </div>
  );
};

export default ParentFees;
