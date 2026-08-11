import React, { useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGauge as faDashboard, faChalkboard, faUsers, faUserTie, faBook, 
  faUserPlus, faSignOutAlt, faBell, 
  faEnvelope, faCalendarAlt, faBars, faSchool, faCog,
  faCoins, faArrowUp
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import geebzLogo from '../assets/logo.png';

// Import pages
import Dashboard from './Dashboard';
import StudentsPage from './StudentsPage';
import Teachers from '../pages/Teachers';
import Classes from '../pages/Classes';
import Subjects from '../pages/Subjects';
import UsersPage from './UsersPage';
import TimetablePage from './TimetablePage';
import Fees from '../pages/Fees';
import SettingsPage from './SettingsPage';
import PromotionManagement from './PromotionManagement';
import '../styles/AdminDashboard.css';

const API_BASE = 'http://localhost:5000/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [logoExists, setLogoExists] = useState(true);

  React.useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = geebzLogo;
  }, []);

  console.log('User object:', user);

  const menuItems = [
    { path: '/admin', name: 'Dashboard', icon: faDashboard },
    { path: '/admin/students', name: 'Students', icon: faUsers },
    { path: '/admin/teachers', name: 'Teachers', icon: faUserTie },
    { path: '/admin/classes', name: 'Classes', icon: faChalkboard },
    { path: '/admin/subjects', name: 'Subjects', icon: faBook },
    { path: '/admin/timetable', name: 'Timetable', icon: faCalendarAlt },
    { path: '/admin/users', name: 'Users', icon: faUserPlus },
{ path: '/admin/fees', name: 'Fees', icon: faCoins },
    { path: '/admin/promotion', name: 'Promotion', icon: faArrowUp },
    { path: '/admin/settings', name: 'Settings', icon: faCog }
  ];

  const getPageTitle = () => {
    const current = menuItems.find(item => item.path === location.pathname);
    return current ? current.name : 'Dashboard';
  };

  const getUserName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user?.first_name) return user.first_name;
    if (user?.last_name) return user.last_name;
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'Administrator';
  };

  const getInitials = () => {
    const userName = getUserName();
    if (userName && userName !== 'Administrator') {
      const parts = userName.split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return userName.charAt(0).toUpperCase();
    }
    if (user?.first_name?.charAt(0) && user?.last_name?.charAt(0)) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.first_name?.charAt(0)) return user.first_name.charAt(0).toUpperCase();
    if (user?.last_name?.charAt(0)) return user.last_name.charAt(0).toUpperCase();
    return 'A';
  };

  const handleAvatarClick = () => {
    navigate('/admin/settings');
  };

  const handleUpdateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    window.location.reload();
  };

  const displayName = getUserName();

  // Navigation handler for Dashboard - Maps page names to admin routes
  const handleDashboardNavigate = (page) => {
    const routeMap = {
      'students': '/admin/students',
      'teachers': '/admin/teachers',
      'classes': '/admin/classes',
      'subjects': '/admin/subjects',
      'timetable': '/admin/timetable',
      'users': '/admin/users',
      'fees': '/admin/fees',
      'settings': '/admin/settings',
'attendance': '/admin/attendance',
      'grades': '/admin/grades',
      'performance': '/admin/grades',
      'promotion': '/admin/promotion'
    };
    
    const targetPath = routeMap[page] || `/admin/${page}`;
    console.log(`Dashboard navigating to: ${targetPath}`);
    navigate(targetPath);
  };

  return (
    <div className={`admin-dashboard ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-header">
          <div className="logo">
            {logoExists ? (
              <img src={geebzLogo} alt="Geebz SMS Logo" className="logo-image" />
            ) : (
              <FontAwesomeIcon icon={faSchool} />
            )}
            {!sidebarCollapsed && <span>Geebz SMS</span>}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              title={item.name}
            >
              <FontAwesomeIcon icon={item.icon} />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-section">
            <div className="user-avatar-wrapper">
              <button 
                className="user-avatar-circle" 
                onClick={handleAvatarClick}
                title="Profile Settings"
              >
                <span className="user-avatar-initials">{getInitials()}</span>
              </button>
              {!sidebarCollapsed && (
                <div className="user-info-text">
                  <div 
                    className="user-name" 
                    onClick={handleAvatarClick}
                    title="Click to edit profile"
                  >
                    {displayName}
                  </div>
                  <div className="user-role">Administrator</div>
                </div>
              )}
            </div>
            <button className="logout-btn" onClick={logout} title="Logout">
              <FontAwesomeIcon icon={faSignOutAlt} />
              {!sidebarCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="main-header">
          <div className="header-left">
            <h1>{getPageTitle()}</h1>
          </div>
          <div className="header-right">
            <div className="notifications-dropdown">
              <button 
                className="icon-btn" 
                onClick={() => setShowNotifications(!showNotifications)}
                title="Notifications"
              >
                <FontAwesomeIcon icon={faBell} />
                <span className="badge">3</span>
              </button>
              {showNotifications && (
                <div className="notifications-panel">
                  <div className="notification-item">
                    <p>New student registered</p>
                    <small>2 minutes ago</small>
                  </div>
                  <div className="notification-item">
                    <p>Fee payment received</p>
                    <small>1 hour ago</small>
                  </div>
                </div>
              )}
            </div>
            <button 
              className="icon-btn" 
              onClick={() => setShowMessages(!showMessages)}
              title="Messages"
            >
              <FontAwesomeIcon icon={faEnvelope} />
            </button>
            <div className="date-time" title="Current Date">
              <FontAwesomeIcon icon={faCalendarAlt} />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>
        </header>

        <div className="content-area">
          <div className="content-wrapper">
            <Routes>
              {/* Dashboard receives onNavigate prop */}
              <Route path="/" element={
                <Dashboard 
                  API_BASE={API_BASE} 
                  currentUser={user} 
                  onUpdateUser={handleUpdateUser}
                  onNavigate={handleDashboardNavigate}
                />
              } />
              <Route path="students" element={<StudentsPage API_BASE={API_BASE} />} />
              <Route path="teachers" element={<Teachers API_BASE={API_BASE} />} />
              <Route path="classes" element={<Classes API_BASE={API_BASE} />} />
              <Route path="subjects" element={<Subjects API_BASE={API_BASE} />} />
              <Route path="timetable" element={<TimetablePage API_BASE={API_BASE} />} />
              <Route path="users" element={<UsersPage API_BASE={API_BASE} />} />
<Route path="fees" element={<Fees API_BASE={API_BASE} />} />
              <Route path="promotion" element={<PromotionManagement API_BASE={API_BASE} />} />
              <Route path="settings" element={
                <SettingsPage 
                  currentUser={user} 
                  onUpdateUser={handleUpdateUser}
                  onClose={() => navigate('/admin')}
                />
              } />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;