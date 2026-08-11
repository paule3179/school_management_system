// src/pages/parent/ParentAttendance.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faSpinner, faCheckCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

const ParentAttendance = ({ API_BASE }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const childId = searchParams.get('child');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [records, setRecords] = useState([]);

  // Auto-fetch children if no childId in URL
  useEffect(() => {
    if (!childId) {
      const fetchChildren = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${API_BASE}/parent/children`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const json = await res.json();
          if (json.success && json.data && json.data.length > 0) {
            navigate(`/parent/attendance?child=${json.data[0].id}`, { replace: true });
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

  // Fetch attendance records when childId is present
  useEffect(() => {
    if (!childId) return;
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/parent/child/${childId}/attendance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setRecords(json.data || []);
        } else {
          setError(json.error || 'Failed to load attendance');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [childId, API_BASE]);

  if (loading) return <div className="loading-state"><FontAwesomeIcon icon={faSpinner} spin /> Loading attendance...</div>;
  if (error) return <div className="error-state">{error}</div>;

  const present = records.filter(r => r.status?.toLowerCase() === 'present').length;
  const absent = records.filter(r => r.status?.toLowerCase() === 'absent').length;
  const total = records.length;
  const rate = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="parent-attendance-page">
      <div className="section-header">
        <h2><FontAwesomeIcon icon={faCalendarAlt} /> Attendance</h2>
      </div>
      <div className="stats-grid attendance-summary">
        <div className="stat-card">
          <div className="stat-icon green"><FontAwesomeIcon icon={faCheckCircle} /></div>
          <div className="stat-info"><h3>{present}</h3><p>Present</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><FontAwesomeIcon icon={faExclamationTriangle} /></div>
          <div className="stat-info"><h3>{absent}</h3><p>Absent</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FontAwesomeIcon icon={faCalendarAlt} /></div>
          <div className="stat-info"><h3>{rate}%</h3><p>Attendance Rate</p></div>
        </div>
      </div>
      {records.length > 0 ? (
        <table className="professional-table">
          <thead><tr><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {records.map((r, i) => (
              <tr key={i}>
                <td>{new Date(r.date).toLocaleDateString()}</td>
                <td><span className={`status-badge ${r.status?.toLowerCase() === 'present' ? 'present' : 'absent'}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <div className="empty-state">No attendance records found.</div>}
    </div>
  );
};

export default ParentAttendance;