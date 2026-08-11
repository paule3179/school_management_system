// src/components/TeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge as faDashboard,
  faChalkboard,
  faChalkboardUser,
  faUsers,
  faCalendarCheck,
  faClipboardList,
  faSignOutAlt,
  faClock,
  faBars,
  faBell,
  faSpinner,
  faExclamationTriangle,
  faUserGraduate,
  faSchool,
  faChartLine,
  faArrowUp,
} from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '../context/AuthContext';
import '../styles/TeacherDashboard.css';

import TeacherClasses from '../pages/teacher/TeacherClasses';
import TeacherAttendance from '../pages/teacher/TeacherAttendance';
import TeacherGrades from '../pages/teacher/TeacherGrades';
import TeacherStudents from '../pages/teacher/TeacherStudents';
import AssessmentEntryPage from '../pages/teacher/AssessmentEntryPage';
import ExamEntryPage from '../pages/teacher/ExamEntryPage';
import PromotionManagement from './PromotionManagement';
import TeacherPromotion from '../pages/teacher/TeacherPromotion';

const API_BASE = 'http://localhost:5000/api';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for dashboard data – initialized with 0 to show real data
  const [stats, setStats] = useState({
    myClasses: 0,
    totalStudents: 0,
    attendanceToday: 0,
    pendingTasks: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  useEffect(() => {
    const savedPic = localStorage.getItem('teacherProfilePicUrl');
    if (savedPic) setProfilePicUrl(savedPic);
  }, []);

useEffect(() => {
    fetchDashboardData();
  }, []);

  // Refetch dashboard data whenever the user navigates back to the dashboard
  // route (e.g. after marking attendance). Because this layout component stays
  // mounted while navigating between /teacher/* pages, the stats cards would
  // otherwise keep showing stale data (e.g. attendance stuck at 0%).
  useEffect(() => {
    if (location.pathname === '/teacher' || location.pathname === '/teacher/') {
      fetchDashboardData();
    }
  }, [location.pathname]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  };

  const fetchDashboardData = async () => {
  setLoading(true);
  setError(null);
  try {
    const headers = getAuthHeaders();
    const token = localStorage.getItem('token');

    if (!token) {
      // no token - show empty
      setStats({ myClasses: 0, totalStudents: 0, attendanceToday: 0, pendingTasks: 0 });
      setTodaySchedule([]);
      setNotifications([]);
      setRecentActivities([]);
      setLoading(false);
      return;
    }

    console.log('🔄 Fetching teacher dashboard data...');

    const [statsRes, classesRes, scheduleRes, notificationsRes] = await Promise.all([
      fetch(`${API_BASE}/teacher/stats`, { headers }),
      fetch(`${API_BASE}/teacher/classes`, { headers }),
      fetch(`${API_BASE}/teacher/schedule`, { headers }),
      fetch(`${API_BASE}/teacher/notifications`, { headers }),
    ]);

    // Process classes first - we need the list to count
    let classesList = [];
    if (classesRes.ok) {
      const classesJson = await classesRes.json();
      if (classesJson.success) {
        classesList = classesJson.data || [];
        console.log('📚 Classes list length:', classesList.length);
      }
    }

    // Process stats - use classesList.length as primary source for myClasses
    let statsData = {};
    if (statsRes.ok) {
      const statsJson = await statsRes.json();
      if (statsJson.success) {
        statsData = statsJson.data || {};
        console.log('📊 Stats data:', statsData);
      }
    }

    // Compute total students from classes list as fallback
    let totalStudentsFromClasses = 0;
    classesList.forEach(cls => {
      totalStudentsFromClasses += parseInt(cls.student_count) || 0;
    });

    setStats({
      myClasses: classesList.length > 0 ? classesList.length : (statsData.totalClasses ?? statsData.total_classes ?? 0),
      totalStudents: statsData.totalStudents ?? statsData.total_students ?? totalStudentsFromClasses,
      attendanceToday: statsData.attendanceToday ?? statsData.today_classes ?? statsData.attendance_today ?? 0,
      pendingTasks: statsData.pendingTasks ?? statsData.pending_tasks ?? 0,
    });

    // Process schedule
    if (scheduleRes.ok) {
      const scheduleJson = await scheduleRes.json();
      if (scheduleJson.success) {
        const data = scheduleJson.data || [];
        setTodaySchedule(data.map(item => ({
          time: item.time || item.start_time || 'TBD',
          subject: item.subject || item.subject_name || 'General',
          class: item.class_name || item.class || 'N/A',
          room: item.room || item.location || '—',
        })));
      }
    } else if (classesList.length > 0) {
      // If schedule fails, build a simple schedule from classes list
      setTodaySchedule(classesList.map(cls => ({
        time: 'Today',
        subject: cls.subject || 'Class',
        class: cls.class_name || cls.name || 'N/A',
        room: '—',
      })));
    } else {
      setTodaySchedule([]);
    }

    // Process notifications (unchanged)
    if (notificationsRes.ok) {
      const notifJson = await notificationsRes.json();
      if (notifJson.success) {
        const data = notifJson.data || [];
        setNotifications(data.map((n, idx) => ({
          id: n.id ?? idx,
          message: n.message ?? n.title ?? 'Notification',
          type: n.type ?? 'info',
          date: n.created_at ?? n.date ?? new Date().toISOString(),
        })));
      }
    }

    // Process activities (unchanged)
    try {
      const actRes = await fetch(`${API_BASE}/teacher/activities`, { headers });
      if (actRes.ok) {
        const actJson = await actRes.json();
        if (actJson.success) {
          setRecentActivities((actJson.data || []).map(a => ({
            action: a.description || a.activity_type || 'Activity',
            time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : 'Just now',
          })));
        }
      }
} catch {
      /* ignore */
    }

  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error);
    setError('Could not load dashboard data. Some cards may show 0.');
  } finally {
    setLoading(false);
  }
};

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.first_name) return user.first_name.charAt(0).toUpperCase();
    if (user?.last_name) return user.last_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
    return 'T';
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setProfilePicUrl(base64);
        localStorage.setItem('teacherProfilePicUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

const menuItems = [
    { path: '/teacher', name: 'Dashboard', icon: faDashboard },
    { path: '/teacher/classes', name: 'My Classes', icon: faChalkboard },
    { path: '/teacher/students', name: 'My Students', icon: faUsers },
    { path: '/teacher/attendance', name: 'Take Attendance', icon: faCalendarCheck },
    { path: '/teacher/results', name: 'Enter Results', icon: faClipboardList },
    { path: '/teacher/promotion', name: 'Promotion', icon: faArrowUp },
  ];

  const renderDashboardContent = () => (
    <div className="teacher-dashboard-content">
      <div className="welcome-section">
        <h2>{getGreeting()}, {user?.first_name || 'Teacher'}!</h2>
        <p>Here's what's happening with your classes today.</p>
        {error && (
          <div className="error-banner">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <span>{error}</span>
          </div>
        )}
      </div>

{/* 4 STAT CARDS – display actual data from API */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faSchool} />
          </div>
          <div className="stat-info">
            <h3>{stats.myClasses}</h3>
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
            <FontAwesomeIcon icon={faCalendarCheck} />
          </div>
          <div className="stat-info">
            <h3>{stats.attendanceToday}%</h3>
            <p>Attendance Today</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="stat-info">
            <h3>{stats.pendingTasks}</h3>
            <p>Pending Tasks</p>
          </div>
        </div>
      </div>

      {/* Two‑column layout */}
      <div className="dashboard-two-columns">
        <div className="schedule-section">
          <div className="section-header">
            <h3><FontAwesomeIcon icon={faClock} /> Today's Schedule</h3>
          </div>
          <div className="schedule-list">
            {todaySchedule.length === 0 ? (
              <div className="schedule-item">No classes scheduled for today</div>
            ) : (
              todaySchedule.map((item, idx) => (
                <div key={idx} className="schedule-item">
                  <div className="schedule-time">{item.time}</div>
                  <div className="schedule-info">
                    <div className="schedule-subject">{item.subject}</div>
                    <div className="schedule-class">{item.class}</div>
                    <div className="schedule-room">{item.room}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="quick-actions-section">
          <div className="section-header"><h3>Quick Actions</h3></div>
          <div className="quick-actions-grid">
            <button className="action-btn primary" onClick={() => navigate('/teacher/attendance')}>
              <FontAwesomeIcon icon={faCalendarCheck} /> Take Attendance
            </button>
            <button className="action-btn primary" onClick={() => navigate('/teacher/results')}>
              <FontAwesomeIcon icon={faClipboardList} /> Enter Scores
            </button>
          </div>
        </div>
      </div>

      {/* Notifications + Recent Activity */}
      <div className="dashboard-two-columns">
        <div className="notifications-section">
          <div className="section-header"><h3><FontAwesomeIcon icon={faBell} /> Notifications</h3></div>
          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="notification-item notif-info">No new notifications</div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className={`notification-item ${notif.type === 'warning' ? 'notif-warning' : 'notif-info'}`}>
                  <div className="notif-message">{notif.message}</div>
                  <div className="notif-date">{new Date(notif.date).toLocaleDateString()}</div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="activity-section">
          <div className="section-header"><h3>Recent Activity</h3></div>
          <div className="activity-list">
            {recentActivities.length === 0 ? (
              <div className="activity-item">No recent activity</div>
            ) : (
              recentActivities.map((act, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-action">{act.action}</div>
                  <div className="activity-time">{act.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="teacher-dashboard loading-state">
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="teacher-dashboard">
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        <FontAwesomeIcon icon={faBars} />
      </button>

      <aside className={`teacher-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <FontAwesomeIcon icon={faChalkboardUser} />
            <span>Teacher Portal</span>
          </div>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                if (window.innerWidth <= 768) closeMobileMenu();
              }}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <FontAwesomeIcon icon={item.icon} />
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-section">
            <div className="user-avatar-wrapper">
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePicUpload}
                className="teacher-avatar-input"
                id="teacher-avatar-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="teacher-avatar-upload" className="user-avatar-circle" title="Click to upload profile picture">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Profile" className="user-avatar-image" />
                ) : (
                  <span className="user-avatar-initials">{getInitials()}</span>
                )}
              </label>
              <div className="user-info-text">
                <div className="user-name" onClick={() => navigate('/teacher')}>
                  {user?.first_name || 'Teacher'}
                </div>
                <div className="user-role">Teacher</div>
              </div>
            </div>
            <button className="logout-btn" onClick={logout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}

      <main className="teacher-main">
        <header className="main-header">
          <div className="header-left">
            <h1>{menuItems.find(i => i.path === location.pathname)?.name || 'Teacher Dashboard'}</h1>
          </div>
          <div className="header-right">
            <div className="date-time">
              <span className="date-icon" aria-hidden="true">📅</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </header>
        <div className="content-area">
          <Routes>
            <Route index element={renderDashboardContent()} />
            <Route path="classes" element={<TeacherClasses API_BASE={API_BASE} />} />
            <Route path="students" element={<TeacherStudents API_BASE={API_BASE} />} />
            <Route path="attendance" element={<TeacherAttendance API_BASE={API_BASE} />} />
            <Route path="grades/:classId" element={<TeacherGrades API_BASE={API_BASE} />} />
            <Route path="grades/ca-entry" element={<AssessmentEntryPage API_BASE={API_BASE} />} />
            <Route path="grades/exam-entry" element={<ExamEntryPage API_BASE={API_BASE} />} />
<Route path="results" element={<TeacherGrades API_BASE={API_BASE} />} />
            <Route path="promotion" element={<TeacherPromotion API_BASE={API_BASE} />} />
            <Route path="*" element={renderDashboardContent()} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;