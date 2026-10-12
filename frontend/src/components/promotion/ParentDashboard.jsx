import { apiFetch } from '../../services/api.js';
// src/components/ParentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGauge as faDashboard, faChildren, faChartLine, faCalendarAlt,
  faSignOutAlt, faClock, faBars, faMoneyBillWave,
  faEye, faSpinner, faBell, faReceipt
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/useAuth';
import geebzLogo from '../assets/logo.png';
import '../styles/ParentDashboard.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api');

// Placeholder components (will be replaced later)
const ParentPerformance = ({ children }) => (
  <div><h2>Performance</h2>{children?.map(c => <p key={c.id}>{c.first_name} {c.last_name}</p>)}</div>
);
const ParentAttendance = ({ children }) => (
  <div><h2>Attendance</h2>{children?.map(c => <p key={c.id}>{c.first_name} {c.last_name}</p>)}</div>
);
const ParentFees = ({ children }) => (
  <div><h2>Fees</h2>{children?.map(c => <p key={c.id}>{c.first_name} {c.last_name}</p>)}</div>
);

const ParentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState(localStorage.getItem('parentProfilePicUrl') || '');
  const [children, setChildren] = useState([]);
  const [stats, setStats] = useState({ totalChildren: 0, avgPerformance: 0, attendanceRate: 0, notifications: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

        // 1. Children
        const childrenRes = await apiFetch(`${API_BASE}/parent/children`, { headers });
        const childrenJson = await childrenRes.json();
        const childrenList = childrenJson.data || [];
        if (childrenJson.success) {
          setChildren(childrenList);
          setStats(prev => ({ ...prev, totalChildren: childrenList.length }));
        } else {
          setError('Failed to load children');
        }

        // 2. Notifications
        try {
          const notifRes = await apiFetch(`${API_BASE}/parent/notifications`, { headers });
          const notifJson = await notifRes.json();
          if (notifJson.success) {
            const unread = notifJson.data?.filter(n => !n.is_read).length || 0;
            setStats(prev => ({ ...prev, notifications: unread }));
          }
        } catch (notificationError) {
          console.error('Failed to load parent notifications:', notificationError);
        }

        // 3. Performance / attendance (compute from child endpoints)
        if (childrenList.length > 0) {
          let totalPerf = 0, totalAtt = 0, count = 0;
          for (const child of childrenList) {
            try {
              const perfRes = await apiFetch(`${API_BASE}/parent/child/${child.id}/performance`, { headers });
              const perfJson = await perfRes.json();
              if (perfJson.success && perfJson.data?.performance) {
                totalPerf += perfJson.data.performance.average_score || 0;
                totalAtt += perfJson.data.performance.attendance_rate || 0;
                count++;
              }
            } catch (performanceError) {
              console.error(`Failed to load performance for child ${child.id}:`, performanceError);
            }
          }
          if (count > 0) {
            setStats(prev => ({
              ...prev,
              avgPerformance: Math.round(totalPerf / count),
              attendanceRate: Math.round(totalAtt / count)
            }));
          }
        }
      } catch (err) {
        console.error(err);
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchParentData();
  }, []);

  const getInitials = () => {
    if (user?.first_name && user?.last_name) return (user.first_name[0] + user.last_name[0]).toUpperCase();
    if (user?.first_name) return user.first_name[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'P';
  };

  const handleProfilePicUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setProfilePicUrl(ev.target.result);
        localStorage.setItem('parentProfilePicUrl', ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  const menuItems = [
    { path: '/parent', name: 'Dashboard', icon: faDashboard },
    { path: '/parent/performance', name: 'Performance', icon: faChartLine },
    { path: '/parent/attendance', name: 'Attendance', icon: faCalendarAlt },
    { path: '/parent/fees', name: 'Fees', icon: faMoneyBillWave },
  ];

  const renderDashboardContent = () => (
    <div className="parent-dashboard-content">
      <div className="welcome-section">
        <h2>Welcome, {user?.first_name || 'Parent'}!</h2>
        <p>Monitor your child's academic progress and school activities.</p>
        {error && <div className="error-banner">{error}</div>}
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"><FontAwesomeIcon icon={faChildren} /></div>
          <div className="stat-info"><h3>{stats.totalChildren}</h3><p>My Children</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><FontAwesomeIcon icon={faChartLine} /></div>
          <div className="stat-info"><h3>{stats.avgPerformance || '--'}</h3><p>Avg Performance</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple"><FontAwesomeIcon icon={faCalendarAlt} /></div>
          <div className="stat-info"><h3>{stats.attendanceRate || '--'}</h3><p>Attendance Rate</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange"><FontAwesomeIcon icon={faBell} /></div>
          <div className="stat-info"><h3>{stats.notifications}</h3><p>Notifications</p></div>
        </div>
      </div>

      <div className="dashboard-two-columns">
        <div className="quick-actions-section">
          <div className="section-header"><h3>Quick Actions</h3></div>
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
          <div className="section-header"><h3>Recent Notifications</h3></div>
          <div className="notifications-list">
            <div className="empty-state">No new notifications</div>
          </div>
        </div>
      </div>

      <div className="my-children-section">
        <div className="section-header">
          <h3>My Children</h3>
          <button className="btn-link" onClick={() => navigate('/parent/performance')}>View All →</button>
        </div>
        <div className="children-preview">
          {loading ? (
            <div className="loading-children"><FontAwesomeIcon icon={faSpinner} spin /> Loading...</div>
          ) : children.length === 0 ? (
            <div className="no-children">
              <FontAwesomeIcon icon={faChildren} />
              <p>No children found.</p>
              <p className="sub-text">Please contact the school administrator to link your children.</p>
            </div>
          ) : (
            <div className="children-list">
              {children.map(child => (
                <div key={child.id} className="child-card">
                  <div className="child-avatar">
                    <span className="child-initials">{child.first_name?.[0]}{child.last_name?.[0]}</span>
                  </div>
                  <div className="child-info">
                    <h4>{child.first_name} {child.last_name}</h4>
                    <p>Class: {child.class_name || 'Not assigned'}</p>
                    <p>Admission: {child.admission_number}</p>
                  </div>
                  <button className="btn-view" onClick={() => navigate(`/parent/performance?child=${child.id}`)}>
                    <FontAwesomeIcon icon={faEye} /> View
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="children-hint">Select a child from the sidebar to see detailed reports.</p>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="loading-state">Loading dashboard...</div>;

  return (
    <div className="parent-dashboard">
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        <FontAwesomeIcon icon={faBars} />
      </button>

      <aside className={`parent-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <img src={geebzLogo} alt="Logo" className="logo-image" />
            <span>Parent Portal</span>
          </div>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); if (window.innerWidth <= 768) closeMobileMenu(); }}
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
              <input type="file" accept="image/*" onChange={handleProfilePicUpload} id="avatar-upload" style={{ display: 'none' }} />
              <label htmlFor="avatar-upload" className="user-avatar-circle">
                {profilePicUrl ? <img src={profilePicUrl} alt="Profile" /> : <span className="user-avatar-initials">{getInitials()}</span>}
              </label>
              <div className="user-info-text">
                <div className="user-name">{user?.first_name} {user?.last_name}</div>
                <div className="user-role">Parent</div>
              </div>
            </div>
            <button className="logout-btn" onClick={logout}><FontAwesomeIcon icon={faSignOutAlt} /> Logout</button>
          </div>
        </div>
      </aside>

      {mobileMenuOpen && <div className="sidebar-overlay" onClick={closeMobileMenu}></div>}

      <main className="parent-main">
        <header className="main-header">
          <h1>{menuItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}</h1>
          <div className="date-time"><FontAwesomeIcon icon={faClock} /> {new Date().toLocaleDateString()}</div>
        </header>
        <div className="content-area">
          <Routes>
            <Route path="/" element={renderDashboardContent()} />
            <Route path="/performance" element={<ParentPerformance children={children} />} />
            <Route path="/attendance" element={<ParentAttendance children={children} />} />
            <Route path="/fees" element={<ParentFees children={children} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default ParentDashboard;
