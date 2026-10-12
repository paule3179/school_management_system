import { apiFetch } from '../../services/api.js';
// src/pages/teacher/TeacherStudents.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEye,
  faEdit, 
  faTimes,
  faUserGraduate,
  faPhone,
  faSpinner,
  faChartLine,
  faUsers,
  faSchool,
  faRefresh,
  faUser,
  faIdCard,
  faVenusMars,
  faCalendarAlt,
  faUserTie,
  faCheckCircle, 
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../../components/ToastNotification';
import './TeacherStudents.css';

const TeacherStudents = ({ API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api') }) => {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Modal states
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    parent_name: '',
    parent_phone: '',
    gender: '',
    date_of_birth: '',
  });
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    activeStudents: 0,
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const headers = getAuthHeaders();
        const clsRes = await apiFetch(`${API_BASE}/teacher/classes`, {
          headers: headers,
        });
        const clsJson = await clsRes.json();
        const clsData = clsJson?.data || [];
        setClasses(clsData);

        let totalStudents = 0;
        clsData.forEach((cls) => {
          totalStudents += parseInt(cls.student_count) || 0;
        });

        setStats({
          totalStudents: totalStudents,
          totalClasses: clsData.length,
          activeStudents: totalStudents,
        });

        if (clsData.length > 0) {
          setSelectedClassId(String(clsData[0].id));
        }
      } catch (e) {
        console.error(e);
        showToast('Failed to load classes', 'error');
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [API_BASE]);

  useEffect(() => {
    const loadStudents = async () => {
      if (!selectedClassId) return;
      try {
        setLoadingStudents(true);
        const headers = getAuthHeaders();
        const res = await apiFetch(
          `${API_BASE}/teacher/classes/${selectedClassId}/students`,
          { headers }
        );
        const json = await res.json();
        if (json?.success === false) {
          setStudents([]);
          return;
        }
        setStudents(json?.data || []);
      } catch (e) {
        console.error(e);
        showToast('Failed to load students', 'error');
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    loadStudents();
  }, [API_BASE, selectedClassId]);

  const filteredStudents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) => {
      const hay =
        `${s.first_name || ''} ${s.last_name || ''} ${s.admission_number || ''} ${s.parent_name || ''} ${s.parent_phone || ''}`.toLowerCase();
      return hay.includes(term);
    });
  }, [searchTerm, students]);

  // View student details
  const handleViewStudent = async (student) => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/students/${student.id}`, { headers });
      const data = await response.json();
      if (data.success) {
        setSelectedStudent(data.data);
        setShowViewModal(true);
      } else {
        showToast('Failed to load student details', 'error');
      }
    } catch (error) {
      console.error('Error fetching student:', error);
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Open edit modal
  const handleEditStudent = (student) => {
    setSelectedStudent(student);
    setEditFormData({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      gender: student.gender || '',
      date_of_birth: student.date_of_birth || '',
    });
    setShowEditModal(true);
  };

  // Save edited student
  const handleSaveStudent = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    try {
      const headers = getAuthHeaders();
      const response = await apiFetch(`${API_BASE}/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editFormData),
      });
      const data = await response.json();
      if (data.success) {
        showToast('Student updated successfully!', 'success');
        setShowEditModal(false);
        // Refresh student list
        const res = await apiFetch(
          `${API_BASE}/teacher/classes/${selectedClassId}/students`,
          { headers: getAuthHeaders() }
        );
        const json = await res.json();
        if (json?.success !== false) {
          setStudents(json?.data || []);
        }
      } else {
        showToast(data.error || 'Failed to update student', 'error');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      showToast('Network error', 'error');
    } finally {
      setSaving(false);
    }
  };

  const clearSearch = () => setSearchTerm('');

  const refreshData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const clsRes = await apiFetch(`${API_BASE}/teacher/classes`, {
        headers: headers,
      });
      const clsJson = await clsRes.json();
      const clsData = clsJson?.data || [];
      setClasses(clsData);

      if (clsData.length > 0 && !selectedClassId) {
        setSelectedClassId(String(clsData[0].id));
      }
      showToast('Data refreshed!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed to refresh', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Close modals
  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedStudent(null);
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedStudent(null);
  };

  if (loading && classes.length === 0) {
    return (
      <div className="teacher-students-page loading-state">
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Loading your students...</span>
      </div>
    );
  }

  return (
    <div className="teacher-students-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faUserGraduate} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalClasses}</h3>
            <p>My Classes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faSchool} />
          </div>
          <div className="stat-info">
            <h3>
              {selectedClassId
                ? classes.find((c) => String(c.id) === selectedClassId)?.class_name || '—'
                : '—'}
            </h3>
            <p>Current Class</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="stat-info">
            <h3>{students.length}</h3>
            <p>Students in Class</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <div className="page-icon">
            <FontAwesomeIcon icon={faUserGraduate} />
          </div>
          <div>
            <h1>My Students</h1>
            <p className="page-description">View and manage students in your classes</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn-refresh" onClick={refreshData} disabled={loading}>
            <FontAwesomeIcon icon={faRefresh} spin={loading} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="filter-select"
            >
              {classes.length === 0 ? (
                <option value="">No classes available</option>
              ) : (
                classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.class_name || c.name} ({c.level || 'N/A'})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="filter-group search-group">
            <div className="search-input-wrapper"> 
              <input
                type="text"
                placeholder="Search by name, admission no, parent..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button className="clear-search" onClick={clearSearch}>
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              )}
            </div>
          </div> 
        </div>
      </div>

      {/* Students Table – ADMISSION NO COLUMN REMOVED */}
      <div className="table-container">
        <table className="professional-table">
          <thead>
            <tr>
              <th>STUDENT NAME</th>
              <th>PARENT NAME</th>
              <th>PARENT PHONE</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loadingStudents ? (
              <tr>
                <td colSpan={5} className="loading-state">
                  <FontAwesomeIcon icon={faSpinner} spin />
                  <span>Loading students...</span>
                </td>
              </tr>
            ) : filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-state">
                  <div className="empty-icon">
                    <FontAwesomeIcon icon={faUserGraduate} />
                  </div>
                  <p>No students found</p>
                  {searchTerm && <p className="empty-subtext">Try adjusting your search</p>}
                </td>
              </tr>
            ) : (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td data-label="Student Name" className="student-name-cell">
                    <strong>
                      {student.first_name} {student.last_name}
                    </strong>
                  </td>
                  <td data-label="Parent Name">{student.parent_name || '-'}</td>
                  <td data-label="Parent Phone">{student.parent_phone || '-'}</td>
                  <td data-label="Status">
                    <span
                      className={`status-badge ${
                        student.status?.toLowerCase() === 'inactive' ? 'inactive' : 'active'
                      }`}
                    >
                      {student.status || 'Active'}
                    </span>
                  </td>
                  <td data-label="Actions">
                    <div className="action-buttons">
                      <button
                        className="btn-view"
                        title="View Details"
                        onClick={() => handleViewStudent(student)}
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        className="btn-edit"
                        title="Edit"
                        onClick={() => handleEditStudent(student)}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ============================================================
          VIEW STUDENT MODAL – Shows personal info only
          ============================================================ */}
      {showViewModal && selectedStudent && (
        <div className="modal-overlay" onClick={closeViewModal}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FontAwesomeIcon icon={faUser} className="modal-icon" />
                Student Information
              </h2>
              <button className="modal-close" onClick={closeViewModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">
                  <FontAwesomeIcon icon={faUserTie} /> Full Name
                </span>
                <span className="detail-value">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <FontAwesomeIcon icon={faIdCard} /> Admission No
                </span>
                <span className="detail-value">{selectedStudent.admission_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <FontAwesomeIcon icon={faUserTie} /> Parent
                </span>
                <span className="detail-value">{selectedStudent.parent_name || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <FontAwesomeIcon icon={faPhone} /> Parent Phone
                </span>
                <span className="detail-value">{selectedStudent.parent_phone || '—'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <FontAwesomeIcon icon={faVenusMars} /> Gender
                </span>
                <span className="detail-value">{selectedStudent.gender || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <FontAwesomeIcon icon={faCalendarAlt} /> Date of Birth
                </span>
                <span className="detail-value">{selectedStudent.date_of_birth || 'N/A'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">
                  <FontAwesomeIcon icon={faCheckCircle} /> Status
                </span>
                <span className="detail-value">
                  <span
                    className={`status-badge ${
                      selectedStudent.status === 'Active' ? 'active' : 'inactive'
                    }`}
                  >
                    {selectedStudent.status || 'Active'}
                  </span>
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeViewModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          EDIT STUDENT MODAL – Edit personal info
          ============================================================ */}
      {showEditModal && selectedStudent && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <FontAwesomeIcon icon={faEdit} className="modal-icon" />
                Edit Student
              </h2>
              <button className="modal-close" onClick={closeEditModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  value={editFormData.first_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, first_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  value={editFormData.last_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, last_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Parent Name</label>
                <input
                  type="text"
                  value={editFormData.parent_name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, parent_name: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Parent Phone</label>
                <input
                  type="text"
                  value={editFormData.parent_phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, parent_phone: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select
                  value={editFormData.gender}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, gender: e.target.value })
                  }
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={editFormData.date_of_birth}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, date_of_birth: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeEditModal}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveStudent} disabled={saving}>
                {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default TeacherStudents;