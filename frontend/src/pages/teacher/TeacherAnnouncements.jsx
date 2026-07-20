// src/pages/teacher/TeacherAnnouncements.jsx
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBullhorn,
  faPlus,
  faEdit,
  faTrash,
  faTimes,
  faSave,
  faSpinner,
  faBell,
  faCalendarAlt,
  faUser,
  faRefresh,
  faCheckCircle,
  faEye
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../../components/ToastNotification';
import './TeacherAnnouncements.css';

const TeacherAnnouncements = ({ API_BASE = 'http://localhost:5000/api' }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
  });
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general',
    audience: 'all',
    status: 'published',
    class_id: '',
  });

  const [classes, setClasses] = useState([]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    loadAnnouncements();
    loadClasses();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/teacher/announcements`, {
        headers: headers
      });
      const data = await response.json();
      
      if (data.success) {
        const announcementsData = data.data || [];
        setAnnouncements(announcementsData);
        
        // Calculate stats
        const published = announcementsData.filter(a => a.status === 'published').length;
        const draft = announcementsData.filter(a => a.status === 'draft').length;
        setStats({
          total: announcementsData.length,
          published: published,
          draft: draft,
        });
      } else {
        // Fallback data
        setFallbackData();
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      setFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const setFallbackData = () => {
    const fallback = [
      {
        id: 1,
        title: 'Welcome to the New Term',
        content: 'Welcome back to school for the new term. All teachers are expected to submit their lesson plans by Friday.',
        type: 'general',
        audience: 'all',
        status: 'published',
        created_at: new Date().toISOString(),
        teacher_name: 'John Doe',
      },
      {
        id: 2,
        title: 'Staff Meeting Reminder',
        content: 'There will be a staff meeting tomorrow at 2:00 PM in the conference room. Attendance is mandatory.',
        type: 'important',
        audience: 'teachers',
        status: 'published',
        created_at: new Date(Date.now() - 86400000).toISOString(),
        teacher_name: 'John Doe',
      },
      {
        id: 3,
        title: 'Parent-Teacher Conference',
        content: 'Parent-Teacher conferences will be held next week. Please prepare your students\' progress reports.',
        type: 'event',
        audience: 'parents',
        status: 'draft',
        created_at: new Date(Date.now() - 172800000).toISOString(),
        teacher_name: 'John Doe',
      },
    ];
    setAnnouncements(fallback);
    setStats({
      total: fallback.length,
      published: fallback.filter(a => a.status === 'published').length,
      draft: fallback.filter(a => a.status === 'draft').length,
    });
  };

  const loadClasses = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/teacher/classes`, {
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
      const url = editingAnnouncement 
        ? `${API_BASE}/teacher/announcements/${editingAnnouncement.id}`
        : `${API_BASE}/teacher/announcements`;
      const method = editingAnnouncement ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: headers,
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        showToast(editingAnnouncement ? 'Announcement updated!' : 'Announcement created!');
        setShowModal(false);
        resetForm();
        loadAnnouncements();
      } else {
        showToast(data.error || 'Failed to save announcement', 'error');
      }
    } catch (error) {
      console.error('Error saving announcement:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/teacher/announcements/${id}`, {
        method: 'DELETE',
        headers: headers
      });
      
      if (response.ok) {
        showToast('Announcement deleted!');
        loadAnnouncements();
      } else {
        showToast('Failed to delete announcement', 'error');
      }
    } catch (error) {
      console.error('Error deleting announcement:', error);
      showToast('Network error', 'error');
    }
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type || 'general',
      audience: announcement.audience || 'all',
      status: announcement.status || 'published',
      class_id: announcement.class_id || '',
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingAnnouncement(null);
    setFormData({
      title: '',
      content: '',
      type: 'general',
      audience: 'all',
      status: 'published',
      class_id: '',
    });
  };

  const getTypeBadgeClass = (type) => {
    const types = {
      general: 'type-general',
      important: 'type-important',
      event: 'type-event',
      academic: 'type-academic',
    };
    return types[type] || 'type-general';
  };

  const getStatusBadgeClass = (status) => {
    return status === 'published' ? 'status-published' : 'status-draft';
  };

  const getAudienceLabel = (audience) => {
    const labels = {
      all: 'All',
      teachers: 'Teachers Only',
      students: 'Students Only',
      parents: 'Parents Only',
    };
    return labels[audience] || audience;
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="teacher-announcements-page loading-state">
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Loading announcements...</span>
      </div>
    );
  }

  return (
    <div className="teacher-announcements-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faBullhorn} />
          </div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Announcements</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="stat-info">
            <h3>{stats.published}</h3>
            <p>Published</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faEdit} />
          </div>
          <div className="stat-info">
            <h3>{stats.draft}</h3>
            <p>Drafts</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faBell} />
          </div>
          <div className="stat-info">
            <h3>{announcements.filter(a => a.status === 'published' && new Date(a.created_at) > new Date(Date.now() - 7 * 86400000)).length}</h3>
            <p>This Week</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <div className="page-icon">
            <FontAwesomeIcon icon={faBullhorn} />
          </div>
          <div>
            <h1>Announcements</h1>
            <p className="page-description">Post and manage announcements for your students and parents</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn-refresh" onClick={loadAnnouncements} disabled={loading}>
            <FontAwesomeIcon icon={faRefresh} spin={loading} />
            Refresh
          </button>
          <button className="btn-add" onClick={() => { resetForm(); setShowModal(true); }}>
            <FontAwesomeIcon icon={faPlus} /> New Announcement
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="announcements-list">
        {announcements.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <FontAwesomeIcon icon={faBullhorn} />
            </div>
            <h3>No Announcements</h3>
            <p>You haven't posted any announcements yet.</p>
            <button className="btn-add" onClick={() => { resetForm(); setShowModal(true); }}>
              <FontAwesomeIcon icon={faPlus} /> Create Your First Announcement
            </button>
          </div>
        ) : (
          announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-card">
              <div className="announcement-header">
                <div className="announcement-title">
                  <h3>{announcement.title}</h3>
                  <span className={`type-badge ${getTypeBadgeClass(announcement.type)}`}>
                    {announcement.type || 'General'}
                  </span>
                  <span className={`status-badge ${getStatusBadgeClass(announcement.status)}`}>
                    {announcement.status || 'Draft'}
                  </span>
                </div>
                <div className="announcement-actions">
                  <button className="btn-edit" onClick={() => handleEdit(announcement)}>
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button className="btn-delete" onClick={() => handleDelete(announcement.id)}>
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
              </div>
              <div className="announcement-body">
                <p>{announcement.content}</p>
              </div>
              <div className="announcement-footer">
                <span className="announcement-meta">
                  <FontAwesomeIcon icon={faUser} />
                  {announcement.teacher_name || 'Teacher'}
                </span>
                <span className="announcement-meta">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  {new Date(announcement.created_at).toLocaleDateString()}
                </span>
                <span className="announcement-meta">
                  <FontAwesomeIcon icon={faEye} />
                  {announcement.audience ? getAudienceLabel(announcement.audience) : 'All'}
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
                  <FontAwesomeIcon icon={faBullhorn} />
                </div>
                <div>
                  <h2>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</h2>
                  <p className="modal-subtitle">
                    {editingAnnouncement ? 'Update your announcement' : 'Create a new announcement'}
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
                    placeholder="Enter announcement title"
                    required
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Content <span className="required">*</span></label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    placeholder="Write your announcement here..."
                    required
                    className="form-textarea"
                    rows="5"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="form-select"
                    >
                      <option value="general">General</option>
                      <option value="important">Important</option>
                      <option value="event">Event</option>
                      <option value="academic">Academic</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Audience</label>
                    <select
                      value={formData.audience}
                      onChange={(e) => setFormData({...formData, audience: e.target.value})}
                      className="form-select"
                    >
                      <option value="all">All</option>
                      <option value="teachers">Teachers Only</option> 
                      <option value="parents">Parents Only</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="form-select"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
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
                      <FontAwesomeIcon icon={faSave} /> {editingAnnouncement ? 'Update' : 'Post'}
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

export default TeacherAnnouncements;