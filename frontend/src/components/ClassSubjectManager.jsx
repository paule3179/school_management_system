// frontend/src/components/ClassSubjectManager.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBook, faPlus, faTrash, faTimes, faClock, 
  faChalkboardTeacher, faCheck, faExclamationTriangle,
   
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from './ToastNotification';

const ClassSubjectManager = ({ API_BASE, classId, onSave }) => {
  const [subjects, setSubjects] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [editData, setEditData] = useState({
    hours_per_week: '',
    teacher_id: '',
    priority: 1
  });
  const [teachers, setTeachers] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);

  useEffect(() => {
    if (classId) {
      loadClassSubjects();
      loadAvailableSubjects();
      loadTeachers();
    }
  }, [classId]);

  const loadClassSubjects = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/class-subjects/class/${classId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success) {
        setClassSubjects(result.data || []);
      }
    } catch (error) {
      console.error('Error loading class subjects:', error);
      showToast('Error loading class subjects', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/subjects`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success) {
        setSubjects(result.data || []);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/teachers`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success) {
        setTeachers(result.data || []);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const addSubjectToClass = async () => {
    if (!selectedSubject) {
      showToast('Please select a subject', 'warning');
      return;
    }
    if (!editData.hours_per_week || editData.hours_per_week <= 0) {
      showToast('Please enter valid hours per week', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/class-subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          class_id: classId,
          subject_id: selectedSubject,
          hours_per_week: parseInt(editData.hours_per_week),
          teacher_id: editData.teacher_id || null,
          priority: editData.priority || 1
        })
      });
      const result = await response.json();
      if (result.success) {
        showToast('Subject added to class successfully!');
        loadClassSubjects();
        setShowAddModal(false);
        setSelectedSubject(null);
        setEditData({ hours_per_week: '', teacher_id: '', priority: 1 });
        if (onSave) onSave();
      } else {
        showToast(result.error || 'Error adding subject', 'error');
      }
    } catch (error) {
      console.error('Error adding subject:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeSubjectFromClass = async (classSubjectId, subjectName) => {
    if (!window.confirm(`Remove "${subjectName}" from this class?`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/class-subjects/${classSubjectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        showToast(`"${subjectName}" removed from class`);
        loadClassSubjects();
        if (onSave) onSave();
      } else {
        showToast(result.error || 'Error removing subject', 'error');
      }
    } catch (error) {
      console.error('Error removing subject:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateClassSubject = async (classSubjectId, field, value) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/class-subjects/${classSubjectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [field]: value })
      });
      const result = await response.json();
      if (result.success) {
        showToast('Updated successfully!');
        loadClassSubjects();
        if (onSave) onSave();
      }
    } catch (error) {
      console.error('Error updating:', error);
      showToast('Error updating', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSubjectsList = () => {
    const assignedIds = classSubjects.map(cs => cs.subject_id);
    return subjects.filter(s => !assignedIds.includes(s.id));
  };

  return (
    <div className="class-subject-manager">
      <div className="manager-header">
        <h3><FontAwesomeIcon icon={faBook} /> Class Subjects</h3>
        <button 
          className="btn-add-small" 
          onClick={() => setShowAddModal(true)}
          disabled={getAvailableSubjectsList().length === 0}
        >
          <FontAwesomeIcon icon={faPlus} /> Add Subject
        </button>
      </div>

      {loading && <div className="loading-spinner">Loading...</div>}

      {!loading && classSubjects.length === 0 && (
        <div className="no-data">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          <p>No subjects assigned to this class yet.</p>
          <button 
            className="btn-primary" 
            onClick={() => setShowAddModal(true)}
            disabled={getAvailableSubjectsList().length === 0}
          >
            <FontAwesomeIcon icon={faPlus} /> Add First Subject
          </button>
        </div>
      )}

      {classSubjects.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Hours/Week</th>
                <th>Teacher</th>
                <th>Priority</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classSubjects.map(cs => (
                <tr key={cs.id}>
                  <td className="subject-cell">
                    <strong>{cs.subject_name}</strong>
                    {cs.subject_code && <span className="subject-code"> ({cs.subject_code})</span>}
                  </td>
                  <td className="hours-cell">
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={cs.hours_per_week}
                      onChange={(e) => updateClassSubject(cs.id, 'hours_per_week', parseInt(e.target.value))}
                      className="hours-input"
                    />
                  </td>
                  <td className="teacher-cell">
                    <select
                      value={cs.teacher_id || ''}
                      onChange={(e) => updateClassSubject(cs.id, 'teacher_id', e.target.value || null)}
                      className="teacher-select"
                    >
                      <option value="">Not Assigned</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.first_name} {t.last_name} - {t.department || 'Teacher'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="priority-cell">
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={cs.priority || 1}
                      onChange={(e) => updateClassSubject(cs.id, 'priority', parseInt(e.target.value))}
                      className="priority-input"
                    />
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-delete-small"
                      onClick={() => removeSubjectFromClass(cs.id, cs.subject_name)}
                      title="Remove from class"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Subject Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Subject to Class</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Subject</label>
                <select
                  value={selectedSubject || ''}
                  onChange={(e) => setSelectedSubject(parseInt(e.target.value))}
                  className="filter-select"
                >
                  <option value="">Choose a subject...</option>
                  {getAvailableSubjectsList().map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.code ? `(${s.code})` : ''}
                    </option>
                  ))}
                </select>
                {getAvailableSubjectsList().length === 0 && (
                  <small className="warning-text">
                    All subjects are already assigned to this class.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label><FontAwesomeIcon icon={faClock} /> Hours per Week *</label>
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={editData.hours_per_week}
                  onChange={(e) => setEditData({...editData, hours_per_week: e.target.value})}
                  placeholder="e.g., 4"
                  required
                />
              </div>

              <div className="form-group">
                <label><FontAwesomeIcon icon={faChalkboardTeacher} /> Assign Teacher (Optional)</label>
                <select
                  value={editData.teacher_id}
                  onChange={(e) => setEditData({...editData, teacher_id: e.target.value})}
                  className="filter-select"
                >
                  <option value="">Not Assigned</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.first_name} {t.last_name} - {t.department || 'Teacher'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Priority (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editData.priority}
                  onChange={(e) => setEditData({...editData, priority: e.target.value})}
                  placeholder="Higher number = higher priority"
                />
                <small>Higher priority subjects get better time slots in timetable</small>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn-save"
                onClick={addSubjectToClass}
                disabled={loading || !selectedSubject || !editData.hours_per_week}
              >
                <FontAwesomeIcon icon={faCheck} /> Add to Class
              </button>
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default ClassSubjectManager;