// src/pages/parent/ParentSubjects.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBook, faSpinner, faUserGraduate } from '@fortawesome/free-solid-svg-icons';

const ParentSubjects = ({ API_BASE }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [subjects, setSubjects] = useState([]);
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
          await loadSubjects(data.data[0].id);
        }
      }
    } catch (err) {
      setError('Failed to load children.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadSubjects = useCallback(async (childId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/parent/child/${childId}/subjects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSubjects(data.data || []);
        setError(null);
      } else {
        setError(data.message || 'Failed to load subjects.');
      }
    } catch (err) {
      setError('Network error while loading subjects.');
    }
  }, [API_BASE]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const handleChildChange = (child) => {
    setSelectedChild(child);
    setSubjects([]);
    loadSubjects(child.id);
  };

  if (loading) {
    return (
      <div className="loading-state">
        <FontAwesomeIcon icon={faSpinner} spin /> Loading subjects...
      </div>
    );
  }

  if (error) {
    return <div className="error-state">{error}</div>;
  }

  return (
    <div className="parent-subjects-page">
      <div className="section-header">
        <h2><FontAwesomeIcon icon={faBook} /> Subjects</h2>
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

          <div className="subjects-container">
            {subjects.length > 0 ? (
              <div className="table-container">
                <table className="professional-table">
                  <thead>
                    <tr>
                      <th>Subject Name</th>
                      <th>Code</th>
                      <th>Hours/Week</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((sub) => (
                      <tr key={sub.id}>
                        <td>
                          <div className="subject-cell">
                            <span className="subject-name" style={{ fontWeight: 600 }}>{sub.name}</span>
                          </div>
                        </td>
                        <td><span className="code-badge">{sub.code || '—'}</span></td>
                        <td>{sub.hours_per_week ? `${sub.hours_per_week}h` : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No subjects assigned to this child.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ParentSubjects;