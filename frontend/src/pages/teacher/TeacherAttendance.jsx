// src/pages/teacher/TeacherAttendance.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faCheck,
  faTimes,
  faCalendarDay,
  faUsers,
  faSpinner,
  faExclamationTriangle,
  faClock,
  faCalendarAlt,
  faUserGraduate,
  faSchool,
  faRefresh,
  faChartLine
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../../components/ToastNotification';
import './TeacherAttendance.css';

const TeacherAttendance = ({ API_BASE = 'http://localhost:5000/api' }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
  });

  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    };
  };

  const loadMyClasses = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/teacher/classes`, {
        headers: headers
      });
      const data = await response.json();
      
      if (data.success) {
        const classesData = data.data || [];
        setClasses(classesData);
        
        // Update stats
        let totalStudents = 0;
        classesData.forEach(cls => {
          totalStudents += parseInt(cls.student_count) || 0;
        });
        setStats({
          totalClasses: classesData.length,
          totalStudents: totalStudents,
        });
      } else {
        showToast(data.error || 'Failed to load classes', 'error');
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      showToast('Network error. Could not load classes.', 'error');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadMyClasses();
  }, [loadMyClasses]);

  const loadStudents = async (classId) => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/teacher/classes/${classId}/students`, {
        headers: headers
      });
      const data = await response.json();
      
      if (data.success) {
        const studentsWithAttendance = (data.data || []).map((student) => ({
          ...student,
          status: 'present',
        }));
        setStudents(studentsWithAttendance);
      } else {
        showToast(data.error || 'Failed to load students', 'error');
      }
    } catch (error) {
      console.error('Error loading students:', error);
      showToast('Network error. Could not load students.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    if (classId) loadStudents(classId);
    else setStudents([]);
  };

  const updateAttendance = (studentId, status) => {
    setStudents((prev) =>
      prev.map((student) =>
        student.id === studentId ? { ...student, status } : student
      )
    );
  };

  const markAllPresent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'present' })));
    showToast('All students marked as present', 'info');
  };

  const markAllAbsent = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'absent' })));
    showToast('All students marked as absent', 'info');
  };

  const saveAttendance = async () => {
    if (!selectedClass) {
      showToast('Please select a class', 'warning');
      return;
    }
    if (students.length === 0) {
      showToast('No students to mark attendance', 'warning');
      return;
    }

    setSaving(true);
    try {
      const headers = getAuthHeaders();
      const attendanceData = {
        class_id: selectedClass,
        date: attendanceDate,
        records: students.map((s) => ({ student_id: s.id, status: s.status })),
      };

      const response = await fetch(`${API_BASE}/teacher/attendance`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(attendanceData),
      });

      const result = await response.json();
      if (response.ok) {
        showToast('Attendance saved successfully!', 'success');
        loadStudents(selectedClass);
      } else {
        showToast(result.error || 'Error saving attendance', 'error');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      showToast('Network error. Could not save attendance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const refreshData = async () => {
    await loadMyClasses();
    if (selectedClass) {
      await loadStudents(selectedClass);
    }
    showToast('Data refreshed!', 'success');
  };

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const attendanceRate =
    students.length > 0
      ? Math.round((presentCount / students.length) * 100)
      : 0;

  return (
    <div className="teacher-attendance-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faSchool} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalClasses}</h3>
            <p>My Classes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faUserGraduate} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <div className="stat-info">
            <h3>{attendanceDate ? new Date(attendanceDate).toLocaleDateString() : '—'}</h3>
            <p>Today's Date</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="stat-info">
            <h3>{students.length > 0 ? `${attendanceRate}%` : '—'}</h3>
            <p>Attendance Rate</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <div className="page-icon">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <div>
            <h1>Attendance Management</h1>
            <p className="page-description">Record daily student attendance for your classes</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn-refresh" onClick={refreshData} disabled={loading}>
            <FontAwesomeIcon icon={faRefresh} spin={loading} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="filter-group">
             
            <select 
              value={selectedClass} 
              onChange={handleClassChange} 
              disabled={loading}
              className="filter-select"
            >
              <option value="">Select a class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name || cls.name} ({cls.level || 'N/A'})
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>
      </div>

      {/* Context Info */}
      {selectedClass && (
        <div className="context-info">
          <span className="context-badge">
            <FontAwesomeIcon icon={faSchool} />
            <strong>Class:</strong> {classes.find((c) => String(c.id) === String(selectedClass))?.class_name || 'N/A'}
          </span>
          <span className="context-badge">
            <FontAwesomeIcon icon={faCalendarDay} />
            <strong>Date:</strong> {new Date(attendanceDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
          {students.length > 0 && (
            <span className="context-badge">
              <FontAwesomeIcon icon={faUsers} />
              <strong>Students:</strong> {students.length}
            </span>
          )}
        </div>
      )}

      {/* Attendance Content */}
      {selectedClass && (
        <>
          {loading ? (
            <div className="loading-state">
              <FontAwesomeIcon icon={faSpinner} spin />
              <span>Loading students...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FontAwesomeIcon icon={faExclamationTriangle} />
              </div>
              <p>No students found in this class.</p>
            </div>
          ) : (
            <>
              {/* Stats Summary */}
              <div className="attendance-stats">
                <div className="attendance-stat present-stat">
                  <FontAwesomeIcon icon={faCheck} />
                  <span>{presentCount}</span>
                  <label>Present</label>
                </div>
                <div className="attendance-stat absent-stat">
                  <FontAwesomeIcon icon={faTimes} />
                  <span>{absentCount}</span>
                  <label>Absent</label>
                </div>
                <div className="attendance-stat rate-stat">
                  <FontAwesomeIcon icon={faClock} />
                  <span>{attendanceRate}%</span>
                  <label>Rate</label>
                </div>
              </div>

              {/* Bulk Actions */}
              <div className="bulk-actions">
                <button className="btn-bulk-present" onClick={markAllPresent}>
                  <FontAwesomeIcon icon={faCheck} /> Mark All Present
                </button>
                <button className="btn-bulk-absent" onClick={markAllAbsent}>
                  <FontAwesomeIcon icon={faTimes} /> Mark All Absent
                </button>
              </div>

              {/* Table */}
              <div className="table-container">
                <table className="professional-table">
                  <thead>
                    <tr>
                      <th>Student Name</th>
                      <th>Admission No</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id}>
                        <td>
                          <strong>{student.first_name} {student.last_name}</strong>
                        </td>
                        <td>
                          <code className="admission-code">{student.admission_number || '-'}</code>
                        </td>
                        <td>
                          <div className="attendance-toggle">
                            <button
                              className={`attendance-btn present ${
                                student.status === 'present' ? 'active' : ''
                              }`}
                              onClick={() => updateAttendance(student.id, 'present')}
                            >
                              <FontAwesomeIcon icon={faCheck} /> Present
                            </button>
                            <button
                              className={`attendance-btn absent ${
                                student.status === 'absent' ? 'active' : ''
                              }`}
                              onClick={() => updateAttendance(student.id, 'absent')}
                            >
                              <FontAwesomeIcon icon={faTimes} /> Absent
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="attendance-actions">
                <button
                  className="btn-save-attendance"
                  onClick={saveAttendance}
                  disabled={saving}
                >
                  <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
                  {saving ? 'Saving...' : 'Save Attendance'}
                </button>
              </div>
            </>
          )}
        </>
      )}

      {/* Message when no class selected */}
      {!selectedClass && (
        <div className="info-message">
          <div className="info-icon">
            <FontAwesomeIcon icon={faCalendarDay} />
          </div>
          <h3>Select a Class</h3>
          <p>Choose a class from the dropdown above to start taking attendance.</p>
        </div>
      )}

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default TeacherAttendance;