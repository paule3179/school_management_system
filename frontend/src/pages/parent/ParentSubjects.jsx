import { apiFetch } from '../../services/api.js';
// src/pages/parent/ParentSubjects.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faSpinner } from '@fortawesome/free-solid-svg-icons';

const ParentSubjects = ({ API_BASE }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const childId = searchParams.get('child');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subjects, setSubjects] = useState([]);

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
            navigate(`/parent/subjects?child=${json.data[0].id}`, { replace: true });
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
        const res = await apiFetch(`${API_BASE}/parent/child/${childId}/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setSubjects(json.data || []);
        } else {
          setError(json.error || 'Failed to load subjects');
        }
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [childId, API_BASE]);

  if (loading) return <div className="loading-state"><FontAwesomeIcon icon={faSpinner} spin /> Loading subjects...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="parent-subjects-page">
      <div className="section-header">
        <h2><FontAwesomeIcon icon={faBook} /> Subjects</h2>
      </div>
      {subjects.length > 0 ? (
        <table className="professional-table">
          <thead><tr><th>Subject Name</th><th>Code</th><th>Hours/Week</th></tr></thead>
          <tbody>
            {subjects.map(sub => (
              <tr key={sub.id}>
                <td>{sub.name}</td>
                <td>{sub.code || '—'}</td>
                <td>{sub.hours_per_week || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">No subjects assigned to this child.</div>
      )}
    </div>
  );
};

export default ParentSubjects;
