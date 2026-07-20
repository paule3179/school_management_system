// src/components/ParentDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGauge as faDashboard, faChildren, faChartLine, faCalendarAlt,
  faSignOutAlt, faClock, faBars, faMoneyBillWave, faStar, faSchool,
  faEye, faSpinner, faBell, faCheckCircle, faReceipt, faUserGraduate,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import geebzLogo from '../assets/logo.png';
import '../styles/ParentDashboard.css';

const API_BASE = 'http://localhost:5000/api';

// Parent-specific pages with real data
const ParentPerformance = ({ API_BASE, children }) => {
  const [loading, setLoading] = useState(true);
  const [performance, setPerformance] = useState([]);

  useEffect(() => {
    fetchPerformance();
  }, []);

  const fetchPerformance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/parent/performance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPerformance(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><FontAwesomeIcon icon={faSpinner} spin /> Loading performance...</div>;

  return (
    <div className="parent-performance">
      <h2>My Children's Performance</h2>
      {children?.length === 0 ? (
        <p>No children found.</p>
      ) : (
        children?.map(child => (
          <div key={child.id} className="child-performance-card">
            <h3>{child.first_name} {child.last_name}</h3>
            <p>Class: {child.class_name || 'Not assigned'}</p>
            <p>Admission: {child.admission_number}</p>
          </div>
        ))
      )}
    </div>
  );
};

const ParentAttendance = ({ API_BASE, children }) => {
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/parent/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAttendance(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><FontAwesomeIcon icon={faSpinner} spin /> Loading attendance...</div>;

  return (
    <div className="parent-attendance">
      <h2>Attendance Records</h2>
      {children?.length === 0 ? (
        <p>No children found.</p>
      ) : (
        children?.map(child => (
          <div key={child.id} className="child-attendance-card">
            <h3>{child.first_name} {child.last_name}</h3>
            <p>Attendance records will appear here.</p>
          </div>
        ))
      )}
    </div>
  );
};

const ParentFees = ({ API_BASE, children }) => {
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState([]);

  useEffect(() => {
    fetchFees();
  }, []);

  const fetchFees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/parent/fees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setFees(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading"><FontAwesomeIcon icon={faSpinner} spin /> Loading fees...</div>;

  return (
    <div className="parent-fees">
      <h2>Fee Payment Status</h2>
      {children?.length === 0 ? (
        <p>No children found.</p>
      ) : (
        children?.map(child => (
          <div key={child.id} className="child-fees-card">
            <h3>{child.first_name} {child.last_name}</h3>
            <p>Fee records will appear here.</p>
          </div>
        ))
      )}
    </div>
  );
};

const ParentDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoExists, setLogoExists] = useState(true);
  const [profilePicUrl, setProfilePicUrl] = useState(() => localStorage.getItem('parentProfilePicUrl') || '');
  const [children, setChildren] = useState([]);
  const [stats, setStats] = useState({
    totalChildren: 0,
    avgPerformance: 0,
    attendanceRate: 0,
    notifications: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoExists(true);
    img.onerror = () => setLogoExists(false);
    img.src = geebzLogo;
  }, []);

  useEffect(() => {
    fetchParentData();
  }, []);

  const fetchParentData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      console.log(' Fetching parent data...');

      // 1. Get children from parent endpoint
      const childrenRes = await fetch(`${API_BASE}/parent/children`, { headers });
      console.log(' Children response status:', childrenRes.status);
      
      const childrenData = await childrenRes.json();
      console.log(' Children data:', childrenData);
      
      if (childrenData.success) {
        const childrenList = childrenData.data || [];
        setChildren(childrenList);
        setStats(prev => ({
          ...prev,
          totalChildren: childrenList.length
        }));
        console.log(` Loaded ${childrenList.length} children`);
      } else {
        console.error('Failed to load children:', childrenData.error);
        // Try fallback using students endpoint
        await fetchChildrenFallback();
      }

      // 2. Get notifications
      try {
        const notifRes = await fetch(`${API_BASE}/parent/notifications`, { headers });
        const notifData = await notifRes.json();
        
        if (notifData.success) {
          const unread = notifData.data?.filter(n => !n.is_read).length || 0;
          setStats(prev => ({
            ...prev,
            notifications: unread
          }));
        }
      } catch (e) {
        console.warn('Could not fetch notifications:', e);
      }

      // 3. Get stats
      try {
        const statsRes = await fetch(`${API_BASE}/parent/stats`, { headers });
        const statsData = await statsRes.json();
        
        if (statsData.success) {
          setStats(prev => ({
            ...prev,
            avgPerformance: statsData.data?.average_performance || 0,
            attendanceRate: statsData.data?.attendance_rate || 0
          }));
        }
      } catch (e) {
        console.warn('Could not fetch stats:', e);
      }

    } catch (error) {
      console.error(' Error fetching parent data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  // Fallback: Try to get children using direct database query
  const fetchChildrenFallback = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Try to get user email from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const email = userData.email || user?.email;
      
      if (email) {
        console.log('Fallback: Fetching children by parent email:', email);
        const response = await fetch(`${API_BASE}/students/parent/${encodeURIComponent(email)}`, { headers });
        const data = await response.json();
        
        if (data.success && data.data?.length > 0) {
          setChildren(data.data);
          setStats(prev => ({
            ...prev,
            totalChildren: data.data.length
          }));
          console.log(`✅ Fallback: Loaded ${data.data.length} children`);
        }
      }
    } catch (error) {
      console.error('Fallback failed:', error);
    }
  };

  const getInitials = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    if (user?.first_name) return user.first_name.charAt(0).toUpperCase();
    if (user?.last_name) return user.last_name.charAt(0).toUpperCase();
    if (user?.email) return user.email.charAt(0).toUpperCase();
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

  // ==== MODIFIED: Removed "Messages" from menuItems ====
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
      </div>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faChildren} />
          </div>
          <div className="stat-info">
            <h3>{stats.totalChildren}</h3>
            <p>My Children</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faChartLine} />
          </div>
          <div className="stat-info">
            <h3>{stats.avgPerformance}%</h3>
            <p>Avg Performance</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <div className="stat-info">
            <h3>{stats.attendanceRate}%</h3>
            <p>Attendance Rate</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <FontAwesomeIcon icon={faBell} />
          </div>
          <div className="stat-info">
            <h3>{stats.notifications}</h3>
            <p>Notifications</p>
          </div>
        </div>
      </div>

      <div className="dashboard-two-columns">
        <div className="quick-actions-section">
          <div className="section-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions-grid">
            <button className="action-btn primary" onClick={() => navigate('/parent/performance')}>
              <FontAwesomeIcon icon={faChartLine} /> View Performance
            </button>
            <button className="action-btn primary" onClick={() => navigate('/parent/attendance')}>
              <FontAwesomeIcon icon={faCalendarAlt} /> Check Attendance
            </button>
            <button className="action-btn secondary" onClick={() => navigate('/parent/fees')}>
              <FontAwesomeIcon icon={faMoneyBillWave} /> Fee Status
            </button>
            {/* ==== REMOVED: Send Message button ==== */}
          </div>
        </div>
        
        <div className="notifications-section">
          <div className="section-header">
            <h3>Recent Notifications</h3>
          </div>
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
            <div className="loading-children">
              <FontAwesomeIcon icon={faSpinner} spin /> Loading children...
            </div>
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
                    <span className="child-initials">
                      {child.first_name?.[0]}{child.last_name?.[0]}
                    </span>
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
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="parent-dashboard loading-state">Loading dashboard...</div>;
  }

  return (
    <div className="parent-dashboard">
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        <FontAwesomeIcon icon={faBars} />
      </button>

      <aside className={`parent-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            {logoExists ? (
              <img src={geebzLogo} alt="Geebz SMS Logo" className="logo-image" />
            ) : (
              <FontAwesomeIcon icon={faSchool} />
            )}
            {!sidebarCollapsed && <span>Parent Portal</span>}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>

        <div className="parent-profile-card">
          <div className="parent-avatar">
            {profilePicUrl ? (
              <img src={profilePicUrl} alt="Profile" className="parent-avatar-img" />
            ) : (
              <span className="parent-avatar-initials">{getInitials()}</span>
            )}
          </div>
          {!sidebarCollapsed && (
            <div className="parent-info">
              <h4>{user?.first_name} {user?.last_name}</h4>
              <p>Parent</p>
            </div>
          )}
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
              {!sidebarCollapsed && <span>{item.name}</span>}
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
              <label htmlFor="parent-avatar-upload" className="user-avatar-circle" title="Click to upload profile picture">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="Profile" className="user-avatar-image" />
                ) : (
                  <span className="user-avatar-initials">{getInitials()}</span>
                )}
              </label>
              <div className="user-info-text">
                <div className="user-name" onClick={() => navigate('/parent/settings')}>
                  {user?.first_name} {user?.last_name}
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
              <FontAwesomeIcon icon={faClock} />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </header>

        <div className="content-area">
          <Routes>
            <Route path="/" element={renderDashboardContent()} />
            <Route path="/performance" element={<ParentPerformance API_BASE={API_BASE} children={children} />} />
            <Route path="/attendance" element={<ParentAttendance API_BASE={API_BASE} children={children} />} />
            <Route path="/fees" element={<ParentFees API_BASE={API_BASE} children={children} />} />
             
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default ParentDashboard;