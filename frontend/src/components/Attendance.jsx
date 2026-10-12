import { apiFetch } from '../services/api.js';
// src/components/Attendance.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faUsers, faCheckCircle, faTimesCircle, faClock, faCog, faSearch, faEye, faSave } from '@fortawesome/free-solid-svg-icons';
import './Attendance.css';

const Attendance = ({ API_BASE, classes, termSettings }) => {
  // ATTENDANCE STATE
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceClass, setAttendanceClass] = useState('');
  const [attendanceList, setAttendanceList] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [selectedStudentForSummary, setSelectedStudentForSummary] = useState(null);
  const [attendanceTerm, setAttendanceTerm] = useState('1');
  const [showTermSettings, setShowTermSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load attendance students
  const loadAttendanceStudents = async () => {
    if (!attendanceClass) {
      showToast('Please select a class', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const studentsResponse = await apiFetch(`${API_BASE}/students/class/${attendanceClass}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const studentsResult = await studentsResponse.json();
      const students = studentsResult.data || [];
      
      const existingAttendanceResponse = await apiFetch(
        `${API_BASE}/attendance/class/${attendanceClass}?date=${attendanceDate}&term=${attendanceTerm}&academic_year=2024-2025`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const existingAttendance = await existingAttendanceResponse.json();
      
      const initialAttendance = students.map(student => {
        const existing = existingAttendance.data?.find(a => a.student_id === student.id);
        return {
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          admission_number: student.admission_number,
          status: existing ? existing.status : 'present',
          remarks: existing ? existing.remarks : ''
        };
      });
      
      setAttendanceList(initialAttendance);
    } catch (error) {
      console.error('Error loading attendance students:', error);
      showToast('Error loading students', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAttendanceChange = (studentId, status) => {
    setAttendanceList(prev =>
      prev.map(student =>
        student.student_id === studentId ? { ...student, status } : student
      )
    );
  };

  const saveAttendance = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const attendanceData = {
        class_id: parseInt(attendanceClass),
        date: attendanceDate,
        attendance_list: attendanceList.map(a => ({
          student_id: a.student_id,
          status: a.status,
          remarks: a.remarks
        })),
        term: parseInt(attendanceTerm),
        academic_year: '2024-2025'
      };
      
      const response = await apiFetch(`${API_BASE}/attendance/class`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attendanceData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showToast(`Attendance saved successfully! ${result.count} records updated.`, 'success');
      } else {
        showToast('Error: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      showToast('Error saving attendance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const viewStudentAttendanceSummary = async (studentId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await apiFetch(
        `${API_BASE}/attendance/student-summary/${studentId}?term=${attendanceTerm}&academic_year=2024-2025`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const result = await response.json();
      if (result.success) {
        let termTotalDays = 60;
        if (attendanceTerm === '1') termTotalDays = termSettings?.term1_total_days || 60;
        else if (attendanceTerm === '2') termTotalDays = termSettings?.term2_total_days || 60;
        else if (attendanceTerm === '3') termTotalDays = termSettings?.term3_total_days || 45;
        
        const presentDays = result.data.present || 0;
        const percentage = termTotalDays > 0 ? (presentDays / termTotalDays) * 100 : 0;
        
        setAttendanceSummary({
          ...result.data,
          term_total_days: termTotalDays,
          attendance_percentage: percentage.toFixed(2)
        });
        setSelectedStudentForSummary(studentId);
      }
    } catch (error) {
      console.error('Error loading attendance summary:', error);
      showToast('Error loading attendance summary', 'error');
    }
  };

  // Calculate stats
  const totalStudents = attendanceList.length;
  const presentCount = attendanceList.filter(a => a.status === 'present').length;
  const absentCount = attendanceList.filter(a => a.status === 'absent').length;
  const lateCount = attendanceList.filter(a => a.status === 'late').length;

  return (
    <div className="attendance-page">
      {/* Stats Cards */}
      <div className="attendance-stats-grid">
        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="attendance-stat-info">
            <h3>{totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="attendance-stat-info">
            <h3>{presentCount}</h3>
            <p>Present</p>
          </div>
        </div>
        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <FontAwesomeIcon icon={faTimesCircle} />
          </div>
          <div className="attendance-stat-info">
            <h3>{absentCount}</h3>
            <p>Absent</p>
          </div>
        </div>
        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div className="attendance-stat-info">
            <h3>{lateCount}</h3>
            <p>Late</p>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="attendance-main-section">
        <div className="attendance-section-header">
          <h2>
            <FontAwesomeIcon icon={faCalendarCheck} />
            Attendance Management
          </h2>
            <button className="attendance-btn-term-settings" onClick={() => setShowTermSettings(true)}>
            <FontAwesomeIcon icon={faCog} />
            <span className="btn-text">Term Settings</span>
          </button>
        </div>

        {/* Filters */}
        <div className="attendance-filters">
          <div className="attendance-filter-group">
            <label>Select Class</label>
            <select value={attendanceClass} onChange={(e) => setAttendanceClass(e.target.value)}>
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
          
          <div className="attendance-filter-group">
            <label>Term</label>
            <select value={attendanceTerm} onChange={(e) => setAttendanceTerm(e.target.value)}>
              <option value="1">First Term</option>
              <option value="2">Second Term</option>
              <option value="3">Third Term</option>
            </select>
          </div>
          
          <div className="attendance-filter-group">
            <label>Date</label>
            <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
          </div>
          
          <button className="attendance-btn-load" onClick={loadAttendanceStudents}>
            <FontAwesomeIcon icon={faSearch} /> Load Students
          </button>
        </div>

        {/* Attendance Table */}
        {attendanceList.length > 0 && (
          <>
            <div className="attendance-table-container">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Admission No</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceList.map(student => (
                    <tr key={student.student_id}>
                      <td className="student-name-cell">
                        <strong>{student.student_name}</strong>
                      </td>
                      <td>{student.admission_number || '-'}</td>
                      <td>
                        <select
                          value={student.status}
                          onChange={(e) => handleAttendanceChange(student.student_id, e.target.value)}
                          className={`attendance-status-select status-${student.status}`}
                        >
                          <option value="present">✓ Present</option>
                          <option value="absent">✗ Absent</option>
                          <option value="late">⏰ Late</option>
                          <option value="excused">📋 Excused</option>
                        </select>
                      </td>
                      <td>
                        <button className="attendance-btn-view-summary" onClick={() => viewStudentAttendanceSummary(student.student_id)}>
                          <FontAwesomeIcon icon={faEye} /> Summary
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="attendance-save-container">
              <button className="attendance-btn-save" onClick={saveAttendance} disabled={loading}>
                <FontAwesomeIcon icon={faSave} /> {loading ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Term Settings Modal */}
      {showTermSettings && (
        <div className="attendance-summary-modal" onClick={() => setShowTermSettings(false)}>
          <div className="attendance-summary-content" onClick={e => e.stopPropagation()}>
            <div className="attendance-summary-header">
              <h2>Term Settings</h2>
              <button className="attendance-summary-close" onClick={() => setShowTermSettings(false)}>×</button>
            </div>
            <div className="attendance-summary-body">
              <div className="settings-form">
                <div className="form-group">
                  <label>Term 1 Total Days</label>
                  <input type="number" value={termSettings?.term1_total_days || 60} />
                </div>
                <div className="form-group">
                  <label>Term 2 Total Days</label>
                  <input type="number" value={termSettings?.term2_total_days || 60} />
                </div>
                <div className="form-group">
                  <label>Term 3 Total Days</label>
                  <input type="number" value={termSettings?.term3_total_days || 45} />
                </div>
                <button className="btn-save" onClick={() => setShowTermSettings(false)}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Summary Modal */}
      {attendanceSummary && selectedStudentForSummary && (
        <div className="attendance-summary-modal" onClick={() => setAttendanceSummary(null)}>
          <div className="attendance-summary-content" onClick={e => e.stopPropagation()}>
            <div className="attendance-summary-header">
              <h2>Attendance Summary</h2>
              <button className="attendance-summary-close" onClick={() => setAttendanceSummary(null)}>×</button>
            </div>
            <div className="attendance-summary-body">
              <div className="summary-stats">
                <div className="summary-stat">
                  <div className="label">Total Days</div>
                  <div className="value">{attendanceSummary.total_days}</div>
                </div>
                <div className="summary-stat">
                  <div className="label">Present</div>
                  <div className="value present">{attendanceSummary.present}</div>
                </div>
                <div className="summary-stat">
                  <div className="label">Absent</div>
                  <div className="value absent">{attendanceSummary.absent}</div>
                </div>
                <div className="summary-stat">
                  <div className="label">Late</div>
                  <div className="value late">{attendanceSummary.late}</div>
                </div>
              </div>
              <div className="progress-container">
                <div className="progress-label">
                  <span>Attendance Rate</span>
                  <span>{attendanceSummary.attendance_percentage}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${attendanceSummary.attendance_percentage}%` }}></div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setAttendanceSummary(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;