import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faFilter,
  faSpinner,
  faExclamationTriangle,
  faCheckCircle,
  faTimesCircle,
  faSchool,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import './TeacherPromotion.css';

const TeacherPromotion = ({ API_BASE = 'http://localhost:5000/api' }) => {
  // Filter state
  const [academicYears] = useState(['2024-2025', '2025-2026']);
  const [terms] = useState([1, 2, 3]);
  const [classes, setClasses] = useState([]);
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedClass, setSelectedClass] = useState('');

  // Table data
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    };
  };

  // Load teacher's classes on mount
  useEffect(() => {
    fetchTeacherClasses();
  }, []);

  const fetchTeacherClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/teacher/classes`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setClasses(data.data || []);
        // Default to first class
        if ((data.data || []).length > 0) {
          setSelectedClass(String(data.data[0].id));
        }
      } else {
        setError(data.message || data.error || 'Failed to load your classes.');
      }
    } catch {
      setError('Network error. Could not load classes.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Fetch eligible students when filters are set
  const fetchStudents = useCallback(async () => {
    if (!selectedYear || !selectedTerm || !selectedClass) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        class_id: selectedClass,
        academic_year: selectedYear,
        term: selectedTerm,
      });
      const res = await fetch(
        `${API_BASE}/teacher/promotion/students?${params}`,
        { headers: getAuthHeaders() }
      );
      const data = await res.json();
      if (data.success) {
        setStudents(data.data || []);
      } else {
        setError(data.message || data.error || 'Failed to load students.');
      }
    } catch {
      setError('Network error. Could not load students.');
    } finally {
      setLoading(false);
    }
  }, [API_BASE, selectedYear, selectedTerm, selectedClass]);

  useEffect(() => {
    if (selectedYear && selectedTerm && selectedClass) {
      fetchStudents();
    }
  }, [selectedYear, selectedTerm, selectedClass, fetchStudents]);

  const qualifiedCount = students.filter((s) => s.qualified).length;
  const unqualifiedCount = students.filter((s) => !s.qualified).length;

  const getStatusBadge = (student) => {
    if (student.qualified) return 'badge-success';
    return 'badge-danger';
  };

  const getStatusLabel = (student) => {
    if (student.qualified) return 'Qualified';
    return 'Not Qualified';
  };

  return (
    <div className="teacher-dashboard-content">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <div className="page-icon">
            <FontAwesomeIcon icon={faGraduationCap} />
          </div>
          <div>
            <h1>Promotions</h1>
            <p className="page-description">Review students' promotion eligibility for your classes.</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="stat-info">
            <h3>{students.length}</h3>
            <p>Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="stat-info">
            <h3>{qualifiedCount}</h3>
            <p>Qualified</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faTimesCircle} />
          </div>
          <div className="stat-info">
            <h3>{unqualifiedCount}</h3>
            <p>Not Qualified</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faGraduationCap} />
          </div>
          <div className="stat-info">
            <h3>{classes.length}</h3>
            <p>My Classes</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label>Academic Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="form-select"
          >
            {academicYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Term</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="form-select"
          >
            <option value="">Select Term</option>
            {terms.map((t) => (
              <option key={t} value={t}>Term {t}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Class</label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="form-select"
          >
            <option value="">Select Class</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.class_name || cls.name} ({cls.level || 'N/A'})
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={fetchStudents}
          disabled={!selectedYear || !selectedTerm || !selectedClass || loading}
        >
          <FontAwesomeIcon icon={faFilter} /> Load Students
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div className="alert alert-danger">
          <FontAwesomeIcon icon={faExclamationTriangle} /> {error}
        </div>
      )}

      {/* Student Table */}
      {loading ? (
        <div className="loading-state">
          <FontAwesomeIcon icon={faSpinner} spin /> Loading students...
        </div>
      ) : students.length > 0 ? (
        <div className="table-responsive">
          <table className="table table-striped">
            <thead>
              <tr>
                <th>Name</th>
                <th>Admission No</th>
                <th>Class</th>
                <th>Avg Marks</th>
                <th>Attendance %</th>
                <th>Next Class</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id}>
                  <td>
                    <strong>{student.first_name} {student.last_name}</strong>
                  </td>
                  <td>{student.admission_number || '-'}</td>
                  <td>{student.class_name || 'N/A'}</td>
                  <td>
                    {student.average_grade !== null && student.average_grade !== undefined
                      ? `${student.average_grade}%`
                      : 'N/A'}
                  </td>
                  <td>
                    {student.attendance_rate !== null && student.attendance_rate !== undefined
                      ? `${student.attendance_rate}%`
                      : 'N/A'}
                  </td>
                  <td>{student.suggested_next_class || 'GRADUATED'}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadge(student)}`}>
                      <FontAwesomeIcon
                        icon={student.qualified ? faCheckCircle : faTimesCircle}
                      />{' '}
                      {getStatusLabel(student)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        !loading && (
          <div className="no-data">
            <FontAwesomeIcon icon={faSchool} size="2x" style={{ marginBottom: '12px', color: '#cbd5e1' }} />
            <p>No students found for the selected filters.</p>
          </div>
        )
      )}

      {/* Note about admin approval */}
      {students.length > 0 && (
        <div className="promotion-note">
          <FontAwesomeIcon icon={faGraduationCap} />
          <span>
            Promotion is finalized by the administrator. Teachers can review eligibility here.
          </span>
        </div>
      )}
    </div>
  );
};

export default TeacherPromotion;