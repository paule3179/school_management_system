// src/pages/parent/ParentPerformance.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faSpinner, faTrophy, faCalendarAlt, faStar, faUserGraduate } from '@fortawesome/free-solid-svg-icons';

const ParentPerformance = ({ API_BASE }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const childId = searchParams.get('child');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [children, setChildren] = useState([]);

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
            setChildren(json.data);
            // Auto-select first child
            navigate(`/parent/performance?child=${json.data[0].id}`, { replace: true });
          } else {
            setError('No children found. Contact school administrator.');
            setLoading(false);
          }
        } catch (err) {
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
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/parent/child/${childId}/performance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error || 'Failed to load performance');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [childId, API_BASE]);

  if (loading) return <div className="loading-state"><FontAwesomeIcon icon={faSpinner} spin /> Loading performance...</div>;
  if (error) return <div className="error-state">{error}</div>;
  if (!data) return <div className="empty-state">No data available</div>;

  const { student, performance, recent_grades } = data;
  const { average_score, attendance_rate, subjects, rank } = performance;

  return (
    <div className="parent-performance-page">
      <div className="section-header">
        <h2><FontAwesomeIcon icon={faChartLine} /> Performance</h2>
        <p>{student.first_name} {student.last_name} · {student.class_name || 'No Class'}</p>
      </div>

      <div className="stats-grid performance-summary">
        <div className="stat-card">
          <div className="stat-icon blue"><FontAwesomeIcon icon={faChartLine} /></div>
          <div className="stat-info"><h3>{average_score}%</h3><p>Average Score</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FontAwesomeIcon icon={faTrophy} /></div>
          <div className="stat-info"><h3>{rank || 'N/A'}</h3><p>Class Rank</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FontAwesomeIcon icon={faCalendarAlt} /></div>
          <div className="stat-info"><h3>{attendance_rate}%</h3><p>Attendance Rate</p></div>
        </div>
      </div>

      {subjects && subjects.length > 0 && (
        <div className="subjects-performance">
          <h3><FontAwesomeIcon icon={faStar} /> Subject Performance</h3>
          <div className="subjects-list">
            {subjects.map((sub, idx) => (
              <div key={idx} className="subject-item">
                <div className="subject-info">
                  <span className="subject-name">{sub.name}</span>
                  <span className={`subject-grade grade-${sub.grade?.toLowerCase()}`}>{sub.grade || '—'}</span>
                </div>
                <div className="subject-score">
                  <div className="score-bar"><div className="score-fill" style={{ width: `${Math.min(sub.score, 100)}%` }} /></div>
                  <span className="score-value">{sub.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recent_grades && recent_grades.length > 0 && (
        <div className="recent-grades">
          <h3>Recent Grades</h3>
          <table className="professional-table">
            <thead><tr><th>Subject</th><th>CA</th><th>Exam</th><th>Total</th><th>Grade</th></tr></thead>
            <tbody>
              {recent_grades.map((g, i) => (
                <tr key={i}>
                  <td>{g.subject}</td>
                  <td>{g.continuous_assessment || 0}</td>
                  <td>{g.exam_score || 0}</td>
                  <td><strong>{g.total}</strong></td>
                  <td><span className={`subject-grade grade-${g.grade?.toLowerCase()}`}>{g.grade || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ParentPerformance;