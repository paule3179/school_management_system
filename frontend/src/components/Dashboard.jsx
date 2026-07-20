import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserGraduate, 
  faChalkboardUser, 
  faBookOpen, 
  faBolt,
  faUserPlus,
  faCheckCircle,
  faChartLine,
  faReceipt,
  faCalendarAlt,
  faHistory,
  faClock,
  faTimes,
  faUserCircle,
  faSignOutAlt,
  faCalendarDay,
  faTrophy,
  faChildren
} from '@fortawesome/free-solid-svg-icons';
import './Dashboard.css';

const Dashboard = ({ API_BASE, currentUser, onUpdateUser, onNavigate }) => {
  const navigate = useNavigate();
  
  // Mobile sidebar state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  // Settings modal state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Dashboard data states
  const [attendanceSummary, setAttendanceSummary] = useState({
    today: { present: 0, absent: 0, late: 0, percentage: 0, total: 0 },
    weekly: { present: 0, absent: 0, percentage: 0 }
  });
  
  const [performanceRate, setPerformanceRate] = useState({
    average: 76.5,
    topSubject: 'Mathematics',
    improvement: 5.2,
    performance: 'Good'
  });
  
  // User profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    date_of_birth: '',
    username: '',
    role: ''
  });
  
  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  
  // Preferences state
  const [preferences, setPreferences] = useState({
    notifications: true,
    emailAlerts: true,
    darkMode: false,
    language: 'english',
    dateFormat: 'DD/MM/YYYY'
  });

  // Stats state - role-based
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalChildren: 0
  });

  // Recent activity state
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load user data when modal opens
  useEffect(() => {
    if (isSettingsOpen && currentUser) {
      setProfileForm({
        first_name: currentUser.first_name || '',
        last_name: currentUser.last_name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        address: currentUser.address || '',
        date_of_birth: currentUser.date_of_birth || '',
        username: currentUser.username || currentUser.email?.split('@')[0] || '',
        role: currentUser.role || 'admin'
      });
    }
  }, [isSettingsOpen, currentUser]);

  // Fetch dashboard data for stat cards
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          console.log('No token found, skipping dashboard fetch');
          setLoading(false);
          return;
        }

        const userRole = currentUser?.role;
        console.log(`Fetching stats for role: ${userRole} from: ${API_BASE}/admin/stats`);
        
        const statsRes = await fetch(`${API_BASE}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log('Stats response status:', statsRes.status);
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          console.log('Stats data received:', statsData);
          
          if (statsData?.success) {
            const data = statsData.data;
            
            // Role-based stats mapping
            if (userRole === 'admin') {
              setStats({
                totalStudents: data.total_students ?? 0,
                totalTeachers: data.total_teachers ?? 0,
                totalClasses: data.total_classes ?? 0,
                totalChildren: 0
              });
            } 
            else if (userRole === 'teacher') {
              setStats({
                totalStudents: data.total_students ?? 0,
                totalClasses: data.total_classes ?? 0,
                totalTeachers: 0,
                totalChildren: 0
              });
            }
            else if (userRole === 'parent') {
              setStats({
                totalChildren: data.total_children ?? 0,
                totalStudents: 0,
                totalTeachers: 0,
                totalClasses: 0
              });
            }
            
            if (data.attendance_rate !== undefined) {
              setAttendanceSummary(prev => ({
                ...prev,
                today: {
                  ...prev.today,
                  percentage: data.attendance_rate,
                  total: data.total_students || 0
                }
              }));
            }
          }
        } else {
          console.error('Failed to fetch stats, status:', statsRes.status);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [API_BASE, currentUser?.role]);

  // Fetch recent activities (admin only)
  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        // Only fetch for admin
        if (currentUser?.role !== 'admin') return;
        
        const res = await fetch(`${API_BASE}/admin/user-activity?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const json = await res.json();
          if (json?.success && json?.data) {
            const mapped = json.data.map((r, idx) => ({
              id: r.id ?? idx,
              action: r.action || 'User activity',
              type: r.user_role || 'User',
              time: timeAgo(r.login_time),
              icon: activityIconByAction(r.action),
            }));
            setRecentActivities(mapped);
          }
        }
      } catch (e) {
        console.error('Error loading recent activities:', e);
      }
    };

    fetchActivities();
  }, [API_BASE, currentUser?.role]);

  // Helper function for time ago
  const timeAgo = (dateLike) => {
    if (!dateLike) return '';
    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return '';
    const diffMs = Date.now() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    if (diffM < 1) return 'just now';
    if (diffM < 60) return `${diffM} minute${diffM === 1 ? '' : 's'} ago`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `${diffH} hour${diffH === 1 ? '' : 's'} ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD} day${diffD === 1 ? '' : 's'} ago`;
  };

  // Helper function for activity icons
  const activityIconByAction = (action) => {
    const a = String(action || '').toLowerCase();
    if (a.includes('login')) return faUserCircle;
    if (a.includes('logout')) return faSignOutAlt;
    if (a.includes('attendance')) return faCheckCircle;
    if (a.includes('fee')) return faReceipt;
    if (a.includes('student')) return faUserPlus;
    if (a.includes('teacher')) return faChalkboardUser;
    return faHistory;
  };

  // Navigation handler
  const handleNavigate = (pageId) => {
    if (onNavigate) {
      onNavigate(pageId);
    } else {
      const role = currentUser?.role || 'admin';
      const targetPath = `/${role}/${pageId}`;
      console.log(`Navigating to: ${targetPath}`);
      navigate(targetPath);
    }
  };

  // Settings handlers
  const openSettings = () => {
    setIsSettingsOpen(true);
    setSaveSuccess(false);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveProfile = () => {
    if (onUpdateUser) {
      onUpdateUser(profileForm);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleChangePassword = () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      alert("New passwords don't match!");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      alert("Password must be at least 6 characters!");
      return;
    }
    alert("Password changed successfully!");
    setPasswordForm({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  const handleSavePreferences = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Role-based quick actions
  const getQuickActions = () => {
    const role = currentUser?.role;
    
    if (role === 'admin') {
      return [
        { id: 'students', title: 'Manage Students', desc: 'Add, edit, or remove students', icon: faUserPlus, color: '#4361ee' },
        { id: 'teachers', title: 'Manage Teachers', desc: 'Add, edit, or remove teachers', icon: faChalkboardUser, color: '#06d6a0' },
        { id: 'classes', title: 'Manage Classes', desc: 'Create and manage classes', icon: faBookOpen, color: '#ffd166' },
        { id: 'subjects', title: 'Manage Subjects', desc: 'Create and organize subjects', icon: faBookOpen, color: '#4cc9f0' },
        { id: 'fees', title: 'Manage Fees', desc: 'Update fee schedules and status', icon: faReceipt, color: '#06d6a0' },
        { id: 'timetable', title: 'Timetable', desc: 'Manage schedules', icon: faCalendarAlt, color: '#4cc9f0' },
      ];
    }
    
    if (role === 'teacher') {
      return [
        { id: 'attendance', title: 'Mark Attendance', desc: 'Record daily attendance', icon: faCheckCircle, color: '#06d6a0' },
        { id: 'grades', title: 'Enter Grades', desc: 'Record student grades', icon: faChartLine, color: '#ffd166' },
        { id: 'classes', title: 'My Classes', desc: 'View your classes', icon: faBookOpen, color: '#ffd166' },
      ];
    }
    
    if (role === 'parent') {
      return [
        { id: 'attendance', title: "Children's Attendance", desc: 'Monitor attendance', icon: faCalendarDay, color: '#10b981' },
        { id: 'grades', title: "Children's Grades", desc: 'Monitor grades', icon: faChartLine, color: '#ffd166' },
      ];
    }
    
    return [
      { id: 'students', title: 'Manage Students', desc: 'Add, edit, or remove students', icon: faUserPlus, color: '#4361ee' },
      { id: 'teachers', title: 'Manage Teachers', desc: 'Add, edit, or remove teachers', icon: faChalkboardUser, color: '#06d6a0' },
      { id: 'classes', title: 'Manage Classes', desc: 'Create and manage classes', icon: faBookOpen, color: '#ffd166' },
    ];
  };

  // Role-based stat cards
  const getStatCards = () => {
    const role = currentUser?.role;
    
    if (role === 'admin') {
      return [
        {
          id: 'students',
          label: 'TOTAL STUDENTS',
          value: stats.totalStudents,
          icon: faUserGraduate,
          color: '#4361ee',
          bgColor: '#eef2ff',
          clickable: true
        },
        {
          id: 'teachers',
          label: 'TOTAL TEACHERS',
          value: stats.totalTeachers,
          icon: faChalkboardUser,
          color: '#06d6a0',
          bgColor: '#e6faf5',
          clickable: true
        },
        {
          id: 'classes',
          label: 'TOTAL CLASSES',
          value: stats.totalClasses,
          icon: faBookOpen,
          color: '#ffd166',
          bgColor: '#fff8e7',
          clickable: true
        },
        {
          id: 'performance',
          label: 'AVG PERFORMANCE',
          value: `${performanceRate.average}%`,
          subtitle: `${performanceRate.performance} | Top: ${performanceRate.topSubject}`,
          icon: faTrophy,
          color: '#f59e0b',
          bgColor: '#fef3c7',
          clickable: false
        },
      ];
    }
    
    if (role === 'teacher') {
      return [
        {
          id: 'students',
          label: 'MY STUDENTS',
          value: stats.totalStudents,
          icon: faUserGraduate,
          color: '#4361ee',
          bgColor: '#eef2ff',
          clickable: true
        },
        {
          id: 'classes',
          label: 'MY CLASSES',
          value: stats.totalClasses,
          icon: faBookOpen,
          color: '#ffd166',
          bgColor: '#fff8e7',
          clickable: true
        },
        {
          id: 'performance',
          label: 'AVG PERFORMANCE',
          value: `${performanceRate.average}%`,
          subtitle: `${performanceRate.performance}`,
          icon: faTrophy,
          color: '#f59e0b',
          bgColor: '#fef3c7',
          clickable: false
        },
      ];
    }
    
    if (role === 'parent') {
      return [
        {
          id: 'children',
          label: 'MY CHILDREN',
          value: stats.totalChildren,
          icon: faChildren,
          color: '#4361ee',
          bgColor: '#eef2ff',
          clickable: false
        },
        {
          id: 'attendance',
          label: 'ATTENDANCE',
          value: `${attendanceSummary.today.percentage}%`,
          icon: faCalendarDay,
          color: '#10b981',
          bgColor: '#e6faf5',
          clickable: true
        },
        {
          id: 'performance',
          label: 'AVG PERFORMANCE',
          value: `${performanceRate.average}%`,
          subtitle: `Top: ${performanceRate.topSubject}`,
          icon: faTrophy,
          color: '#f59e0b',
          bgColor: '#fef3c7',
          clickable: false
        },
      ];
    }
    
    return [];
  };

  const quickActions = getQuickActions();
  const statCards = getStatCards();

  if (loading) {
    return (
      <div className="dashboard-container">
        <div style={{ textAlign: 'center', padding: '50px' }}>Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>Dashboard</h1>
          <p>Welcome back, {currentUser?.first_name || currentUser?.username || 'Admin'}!</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        {statCards.map(stat => (
          <div 
            key={stat.id} 
            className="stat-card"
            onClick={() => {
              if (stat.clickable) {
                handleNavigate(stat.id);
              }
            }}
            style={{ cursor: stat.clickable ? 'pointer' : 'default' }}
          >
            <div className="stat-icon" style={{ background: stat.bgColor, color: stat.color }}>
              <FontAwesomeIcon icon={stat.icon} />
            </div>
            <div className="stat-info">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
              {stat.subtitle && <small className="stat-subtitle">{stat.subtitle}</small>}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <div className="section-title">
          <div className="section-title-icon">
            <FontAwesomeIcon icon={faBolt} />
          </div>
          <h2>Quick Actions</h2>
        </div>
        <div className="quick-actions-grid">
          {quickActions.map(action => (
            <div 
              key={action.id}
              className="quick-action-card"
              onClick={() => handleNavigate(action.id)}
            >
              <div className="quick-action-icon" style={{ background: `${action.color}10`, color: action.color }}>
                <FontAwesomeIcon icon={action.icon} />
              </div>
              <div className="quick-action-info">
                <div className="quick-action-title">{action.title}</div>
                <div className="quick-action-desc">{action.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity - Only for Admin */}
      {currentUser?.role === 'admin' && (
        <div className="activity-feed">
          <div className="section-title">
            <div className="section-title-icon">
              <FontAwesomeIcon icon={faHistory} />
            </div>
            <h2>Recent Activity</h2>
          </div>
          <div className="activity-list">
            {recentActivities.slice(0, 6).map(activity => (
              <div key={activity.id} className="activity-item">
                <div className="activity-avatar" style={{ background: '#eef2ff', color: '#4361ee' }}>
                  <FontAwesomeIcon icon={activity.icon} />
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    {activity.action}
                    <span className="activity-badge">{activity.type}</span>
                  </div>
                  <div className="activity-time">
                    <FontAwesomeIcon icon={faClock} />
                    {activity.time}
                  </div>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <div className="activity-empty">No recent activities</div>
            )}
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="settings-modal-overlay" onClick={closeSettings}>
          <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <h2>Profile Settings</h2>
              <button className="settings-modal-close" onClick={closeSettings}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="settings-modal-body">
              {saveSuccess && (
                <div className="settings-success-message">
                  <FontAwesomeIcon icon={faSave} />
                  <span>Changes saved successfully!</span>
                </div>
              )}
              <div className="settings-form-group">
                <label>First Name</label>
                <input type="text" name="first_name" value={profileForm.first_name} onChange={handleProfileChange} />
              </div>
              <div className="settings-form-group">
                <label>Last Name</label>
                <input type="text" name="last_name" value={profileForm.last_name} onChange={handleProfileChange} />
              </div>
              <div className="settings-form-group">
                <label>Email</label>
                <input type="email" name="email" value={profileForm.email} onChange={handleProfileChange} />
              </div>
              <div className="settings-form-group">
                <label>Phone</label>
                <input type="tel" name="phone" value={profileForm.phone} onChange={handleProfileChange} />
              </div>
              <button onClick={handleSaveProfile} className="settings-save-btn">
                <FontAwesomeIcon icon={faSave} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;