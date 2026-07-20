// src/components/TeacherDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge as faDashboard,
  faChalkboard,
  faUsers,
  faCalendarCheck,
  faClipboardList,
  faSignOutAlt,
  faClock,
  faBars,
  faBell,
  faBullhorn,
  faUpload,
  faSchool,
} from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '../context/AuthContext';
import '../styles/TeacherDashboard.css';
import geebzLogo from '../assets/logo.png';

// Import all teacher page components
import TeacherClasses from '../pages/teacher/TeacherClasses';
import TeacherAttendance from '../pages/teacher/TeacherAttendance';
import TeacherGrades from '../pages/teacher/TeacherGrades';
import TeacherStudents from '../pages/teacher/TeacherStudents';
import TeacherAnnouncements from '../pages/teacher/TeacherAnnouncements'; // NEW
import TeacherAssignments from '../pages/teacher/TeacherAssignments'; // NEW

const API_BASE = 'http://localhost:5000/api';

const TeacherDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [logoExists, setLogoExists] = useState(true);

  const [stats, setStats] = useState({
    myClasses: 0,
    totalStudents: 0,
    attendanceToday: 0,
    pendingTasks: 0,
  });
  const [todaySchedule, setTodaySchedule] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if logo exists
  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = geebzLogo;
  }, []);

  // Load saved profile picture
  useEffect(() => {
    const savedPic = localStorage.getItem('teacherProfilePicUrl');
    if (savedPic) setProfilePicUrl(savedPic);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        setLoading(false);
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };

      // Get teacher stats
      const statsRes = await fetch(`${API_BASE}/teacher/stats`, { headers });
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      // Get schedule
      const scheduleRes = await fetch(`${API_BASE}/teacher/schedule`, { headers });
      const scheduleData = await scheduleRes.json();
      if (scheduleData.success) setTodaySchedule(scheduleData.data);

      // Get notifications
      const notifRes = await fetch(`${API_BASE}/teacher/notifications`, { headers });
      const notifData = await notifRes.json();
      if (notifData.success) setNotifications(notifData.data);

      // Get activities
      const activityRes = await fetch(`${API_BASE}/teacher/activities`, { headers });
      const activityData = await activityRes.json();
      if (activityData.success) setRecentActivities(activityData.data);

      // Get assigned classes
      const classesRes = await fetch(`${API_BASE}/teacher/classes`, { headers });
      const classesData = await classesRes.json();
      if (classesData.success) setAssignedClasses(classesData.data);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  // Menu items - includes all pages
  const menuItems = [
    { path: '/teacher', name: 'Dashboard', icon: faDashboard },
    { path: '/teacher/classes', name: 'My Classes', icon: faChalkboard },
    { path: '/teacher/students', name: 'My Students', icon: faUsers },
    { path: '/teacher/attendance', name: 'Take Attendance', icon: faCalendarCheck },
    { path: '/teacher/results', name: 'Enter Results', icon: faClipboardList },
    { path: '/teacher/announcements', name: 'Announcements', icon: faBullhorn },
    { path: '/teacher/assignments', name: 'Assignments', icon: faUpload },
  ];

  const renderDashboardContent = () => (
    <div className="teacher-dashboard-content">
      <div className="welcome-section">
        <h2>{getGreeting()}, {user?.first_name || 'Teacher'}!</h2>
        <p>Here's what's happening with your classes today.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faChalkboard} /></div>
          <div className="stat-info"><h3>{stats.myClasses}</h3><p>My Classes</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faUsers} /></div>
          <div className="stat-info"><h3>{stats.totalStudents}</h3><p>Total Students</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faCalendarCheck} /></div>
          <div className="stat-info"><h3>{stats.attendanceToday}%</h3><p>Attendance Today</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faClipboardList} /></div>
          <div className="stat-info"><h3>{stats.pendingTasks}</h3><p>Pending Tasks</p></div>
        </div>
      </div>

      {/* Assigned Classes */}
      <div className="assigned-classes-section">
        <div className="section-header"><h3><FontAwesomeIcon icon={faChalkboard} /> My Assigned Classes</h3></div>
        <div className="classes-grid">
          {assignedClasses.length > 0 ? assignedClasses.map((cls, idx) => (
            <div 
              key={idx} 
              className="class-card"
              onClick={() => navigate('/teacher/classes')}
            >
              <div className="class-header">
                <h4 className="class-name">{cls.class_name || cls.name}</h4>
                <span className="class-level">{cls.level}</span>
              </div>
              <div className="class-details">
                <div className="detail-item">
                  <span className="detail-label">Subject:</span>
                  <span className="detail-value">{cls.subject || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Students:</span>
                  <span className="detail-value">{cls.student_count || 0}</span>
                </div>
              </div>
            </div>
          )) : (
            <div className="no-data">No classes assigned yet</div>
          )}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-two-columns">
        <div className="schedule-section">
          <div className="section-header"><h3><FontAwesomeIcon icon={faClock} /> Today's Schedule</h3></div>
          <div className="schedule-list">
            {todaySchedule.length > 0 ? todaySchedule.map((item, idx) => (
              <div key={idx} className="schedule-item">
                <div className="schedule-time">{item.start_time || item.time || 'N/A'}</div>
                <div className="schedule-info">
                  <div className="schedule-subject">{item.subject_name || item.subject || 'General'}</div>
                  <div className="schedule-class">{item.class_name || item.class || 'N/A'}</div>
                  <div className="schedule-room">{item.room_name || item.room || 'TBD'}</div>
                </div>
              </div>
            )) : (
              <div className="no-data">No schedule for today</div>
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
            <button className="action-btn secondary" onClick={() => navigate('/teacher/announcements')}>
              <FontAwesomeIcon icon={faBullhorn} /> Post Announcement
            </button>
            <button className="action-btn secondary" onClick={() => navigate('/teacher/assignments')}>
              <FontAwesomeIcon icon={faUpload} /> Upload Assignment
            </button>
          </div>
        </div>
      </div>

      {/* Notifications & Activity */}
      <div className="dashboard-two-columns">
        <div className="notifications-section">
          <div className="section-header"><h3><FontAwesomeIcon icon={faBell} /> Notifications</h3></div>
          <div className="notifications-list">
            {notifications.length > 0 ? notifications.map(notif => (
              <div key={notif.id} className={`notification-item ${notif.type === 'warning' ? 'notif-warning' : 'notif-info'}`}>
                <div className="notif-message">{notif.message}</div>
                <div className="notif-date">{new Date(notif.created_at || notif.date).toLocaleDateString()}</div>
              </div>
            )) : (
              <div className="no-data">No notifications</div>
            )}
          </div>
        </div>
        <div className="activity-section">
          <div className="section-header"><h3>Recent Activity</h3></div>
          <div className="activity-list">
            {recentActivities.length > 0 ? recentActivities.map((act, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-action">{act.description || act.action || 'Activity'}</div>
                <div className="activity-time">{act.created_at ? new Date(act.created_at).toLocaleDateString() : act.time || 'Just now'}</div>
              </div>
            )) : (
              <div className="no-data">No recent activities</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="teacher-dashboard loading-state">Loading dashboard...</div>;

  return (
    <div className="teacher-dashboard">
      {/* Mobile menu toggle */}
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        <FontAwesomeIcon icon={faBars} />
      </button>

      {/* Sidebar */}
      <aside className={`teacher-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            {logoExists ? (
              <img src={geebzLogo} alt="Geebz SMS Logo" className="logo-image" />
            ) : (
              <FontAwesomeIcon icon={faSchool} />
            )}
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
              <div 
               className="user-info-text" 
               style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 auto',
                minWidth: '0',
                overflow: 'hidden'
              }}
            >
                  <div className="user-name">{user?.first_name || 'Teacher'}</div>
                <div className="user-role">Teacher</div>

              </div>
            </div>
            <button className="logout-btn" onClick={logout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}

      {/* Main content */}
      <main className="teacher-main">
        <header className="main-header">
          <div className="header-left">
            <h1>{menuItems.find(i => i.path === location.pathname)?.name || 'Teacher Dashboard'}</h1>
          </div>
          <div className="header-right">
            <div className="date-time">
              <FontAwesomeIcon icon={faClock} />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </header>
        <div className="content-area">
          <Routes>
            <Route path="/" element={renderDashboardContent()} />
            <Route path="/classes" element={<TeacherClasses API_BASE={API_BASE} />} />
            <Route path="/students" element={<TeacherStudents API_BASE={API_BASE} />} />
            <Route path="/attendance" element={<TeacherAttendance API_BASE={API_BASE} />} />
            <Route path="/results" element={<TeacherGrades API_BASE={API_BASE} />} />
            <Route path="/announcements" element={<TeacherAnnouncements API_BASE={API_BASE} />} />
            <Route path="/assignments" element={<TeacherAssignments API_BASE={API_BASE} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
