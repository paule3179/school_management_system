// src/pages/parent/ParentAttendance.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faSpinner, faUserGraduate } from '@fortawesome/free-solid-svg-icons';

const ParentAttendance = ({ API_BASE }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          await loadAttendance(data.data[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load children.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadAttendance = useCallback(async (childId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/parent/child/${childId}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAttendance(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to load attendance.');
      }
    } catch (err) {
      setError('Network error while loading attendance.');
    }
  }, [API_BASE]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const handleChildChange = (child) => {
    setSelectedChild(child);
    setAttendance(null);
    loadAttendance(child.id);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <FontAwesomeIcon icon={faSpinner} spin /> Loading attendance...
      </div>
    );
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  // Compute summary from attendance records array
  const attendanceArray = Array.isArray(attendance) ? attendance : [];
  const presentCount = attendanceArray.filter(a => a.status?.toLowerCase() === 'present').length;
  const absentCount = attendanceArray.filter(a => a.status?.toLowerCase() === 'absent').length;
  const totalCount = attendanceArray.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  return (
    <div className="parent-attendance-page">
      <div className="section-header">
        <h2><FontAwesomeIcon icon={faCalendarAlt} /> Attendance Records</h2>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">No children found.</div>
      ) : (
        <>
          <div className="child-selector">
            <label><FontAwesomeIcon icon={faUserGraduate} style={{ marginRight: '6px' }} /> Select Child:</label>
            <div className="select-wrapper">
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
            <span className="child-info">{children.length} child{children.length !== 1 ? 'ren' : ''} registered</span>
          </div>

          {attendance && (
            <div className="attendance-container">
              <div className="stats-grid attendance-summary">
                <div className="stat-card">
                  <div className="stat-icon green">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                  <div className="stat-info">
                    <h3>{presentCount}</h3>
                    <p>Present</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon red">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                  <div className="stat-info">
                    <h3>{absentCount}</h3>
                    <p>Absent</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon purple">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                  </div>
                  <div className="stat-info">
                    <h3>{percentage}%</h3>
                    <p>Attendance Rate</p>
                  </div>
                </div>
              </div>

              <div className="attendance-log">
                <h3>Daily Attendance Log</h3>
                {attendanceArray.length > 0 ? (
                  <table className="professional-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceArray.map((rec, idx) => (
                        <tr key={idx}>
                          <td>{new Date(rec.date).toLocaleDateString()}</td>
                          <td>
                            <span className={`status-badge ${rec.status?.toLowerCase() === 'present' ? 'present' : 'absent'}`}>
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>No attendance records found.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParentAttendance;