// src/pages/parent/ParentPerformance.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChartLine, faStar, faTrophy, faCalendarCheck, faSpinner, faUserGraduate
} from '@fortawesome/free-solid-svg-icons';

const ParentPerformance = ({ API_BASE }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          // Load performance for the first child
          await loadPerformance(data.data[0].id);
        }
      } else {
        setError('Failed to load children.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Load performance for a specific child
  const loadPerformance = useCallback(async (childId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/parent/child/${childId}/performance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPerformance(data.data);
        setError(null);
      } else {
        setError(data.message || 'Failed to load performance.');
      }
    } catch (err) {
      setError('Network error while loading performance.');
    }
  }, [API_BASE]);

  // Initial load
  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  // Handle child change
  const handleChildChange = (child) => {
    setSelectedChild(child);
    setPerformance(null);
    loadPerformance(child.id);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <FontAwesomeIcon icon={faSpinner} spin /> Loading performance data...
      </div>
    );
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="parent-performance-page">
      <div className="section-header">
        <h2><FontAwesomeIcon icon={faChartLine} /> Performance Overview</h2>
      </div>

      {children.length === 0 ? (
        <div className="empty-state">No children found. Please contact the school administrator.</div>
      ) : (
        <>
{/* Child Selector */}
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

          {/* Performance Summary */}
          {performance && (
            <div className="performance-container">
              <div className="stats-grid performance-summary">
                <div className="stat-card">
                  <div className="stat-icon blue">
                    <FontAwesomeIcon icon={faChartLine} />
                  </div>
                  <div className="stat-info">
                    <h3>{performance.average_score ?? 0}%</h3>
                    <p>Average Score</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green">
                    <FontAwesomeIcon icon={faTrophy} />
                  </div>
                  <div className="stat-info">
                    <h3>{performance.rank ?? 'N/A'}</h3>
                    <p>Class Rank</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon purple">
                    <FontAwesomeIcon icon={faCalendarCheck} />
                  </div>
                  <div className="stat-info">
                    <h3>{performance.attendance_rate ?? 0}%</h3>
                    <p>Attendance Rate</p>
                  </div>
                </div>
              </div>

              {/* Subject Breakdown */}
              <div className="subjects-performance">
                <h3><FontAwesomeIcon icon={faStar} /> Subject Performance</h3>
                {performance.subjects && performance.subjects.length > 0 ? (
                  <div className="subjects-list">
                    {performance.subjects.map(subject => (
                      <div key={subject.id || subject.subject_id} className="subject-item">
                        <div className="subject-info">
                          <span className="subject-name">{subject.name}</span>
                          <span className={`subject-grade grade-${subject.grade?.toLowerCase()}`}>
                            {subject.grade || '—'}
                          </span>
                        </div>
                        <div className="subject-score">
                          <div className="score-bar">
                            <div className="score-fill" style={{ width: `${Math.min(subject.score, 100)}%` }}></div>
                          </div>
                          <span className="score-value">{subject.score ?? 0}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No subject data available.</p>
                )}
              </div>

              {/* Teacher Remarks */}
              <div className="teacher-remarks">
                <h3>Teacher's Remark</h3>
                <p>{performance.comment || 'No remarks provided.'}</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ParentPerformance;