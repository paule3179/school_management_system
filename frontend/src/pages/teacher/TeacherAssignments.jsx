import { apiFetch } from '../../services/api.js';
// src/pages/teacher/TeacherAssignments.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUpload,
  faPlus,
  faEdit,
  faTrash,
  faTimes,
  faSave,
  faSpinner,
  faFileAlt,
  faCalendarAlt,
  faSchool,
  faRefresh,
  faCheckCircle,
  faDownload,
  faClock
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../../components/ToastNotification';
import './TeacherAssignments.css';

const TeacherAssignments = ({ API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api') }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [toast, setToast] = useState(null);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
  });
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    due_date: '',
    max_score: 100,
    type: 'assignment',
    status: 'active',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    loadAssignments();
    loadClasses();
  }, []);

  const loadAssignments = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/teacher/assignments`, {
        headers: headers
      });
      const data = await response.json();
      
      if (data.success) {
        const assignmentsData = data.data || [];
        setAssignments(assignmentsData);
        
        const active = assignmentsData.filter(a => a.status === 'active').length;
        const completed = assignmentsData.filter(a => a.status === 'completed').length;
        setStats({
          total: assignmentsData.length,
          active: active,
          completed: completed,
        });
      } else {
        setFallbackData();
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      setFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const setFallbackData = () => {
    const fallback = [
      {
        id: 1,
        title: 'Mathematics Assignment 1',
        description: 'Complete all questions from Chapter 5. Show all working steps.',
        class_id: 1,
        class_name: 'JHS 1A',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        max_score: 100,
        type: 'assignment',
        status: 'active',
        created_at: new Date().toISOString(),
        submissions: 0,
      },
      {
        id: 2,
        title: 'English Essay',
        description: 'Write a 500-word essay on "The Importance of Education".',
        class_id: 2,
        class_name: 'JHS 2A',
        due_date: new Date(Date.now() + 14 * 86400000).toISOString(),
        max_score: 50,
        type: 'assignment',
        status: 'active',
        created_at: new Date().toISOString(),
        submissions: 3,
      },
    ];
    setAssignments(fallback);
    setStats({
      total: fallback.length,
      active: fallback.filter(a => a.status === 'active').length,
      completed: 0,
    });
  };

  const loadClasses = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/teacher/classes`, {
        headers: headers
      });
      const data = await response.json();
      if (data.success) {
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const url = editingAssignment 
        ? `${API_BASE}/teacher/assignments/${editingAssignment.id}`
        : `${API_BASE}/teacher/assignments`;
      const method = editingAssignment ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        showToast(editingAssignment ? 'Assignment updated!' : 'Assignment created!');
        setShowModal(false);
        resetForm();
        loadAssignments();
      } else {
        showToast(data.error || 'Failed to save assignment', 'error');
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    
    try {
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/teacher/assignments/${id}`, {
        method: 'DELETE',
        headers: headers
      });
      
      if (response.ok) {
        showToast('Assignment deleted!');
        loadAssignments();
      } else {
        showToast('Failed to delete assignment', 'error');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      showToast('Network error', 'error');
    }
  };

  const handleEdit = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description,
      class_id: assignment.class_id || '',
      due_date: assignment.due_date ? assignment.due_date.split('T')[0] : '',
      max_score: assignment.max_score || 100,
      type: assignment.type || 'assignment',
      status: assignment.status || 'active',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingAssignment(null);
    setFormData({
      title: '',
      description: '',
      class_id: '',
      due_date: '',
      max_score: 100,
      type: 'assignment',
      status: 'active',
    });
  };

  const getTypeBadgeClass = (type) => {
    const types = {
      assignment: 'type-assignment',
      quiz: 'type-quiz',
      project: 'type-project',
      homework: 'type-homework',
    };
    return types[type] || 'type-assignment';
  };

  const getDaysRemaining = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 'Overdue';
    if (diff === 0) return 'Due Today';
    return `${diff} days remaining`;
  };

  if (loading && assignments.length === 0) {
    return (
      <div className="teacher-assignments-page loading-state">
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Loading assignments...</span>
      </div>
    );
  }

  return (
    <div className="teacher-assignments-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faFileAlt} />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Assignments</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="stat-info">
            <h3>{stats.active}</h3>
            <p>Active</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div className="stat-info">
            <h3>{stats.completed}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faDownload} />
          </div>
          <div className="stat-info">
            <h3>{assignments.reduce((sum, a) => sum + (a.submissions || 0), 0)}</h3>
            <p>Total Submissions</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <div className="page-icon">
            <FontAwesomeIcon icon={faUpload} />
          </div>
          <div>
            <h1>Assignments</h1>
            <p className="page-description">Create and manage assignments for your classes</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn-refresh" onClick={loadAssignments} disabled={loading}>
            <FontAwesomeIcon icon={faRefresh} spin={loading} />
            Refresh
          </button>
          <button className="btn-add" onClick={() => { resetForm(); setShowModal(true); }}>
            <FontAwesomeIcon icon={faPlus} /> New Assignment
          </button>
        </div>
      </div>

      {/* Assignments List */}
      <div className="assignments-list">
        {assignments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FontAwesomeIcon icon={faUpload} />
            </div>
            <h3>No Assignments</h3>
            <p>You haven't created any assignments yet.</p>
            <button className="btn-add" onClick={() => { resetForm(); setShowModal(true); }}>
              <FontAwesomeIcon icon={faPlus} /> Create Your First Assignment
            </button>
          </div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment.id} className="assignment-card">
              <div className="assignment-header">
                <div className="assignment-title">
                  <h3>{assignment.title}</h3>

                  <span className={`type-badge ${getTypeBadgeClass(assignment.type)}`}>
                    {assignment.type || 'Assignment'}
                  </span>
                </div>

                <div className="assignment-actions">
                  <button className="btn-edit" onClick={() => handleEdit(assignment)}>
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(assignment.id)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
              <div className="assignment-body">
                <p>{assignment.description}</p>
              </div>
              <div className="assignment-footer">
                <span className="assignment-meta">
                  <FontAwesomeIcon icon={faSchool} />
                  {assignment.class_name || 'N/A'}
                </span>
                <span className="assignment-meta">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  Due: {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'N/A'}
                </span>
                <span className="assignment-meta">
                  <FontAwesomeIcon icon={faClock} />
                  {getDaysRemaining(assignment.due_date)}
                </span>
                <span className="assignment-meta">
                  <FontAwesomeIcon icon={faDownload} />
                  {assignment.submissions || 0} submissions
                </span>
                <span className="assignment-meta">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Max Score: {assignment.max_score || 100}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <FontAwesomeIcon icon={faUpload} />
                </div>
                <div>
                  <h2>{editingAssignment ? 'Edit Assignment' : 'New Assignment'}</h2>
                  <p className="modal-subtitle">
                    {editingAssignment ? 'Update your assignment' : 'Create a new assignment'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Title <span className="required">*</span></label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Enter assignment title"
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Description <span className="required">*</span></label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Describe the assignment..."
                    required
                    className="form-textarea"
                    rows="4"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Class <span className="required">*</span></label>
                    <select
                      value={formData.class_id}
                      onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                      required
                      className="form-select"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.class_name || cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Due Date <span className="required">*</span></label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                      required
                      className="form-input"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="form-select"
                    >
                      <option value="assignment">Assignment</option>
                      <option value="quiz">Quiz</option>
                      <option value="project">Project</option>
                      <option value="homework">Homework</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Max Score</label>
                    <input
                      type="number"
                      value={formData.max_score}
                      onChange={(e) => setFormData({...formData, max_score: parseInt(e.target.value) || 0})}
                      className="form-input"
                      min="1"
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="form-select"
                    >
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel-modal" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-save-modal" disabled={loading}>
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSave} /> {editingAssignment ? 'Update' : 'Create'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default TeacherAssignments;
