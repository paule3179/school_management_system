 // src/pages/teacher/TeacherClasses.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faSchool,
  faUserGraduate,
  faBook,
  faChartLine,
  faRefresh,
  faCalendarAlt,
  faChevronRight,
  faUsers,
  faClipboardList,
  faArrowLeft,
  faCheckCircle,
  faExclamationTriangle,
  faChalkboardTeacher,
  faFilter,
  faSearch,
  faSortAmountDown,
  faSortAmountUp,
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../../components/ToastNotification';
import './TeacherClasses.css';

const TeacherClasses = ({ API_BASE = 'http://localhost:5000/api' }) => {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalSubjects: 0,
    activeClasses: 0,
  });
  
  const navigate = useNavigate();

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
    loadClasses();
  }, []);

  // Filter and sort classes when dependencies change
  useEffect(() => {
    let result = [...classes];

    // Filter by search term
    if (searchTerm) {
      result = result.filter(cls => 
        cls.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cls.level?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by level
    if (filterLevel !== 'all') {
      result = result.filter(cls => 
        cls.level?.toLowerCase() === filterLevel.toLowerCase()
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'name':
          aVal = a.class_name || a.name || '';
          bVal = b.class_name || b.name || '';
          break;
        case 'students':
          aVal = parseInt(a.student_count) || 0;
          bVal = parseInt(b.student_count) || 0;
          break;
        case 'subject':
          aVal = a.subject || '';
          bVal = b.subject || '';
          break;
        case 'level':
          aVal = a.level || '';
          bVal = b.level || '';
          break;
        default:
          aVal = a.class_name || a.name || '';
          bVal = b.class_name || b.name || '';
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
    });

    setFilteredClasses(result);
  }, [classes, searchTerm, filterLevel, sortBy, sortOrder]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const response = await fetch(`${API_BASE}/teacher/classes`, {
        headers: headers
      });
      
      const data = await response.json();
      console.log('Teacher classes:', data);
      
      if (data.success && data.data.length > 0) {
        const classesList = data.data;
        setClasses(classesList);
        
        // Calculate stats
        let totalStudents = 0;
        let totalSubjects = 0;
        let activeClasses = 0;
        
        classesList.forEach(cls => {
          const studentCount = parseInt(cls.student_count) || 0;
          totalStudents += studentCount;
          if (cls.subject) totalSubjects++;
          if (studentCount > 0) activeClasses++;
        });
        
        setStats({
          totalClasses: classesList.length,
          totalStudents: totalStudents,
          totalSubjects: totalSubjects,
          activeClasses: activeClasses,
        });
      } else {
        setClasses([]);
        setFilteredClasses([]);
        showToast('No classes assigned to you yet.', 'info');
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      showToast('Failed to load your classes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadClasses();
    showToast('Classes refreshed!', 'success');
  };

  const goToGrades = (classId) => {
    navigate(`/teacher/grades/${classId}`);
  };

  const goToDashboard = () => {
    navigate('/teacher/dashboard');
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getUniqueLevels = () => {
    const levels = new Set();
    classes.forEach(cls => {
      if (cls.level) levels.add(cls.level);
    });
    return ['all', ...Array.from(levels)];
  };

  // Get grade count for a class (placeholder - implement with actual API)
  const getGradedCount = (classId) => {
    // This would come from your API
    return 0;
  };

  if (loading) {
    return (
      <div className="teacher-classes-page loading-state">
        <div className="loading-spinner">
          <FontAwesomeIcon icon={faSpinner} spin />
          <span>Loading your classes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="teacher-classes-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <div className="page-icon">
            <FontAwesomeIcon icon={faSchool} />
          </div>
          <div>
            <h1>My Classes</h1>
            <p className="page-description">View and manage all classes assigned to you</p>
          </div>
        </div>
        <div className="page-actions">
          <button className="btn-back" onClick={goToDashboard}>
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
          </button>
          <button className="btn-refresh" onClick={refreshData} disabled={loading}>
            <FontAwesomeIcon icon={faRefresh} spin={loading} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faSchool} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalClasses}</h3>
            <p>Total Classes</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faBook} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalSubjects}</h3>
            <p>Subjects</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faChalkboardTeacher} />
          </div>
          <div className="stat-info">
            <h3>{stats.activeClasses}</h3>
            <p>Active Classes</p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {classes.length > 0 && (
        <div className="filters-section">
          <div className="filters-row">
            <div className="filter-group search-group"> 
              <input
                type="text"
                placeholder="Search classes, subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <div className="filter-group">
               
              <select 
                value={filterLevel} 
                onChange={(e) => setFilterLevel(e.target.value)}
                className="filter-select"
              >
                {getUniqueLevels().map(level => (
                  <option key={level} value={level}>
                    {level === 'all' ? 'All Levels' : level}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="name">Class Name</option>
                <option value="level">Level</option>
                <option value="students">Students</option>
                <option value="subject">Subject</option>
              </select>
            </div>

            <button 
              className="btn-sort-toggle"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortAmountUp : faSortAmountDown} />
            </button>
          </div>
        </div>
      )}

      {/* Classes Grid */}
      {filteredClasses.length > 0 ? (
        <div className="classes-grid">
          {filteredClasses.map((cls) => (
            <div 
              key={cls.id} 
              className="class-card"
              onClick={() => goToGrades(cls.id)}
            >
              <div className="class-card-header">
                <div className="class-icon">
                  <FontAwesomeIcon icon={faSchool} />
                </div>
                <div className="class-title">
                  <h3>{cls.class_name || cls.name}</h3>
                  <span className="class-level">{cls.level || 'N/A'}</span>
                </div>
                <div className="class-status">
                  {parseInt(cls.student_count) > 0 ? (
                    <span className="status-badge active">
                      <FontAwesomeIcon icon={faCheckCircle} /> Active
                    </span>
                  ) : (
                    <span className="status-badge inactive">
                      <FontAwesomeIcon icon={faExclamationTriangle} /> No Students
                    </span>
                  )}
                </div>
              </div>
              
              <div className="class-card-body">
                <div className="class-detail">
                  <FontAwesomeIcon icon={faBook} />
                  <span><strong>Subject:</strong> {cls.subject || 'Not Assigned'}</span>
                </div>
                <div className="class-detail">
                  <FontAwesomeIcon icon={faUserGraduate} />
                  <span><strong>Students:</strong> {cls.student_count || 0}</span>
                </div>
                <div className="class-detail">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  <span><strong>Academic Year:</strong> {cls.academic_year || '2024-2025'}</span>
                </div>
                <div className="class-detail">
                  <FontAwesomeIcon icon={faClipboardList} />
                  <span><strong>Graded:</strong> {getGradedCount(cls.id)} / {cls.student_count || 0}</span>
                </div>
              </div>
              
              <div className="class-card-footer">
                <button 
                  className="btn-enter-grades"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToGrades(cls.id);
                  }}
                >
                  <FontAwesomeIcon icon={faChartLine} />
                  Enter Grades
                  <FontAwesomeIcon icon={faChevronRight} className="arrow-icon" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : classes.length > 0 && filteredClasses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <FontAwesomeIcon icon={faSearch} />
          </div>
          <h3>No Matching Classes</h3>
          <p>No classes match your search or filter criteria.</p>
          <button 
            className="btn-clear-filters"
            onClick={() => {
              setSearchTerm('');
              setFilterLevel('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <FontAwesomeIcon icon={faSchool} />
          </div>
          <h3>No Classes Assigned</h3>
          <p>You haven't been assigned to any classes yet.</p>
          <p className="empty-subtext">Please contact the administrator to assign you to classes.</p>
          <button onClick={goToDashboard} className="back-button">
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
          </button>
        </div>
      )}

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default TeacherClasses;