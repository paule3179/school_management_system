// src/components/ParentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge as faDashboard,
  faChartLine,
  faCalendarAlt,
  faBook,
  faMoneyBillWave,
  faSignOutAlt,
  faBars,
  faChildren,
  faBell,
  faEye,
  faReceipt,
  faSpinner,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';

import { useAuth } from '../context/AuthContext';
import ParentPerformance from '../pages/parent/ParentPerformance';
import ParentAttendance from '../pages/parent/ParentAttendance';
import ParentSubjects from '../pages/parent/ParentSubjects';
import ParentFees from '../pages/parent/ParentFees';
import geebzLogo from '../assets/logo.png';
import '../styles/ParentDashboard.css';

const API_BASE = 'http://localhost:5000/api';

const ParentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [children, setChildren] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    avgPerformance: 0,
    attendanceRate: 0
  });
  const [logoExists, setLogoExists] = useState(true);

  // Check if logo exists
  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = geebzLogo;
  }, []);

  // Load profile picture from localStorage
  useEffect(() => {
    const savedPic = localStorage.getItem('parentProfilePicUrl');
    if (savedPic) setProfilePicUrl(savedPic);
  }, []);

  // Fetch parent data
  useEffect(() => {
    const fetchParentData = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Please login to continue');
          setLoading(false);
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        // 1. Fetch children (primary)
        console.log('📡 Fetching children...');
        const childrenRes = await fetch(`${API_BASE}/parent/children`, { headers });
        let childrenData = [];
        if (childrenRes.ok) {
          const childrenJson = await childrenRes.json();
          childrenData = childrenJson.success ? (childrenJson.data || []) : [];
        } else {
          console.warn('Children endpoint failed:', childrenRes.status);
        }
        setChildren(childrenData);

        // 2. Fetch notifications (optional)
        try {
          const notifRes = await fetch(`${API_BASE}/parent/notifications`, { headers });
          if (notifRes.ok) {
            const notifJson = await notifRes.json();
            setNotifications(notifJson.success ? (notifJson.data || []) : []);
          }
        } catch (_) {
          setNotifications([]);
        }

        // 3. Compute stats from children data
        if (childrenData.length > 0) {
          let totalPerf = 0, totalAtt = 0, count = 0;
          for (const child of childrenData) {
            try {
              const perfRes = await fetch(`${API_BASE}/parent/child/${child.id}/performance`, { headers });
              if (perfRes.ok) {
                const perfJson = await perfRes.json();
                if (perfJson.success && perfJson.data?.performance) {
                  totalPerf += perfJson.data.performance.average_score || 0;
                  totalAtt += perfJson.data.performance.attendance_rate || 0;
                  count++;
                }
              }
            } catch (_) {
              // skip if performance fails
            }
          }
          if (count > 0) {
            setStats({
              avgPerformance: Math.round(totalPerf / count),
              attendanceRate: Math.round(totalAtt / count)
            });
          }
        }
      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchParentData();
  }, []);

  const getParentDisplayName = () => {
    if (user?.first_name && user?.first_name !== 'Test' && user?.first_name !== 'test') {
      return `${user.first_name} ${user.last_name || ''}`.trim();
    }
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.first_name && parsed.first_name !== 'Test' && parsed.first_name !== 'test') {
          return `${parsed.first_name} ${parsed.last_name || ''}`.trim();
        }
        if (parsed.email) return parsed.email.split('@')[0];
      }
    } catch { /* ignore */ }
    if (user?.email) return user.email.split('@')[0];
    return 'Parent';
  };

  const getInitials = () => {
    const name = getParentDisplayName();
    if (name && name !== 'Parent') {
      const parts = name.split(' ');
      if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      return name.charAt(0).toUpperCase();
    }
    return 'P';
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setProfilePicUrl(base64);
        localStorage.setItem('parentProfilePicUrl', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Menu items – no Messages
  const menuItems = [
    { path: '/parent', name: 'Dashboard', icon: faDashboard },
    { path: '/parent/performance', name: 'Performance', icon: faChartLine },
    { path: '/parent/attendance', name: 'Attendance', icon: faCalendarAlt },
    { path: '/parent/subjects', name: 'Subjects', icon: faBook },
    { path: '/parent/fees', name: 'Fees', icon: faMoneyBillWave },
  ];

  const renderDashboardContent = () => {
    const displayName = getParentDisplayName();

    return (
      <div className="parent-dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {displayName}!</h2>
          <p>Monitor your child's academic progress and school activities.</p>
          {error && (
            <div className="error-banner">
              <FontAwesomeIcon icon={faExclamationTriangle} />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon blue">
              <FontAwesomeIcon icon={faChildren} />
            </div>
            <div className="stat-info">
              <h3>{children.length}</h3>
              <p>My Children</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">
              <FontAwesomeIcon icon={faChartLine} />
            </div>
            <div className="stat-info">
              <h3>{stats.avgPerformance || '--'}</h3>
              <p>Avg Performance</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">
              <FontAwesomeIcon icon={faCalendarAlt} />
            </div>
            <div className="stat-info">
              <h3>{stats.attendanceRate || '--'}</h3>
              <p>Attendance Rate</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">
              <FontAwesomeIcon icon={faBell} />
            </div>
            <div className="stat-info">
              <h3>{notifications.length}</h3>
              <p>Notifications</p>
            </div>
          </div>
        </div>

        <div className="dashboard-two-columns">
          <div className="quick-actions-section">
            <div className="section-header">
              <h3><FontAwesomeIcon icon={faEye} /> Quick Actions</h3>
            </div>
            <div className="quick-actions-grid">
              <button className="action-btn primary" onClick={() => navigate('/parent/performance')}>
                <FontAwesomeIcon icon={faChartLine} /> View Performance
              </button>
              <button className="action-btn primary" onClick={() => navigate('/parent/attendance')}>
                <FontAwesomeIcon icon={faCalendarAlt} /> Check Attendance
              </button>
              <button className="action-btn secondary" onClick={() => navigate('/parent/fees')}>
                <FontAwesomeIcon icon={faReceipt} /> Fee Status
              </button>
            </div>
          </div>

          <div className="notifications-section">
            <div className="section-header">
              <h3><FontAwesomeIcon icon={faBell} /> Recent Notifications</h3>
            </div>
            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="empty-state">No new notifications</div>
              ) : (
                notifications.slice(0, 3).map(notif => (
                  <div key={notif.id} className={`notification-item ${notif.type === 'warning' ? 'notif-warning' : 'notif-info'}`}>
                    <div className="notif-message">{notif.message}</div>
                    <div className="notif-date">{new Date(notif.created_at).toLocaleDateString()}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="my-children-section">
          <div className="section-header">
            <h3><FontAwesomeIcon icon={faChildren} /> My Children</h3>
            <button className="btn-link" onClick={() => navigate('/parent/performance')}>View All →</button>
          </div>
          <div className="children-preview">
            {children.length === 0 ? (
              <div className="empty-children">
                <p>No children found.</p>
                <p className="hint">Please contact the school administrator to link your children.</p>
              </div>
            ) : (
              <div className="children-list">
                {children.map(child => (
                  <div key={child.id} className="child-item">
                    <span className="child-name">{child.first_name} {child.last_name}</span>
                    <button className="child-select-btn" onClick={() => navigate(`/parent/performance?child=${child.id}`)}>
                      View Performance
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="children-hint">Select a child to see detailed reports.</p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  const sidebarDisplayName = getParentDisplayName();

  return (
    <div className={`parent-dashboard ${sidebarCollapsed ? 'collapsed' : ''}`}>
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        <FontAwesomeIcon icon={faBars} />
      </button>

      <aside className={`parent-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            {logoExists ? (
              <img src={geebzLogo} alt="Geebz SMS Logo" className="logo-image" />
            ) : (
              <FontAwesomeIcon icon={faChildren} />
            )}
            <span>Parent Portal</span>
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
                className="parent-avatar-input"
                id="parent-avatar-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="parent-avatar-upload" className="user-avatar-circle" title="Upload profile picture">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Profile" className="user-avatar-image" />
                ) : (
                  <span className="user-avatar-initials">{getInitials()}</span>
                )}
              </label>
              <div className="user-info-text">
                <div className="user-name" onClick={() => navigate('/parent')}>
                  {sidebarDisplayName}
                </div>
                <div className="user-role">Parent</div>
              </div>
            </div>
            <button className="logout-btn" onClick={logout}>
              <FontAwesomeIcon icon={faSignOutAlt} /> Logout
            </button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}

      <main className="parent-main">
        <header className="main-header">
          <div className="header-left">
            <h1>{menuItems.find(i => i.path === location.pathname)?.name || 'Parent Dashboard'}</h1>
          </div>
          <div className="header-right">
            <div className="date-time">
              <span className="date-icon" aria-hidden="true">📅</span>
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>
        </header>
        <div className="content-area">
          <Routes>
            <Route path="/" element={renderDashboardContent()} />
            <Route path="/performance" element={<ParentPerformance API_BASE={API_BASE} />} />
            <Route path="/attendance" element={<ParentAttendance API_BASE={API_BASE} />} />
            <Route path="/subjects" element={<ParentSubjects API_BASE={API_BASE} />} />
            <Route path="/fees" element={<ParentFees API_BASE={API_BASE} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default ParentDashboard;