// src/components/PromotionManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowUp, faList, faHistory, faUsers, 
  faGraduationCap, faBookOpen, faFileExport
} from '@fortawesome/free-solid-svg-icons';

const PromotionManagement = ({ API_BASE, setShowPromotionModal, setSelectedClassForPromotion }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promotionTab, setPromotionTab] = useState('classes');
  const [promotionHistory, setPromotionHistory] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassStudents, setSelectedClassStudents] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/classes`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      const classesData = result.data || [];
      
      const classesWithCounts = await Promise.all(
        classesData.map(async (cls) => {
          try {
            const studentsResponse = await fetch(`${API_BASE}/students/class/${cls.id}`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const studentsResult = await studentsResponse.json();
            return {
              ...cls,
              current_count: studentsResult.data?.length || 0
            };
          } catch (error) {
            console.error(`Error loading students for class ${cls.id}:`, error);
            return {
              ...cls,
              current_count: 0
            };
          }
        })
      );
      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadPromotionHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/promotion-history`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success) {
        setPromotionHistory(result.data || []);
      }
    } catch (error) {
      console.error('Error loading promotion history:', error);
    }
  }, [API_BASE]);

  const loadClassPerformance = useCallback(async (classId) => {
    if (!classId) {
      setSelectedClassStudents([]);
      return;
    }

    setPerformanceLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [studentsResponse, marksResponse, subjectsResponse] = await Promise.all([
        fetch(`${API_BASE}/students/class/${classId}`, { headers }),
        fetch(`${API_BASE}/teacher/marks/${classId}`, { headers }),
        fetch(`${API_BASE}/classes/${classId}/subjects`, { headers })
      ]);

      const studentsResult = await studentsResponse.json();
      const marksResult = await marksResponse.json();
      const subjectsResult = await subjectsResponse.json();

      const students = studentsResult.data || [];
      const marks = marksResult.data || [];
      const subjectMap = {};
      (subjectsResult.data || []).forEach(subject => {
        subjectMap[subject.id] = subject.name || subject.subject_name || 'Subject';
      });

      const byStudent = {};
      marks.forEach(mark => {
        const studentId = String(mark.student_id);
        if (!byStudent[studentId]) byStudent[studentId] = [];
        byStudent[studentId].push(mark);
      });

      const rows = students.map(student => {
        const studentMarks = byStudent[String(student.id)] || [];
        const subjectGrades = studentMarks.length
          ? studentMarks.map(mark => {
              const subjectName = subjectMap[mark.subject_id] || 'Subject';
              const grade = mark.grade || getGradeLetter(Number(mark.marks));
              return `${subjectName}: ${grade}`;
            })
          : ['No report card grades yet'];

        const scores = studentMarks
          .map(mark => Number(mark.marks))
          .filter(value => !Number.isNaN(value));

        const averageScore = scores.length > 0
          ? scores.reduce((sum, value) => sum + value, 0) / scores.length
          : null;

        return {
          ...student,
          overallGrade: averageScore === null ? 'N/A' : getGradeLetter(averageScore),
          averageScore,
          reportGrades: subjectGrades
        };
      });

      setSelectedClassStudents(rows);
    } catch (error) {
      console.error('Error loading class performance:', error);
      setSelectedClassStudents([]);
    } finally {
      setPerformanceLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadClasses();
    loadPromotionHistory();
  }, [loadClasses, loadPromotionHistory]);

  useEffect(() => {
    loadClassPerformance(selectedClassId);
  }, [selectedClassId, loadClassPerformance]);

  // ✅ FIXED: Use cls.class_name instead of cls.name
  const getNextClassName = (className, level) => {
    if (!className) return 'Unknown';
    const classNum = parseInt(className.match(/(\d+)/)?.[1] || 0);
    if (level === 'KG') {
      if (classNum < 2) return 'Primary 1A';
    } else if (level === 'Primary') {
      if (classNum < 6) return `Primary ${classNum + 1}A`;
      return 'GRADUATED';
    } else if (level === 'JHS') {
      if (classNum < 3) return `JHS${classNum + 1}A`;
      return 'GRADUATED';
    }
    return 'GRADUATED';
  };

  const getGradeLetter = (score) => {
    if (score === null || score === undefined || Number.isNaN(score)) return 'N/A';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const openPromotionModal = (cls) => {
    setSelectedClassForPromotion(cls);
    setShowPromotionModal(true);
  };

  const exportPromotionHistory = () => {
    if (promotionHistory.length === 0) {
      alert('No history to export');
      return;
    }
    const csv = [
      ['Date', 'Student', 'Admission', 'From', 'To', 'Year'],
      ...promotionHistory.map(r => [
        new Date(r.promotion_date).toLocaleDateString(),
        `${r.first_name} ${r.last_name}`,
        r.admission_number,
        r.from_class_name,
        r.to_class_name || 'GRADUATED',
        `${r.from_academic_year} → ${r.to_academic_year}`
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="promotion-management-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faBookOpen} />
          </div>
          <div className="stat-info">
            <h3>{classes.filter(c => (c.current_count || 0) > 0).length}</h3>
            <p>Classes with Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="stat-info">
            <h3>{classes.reduce((sum, c) => sum + (c.current_count || 0), 0)}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faArrowUp} />
          </div>
          <div className="stat-info">
            <h3>{classes.filter(c => (c.current_count || 0) > 0 && c.level !== 'JHS').length}</h3>
            <p>Ready for Promotion</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faGraduationCap} />
          </div>
          <div className="stat-info">
            <h3>{classes.filter(c => c.class_name?.includes('JHS 3') && (c.current_count || 0) > 0).length}</h3>
            <p>Graduating Classes</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <h1><FontAwesomeIcon icon={faGraduationCap} /> Promotion Management</h1>
        <p>Manage student promotions, view history, and track academic progression</p>
      </div>

      {/* Tabs */}
      <div className="promotion-tabs">
        <button className={`tab-btn ${promotionTab === 'classes' ? 'active' : ''}`} onClick={() => setPromotionTab('classes')}>
          <FontAwesomeIcon icon={faList} /> By Class
        </button>
        <button className={`tab-btn ${promotionTab === 'history' ? 'active' : ''}`} onClick={() => setPromotionTab('history')}>
          <FontAwesomeIcon icon={faHistory} /> History
        </button>
      </div>

      {/* By Class Tab */}
      {promotionTab === 'classes' && (
        <div className="promotion-classes-section">
          <div className="section-header">
            <h2>Promote Students by Class</h2>
          </div>

          <div className="promotion-filter-row">
            <label htmlFor="admin-promotion-class-select">Select Class</label>
            <select
              id="admin-promotion-class-select"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="">Select Class</option>
              {/* ✅ SHOW ALL CLASSES */}
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_name || cls.name || `Class ${cls.id}`} ({cls.level}) – {cls.current_count || 0} students
                </option>
              ))}
            </select>
          </div>

          {selectedClassId && (
            <div className="selection-preview">
              <div className="selection-preview-header">
                <h3>Student Performance Preview</h3>
                <button
                  className="btn-promote"
                  onClick={() => {
                    const selectedClass = classes.find(cls => String(cls.id) === String(selectedClassId));
                    if (selectedClass) openPromotionModal(selectedClass);
                  }}
                  disabled={selectedClassStudents.length === 0}
                >
                  Promote Selected Class
                </button>
              </div>

              {performanceLoading ? (
                <div className="loading-container">Loading student performance...</div>
              ) : selectedClassStudents.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Admission No</th>
                        <th>Overall Grade</th>
                        <th>Report Card Grades</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClassStudents.map(student => (
                        <tr key={student.id}>
                          <td><strong>{student.first_name} {student.last_name}</strong></td>
                          <td>{student.admission_number}</td>
                          <td>{student.overallGrade}</td>
                          <td>{student.reportGrades.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No students found for this class.</div>
              )}
            </div>
          )}

          {!selectedClassId && (
            <div className="no-data" style={{ marginTop: '8px' }}>
              Select a class to review student performance before promoting.
            </div>
          )}

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CLASS</th>
                  <th>LEVEL</th>
                  <th>STUDENTS</th>
                  <th>NEXT CLASS</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {/* ✅ SHOW ALL CLASSES */}
                {classes.map(cls => {
                  // ✅ FIXED: Use cls.class_name
                  const nextClass = getNextClassName(cls.class_name || cls.name, cls.level);
                  const isGraduated = nextClass === 'GRADUATED';
                  const studentCount = cls.current_count || 0;
                  return (
                    <tr key={cls.id}>
                      <td><strong>{cls.class_name || cls.name || `Class ${cls.id}`}</strong></td>
                      <td>{cls.level}</td>
                      <td>{studentCount} student{studentCount !== 1 ? 's' : ''}</td>
                      <td>{isGraduated ? 'GRADUATED' : nextClass}</td>
                      <td>
                        {studentCount === 0 ? (
                          <span style={{ color: '#94a3b8' }}>No Students</span>
                        ) : isGraduated ? (
                          <span className="status-badge status-graduated">Ready to Graduate</span>
                        ) : (
                          <span className="status-badge status-ready">Ready for Promotion</span>
                        )}
                      </td>
                      <td>
                        <button 
                          className={`btn-promote ${isGraduated ? 'btn-graduate' : ''}`}
                          onClick={() => openPromotionModal(cls)}
                          disabled={studentCount === 0}
                        >
                          {isGraduated ? 'Graduate' : 'Promote'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {promotionTab === 'history' && (
        <div className="promotion-history-section">
          <div className="section-header">
            <h2><FontAwesomeIcon icon={faHistory} /> Promotion History</h2>
            <button className="btn-export" onClick={exportPromotionHistory}>
              <FontAwesomeIcon icon={faFileExport} /> Export CSV
            </button>
          </div>
          
          {promotionHistory.length === 0 ? (
            <div className="no-data">
              <FontAwesomeIcon icon={faHistory} size="2x" style={{ marginBottom: '12px', color: '#cbd5e1' }} />
              <p>No promotion history found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student Name</th>
                    <th>Admission No</th>
                    <th>From Class</th>
                    <th>To Class</th>
                    <th>Academic Year</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionHistory.map(record => (
                    <tr key={record.id}>
                      <td>{new Date(record.promotion_date).toLocaleDateString()}</td>
                      <td><strong>{record.first_name} {record.last_name}</strong></td>
                      <td>{record.admission_number}</td>
                      <td>{record.from_class_name}</td>
                      <td className="to-class">
                        <FontAwesomeIcon icon={faGraduationCap} /> {record.to_class_name || 'GRADUATED'}
                      </td>
                      <td>{record.from_academic_year} → {record.to_academic_year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromotionManagement;