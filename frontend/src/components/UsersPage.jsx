import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, faUserCheck, faChartLine, faExclamationTriangle, 
  faSync, faSearch, faTimes, faUndo, faEye, faLock, 
  faUnlockAlt, faHistory, faEnvelope, faClock, 
  faUser, faFilter, faEdit, faTrash, faUserTag,
  faClipboardList, faSignInAlt, faList
} from '@fortawesome/free-solid-svg-icons';
import './UsersPage.fixed.css';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [activityTypeFilter, setActivityTypeFilter] = useState('all');
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedUserForActivity, setSelectedUserForActivity] = useState(null);
  const [userActivities, setUserActivities] = useState([]);

  const API_BASE = 'http://localhost:5000/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No authentication token found. Please login again.');
        setLoading(false);
        return;
      }
      
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data || []);
      } else {
        setError(result.error || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllActivities = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/user-activity?limit=200`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setActivities(result.data || []);
      }
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const loadUserActivities = async (userId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/admin/user-activity?userId=${userId}&limit=100`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setUserActivities(result.data || []);
      }
    } catch (error) {
      console.error('Error loading user activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to open activity modal
  const handleViewActivity = async (user) => {
    setSelectedUserForActivity(user);
    await loadUserActivities(user.user_id);
    setShowActivityModal(true);
  };

  const toggleUserStatus = async (userId, userRole, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;
    
    try {
      const response = await fetch(`${API_BASE}/admin/users/${userId}/${userRole}/toggle`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_active: !currentStatus })
      });
      const result = await response.json();
      if (result.success) {
        alert(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        loadUsers();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Error updating user status');
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (activeTab === 'users') {
      if (value.trim() === '') {
        setFilteredUsers([]);
      } else {
        const term = value.toLowerCase().trim();
        const results = users.filter(user => {
          const searchableText = `
            ${user.username || ''} 
            ${user.full_name || ''} 
            ${user.email || ''} 
            ${user.user_role || ''}
          `.toLowerCase();
          return searchableText.includes(term);
        });
        setFilteredUsers(results);
      }
    } else {
      if (value.trim() === '') {
        setFilteredActivities([]);
      } else {
        const term = value.toLowerCase().trim();
        const results = activities.filter(activity => {
          const searchableText = `
            ${activity.username || ''} 
            ${activity.user_role || ''} 
            ${activity.action || ''}
          `.toLowerCase();
          return searchableText.includes(term);
        });
        setFilteredActivities(results);
      }
    }
  };

  const resetSearch = () => {
    setSearchTerm('');
    setActivityTypeFilter('all');
    setFilteredUsers([]);
    setFilteredActivities([]);
  };

  const getActionBadgeClass = (action) => {
    switch(action) {
      case 'login': return 'action-login';
      case 'logout': return 'action-logout';
      case 'failed_login': return 'action-failed';
      default: return '';
    }
  };

  const getActionText = (action) => {
    switch(action) {
      case 'login': return 'Login';
      case 'logout': return 'Logout';
      case 'failed_login': return 'Failed Login';
      default: return action;
    }
  };

  // Calculate stats for the modal
  const loginCount = userActivities.filter(a => a.action === 'login').length;

  useEffect(() => {
    loadUsers();
    loadAllActivities();
  }, []);

  const displayUsers = searchTerm && filteredUsers.length > 0 ? filteredUsers : users;
  const displayActivities = searchTerm && filteredActivities.length > 0 ? filteredActivities : activities;
  
  const filteredActivityData = activityTypeFilter === 'all' 
    ? displayActivities 
    : displayActivities.filter(activity => activity.action === activityTypeFilter);

  const totalUsers = users.length;
  const totalLogins = activities.filter(a => a.action === 'login').length;
  const failedAttempts = activities.filter(a => a.action === 'failed_login').length;
  const activeUsers = users.filter(u => u.is_active).length;

  if (loading && users.length === 0) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="users-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faUsers} /></div>
          <div className="stat-info">
            <h3>{totalUsers}</h3>
            <p>TOTAL USERS</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faUserCheck} /></div>
          <div className="stat-info">
            <h3>{activeUsers}</h3>
            <p>ACTIVE USERS</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faChartLine} /></div>
          <div className="stat-info">
            <h3>{totalLogins}</h3>
            <p>TOTAL LOGINS</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faExclamationTriangle} /></div>
          <div className="stat-info">
            <h3>{failedAttempts}</h3>
            <p>FAILED ATTEMPTS</p>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="users-section">
        <div className="section-header">
          <h2><FontAwesomeIcon icon={faUsers} /> User Management</h2>
        </div>

        {/* Tabs and Refresh in ONE ROW */}
        <div className="tabs-refresh-container">
          <div className="user-tabs">
            <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => { setActiveTab('users'); resetSearch(); }}>
              <FontAwesomeIcon icon={faUsers} /> Users ({users.length})
            </button>
            <button className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`} onClick={() => { setActiveTab('activities'); loadAllActivities(); resetSearch(); }}>
              <FontAwesomeIcon icon={faHistory} /> Activities ({activities.length})
            </button>
          </div>
          <div className="header-buttons">
            <button className="btn-refresh" onClick={() => { loadUsers(); loadAllActivities(); }}>
              <FontAwesomeIcon icon={faSync} /> Refresh
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder={activeTab === 'users' ? "Search by name, email, or role..." : "Search by username, role, or action..."}
              value={searchTerm}
              onChange={handleSearchChange}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search" onClick={resetSearch}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
          <button className="btn-reset" onClick={resetSearch}>
            <FontAwesomeIcon icon={faUndo} /> Reset
          </button>
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className="search-results-info">
            <FontAwesomeIcon icon={faSearch} />
            Showing results for: <strong>"{searchTerm}"</strong>
            <span className="results-count">
              ({activeTab === 'users' ? displayUsers.length : displayActivities.length} result{activeTab === 'users' ? (displayUsers.length !== 1 ? 's' : '') : (displayActivities.length !== 1 ? 's' : '')} found)
            </span>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div className="table-container">
            <table className="professional-table users-table">
              <thead>
                <tr>
                  <th>USER</th>
                  <th>ROLE</th>
                  <th>EMAIL</th>
                  <th>LAST LOGIN</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="empty-state">
                      <div className="empty-icon">
                        <FontAwesomeIcon icon={faUsers} />
                      </div>
                      <p>No users found</p>
                    </td>
                  </tr>
                ) : (
                  displayUsers.map(user => (
                    <tr key={`${user.user_id}-${user.user_role}`}>
                      <td><strong>{user.full_name || user.username}</strong></td>
                      <td><span className={`role-badge role-${user.user_role}`}>{user.user_role}</span></td>
                      <td className="email-cell" title={user.email || '-'}>{user.email || '-'}</td>
                      <td>{formatDateTime(user.last_login)}</td>
                      <td>
                        <span className={`status-badge ${user.is_active ? 'status-active' : 'status-inactive'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-view" onClick={() => handleViewActivity(user)} title="View Activity">
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button className="btn-edit" onClick={() => console.log('Edit user:', user)} title="Edit User">
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          <button className="btn-delete" onClick={() => console.log('Delete user:', user)} title="Delete User">
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                          <button className={`btn-status ${user.is_active ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleUserStatus(user.user_id, user.user_role, user.is_active)} title={user.is_active ? 'Deactivate' : 'Activate'}>
                            <FontAwesomeIcon icon={user.is_active ? faLock : faUnlockAlt} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ACTIVITIES TAB - WITHOUT CIRCLES */}
        {activeTab === 'activities' && (
          <>
            {/* Activity Filter Bar */}
            <div className="activity-filter-bar">
              <div className="filter-label">
                <FontAwesomeIcon icon={faFilter} /> Filter by:
              </div>
              <div className="filter-buttons">
                <button className={`filter-btn ${activityTypeFilter === 'all' ? 'active' : ''}`} onClick={() => setActivityTypeFilter('all')}>
                  All ({displayActivities.length})
                </button>
                <button className={`filter-btn filter-login ${activityTypeFilter === 'login' ? 'active' : ''}`} onClick={() => setActivityTypeFilter('login')}>
                  Logins ({displayActivities.filter(a => a.action === 'login').length})
                </button>
                <button className={`filter-btn filter-logout ${activityTypeFilter === 'logout' ? 'active' : ''}`} onClick={() => setActivityTypeFilter('logout')}>
                  Logouts ({displayActivities.filter(a => a.action === 'logout').length})
                </button>
                <button className={`filter-btn filter-failed ${activityTypeFilter === 'failed_login' ? 'active' : ''}`} onClick={() => setActivityTypeFilter('failed_login')}>
                  Failed ({displayActivities.filter(a => a.action === 'failed_login').length})
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="professional-table activities-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>IP Address</th>
                    <th>Device Info</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivityData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="empty-state">
                        <div className="empty-icon">
                          <FontAwesomeIcon icon={faHistory} />
                        </div>
                        <p>No activities found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredActivityData.map((activity, index) => (
                      <tr key={activity.id || index}>
                        <td>{formatDateTime(activity.login_time)}</td>
                        <td style={{ textAlign: 'center' }}>{activity.username || 'Unknown'}</td>
                        <td>
                          <span className="role-badge-mini">{activity.user_role}</span>
                        </td>
                        <td>
                          <span className={`action-badge ${getActionBadgeClass(activity.action)}`}>
                            {getActionText(activity.action)}
                          </span>
                        </td>
                        <td>
                          <code className="ip-address">{activity.ip_address || '-'}</code>
                        </td>
                        <td className="device-cell">{activity.device_info || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ============================================ */}
      {/* PROFESSIONAL ACTIVITY LOG MODAL */}
      {/* ============================================ */}
      {showActivityModal && selectedUserForActivity && (
        <div className="activity-modal-overlay" onClick={() => setShowActivityModal(false)}>
          <div className="activity-modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="activity-modal-header">
              <div className="modal-header-title">
                <h2><FontAwesomeIcon icon={faHistory} /> Activity Log</h2>
                <p>View login history and user activities</p>
              </div>
              <button className="modal-close-btn" onClick={() => setShowActivityModal(false)}>
                ✕
              </button>
            </div>

            {/* User Info Card */}
            <div className="activity-user-card">
              <div className="user-info-row">
                <div>
                  <h3 className="user-name-large">
                    {selectedUserForActivity?.full_name || selectedUserForActivity?.username}
                  </h3>
                  <div className="user-email">
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>{selectedUserForActivity?.email || 'No email'}</span>
                  </div>
                </div>
                <div className="user-meta-grid">
                  <div className="user-meta-item">
                    <FontAwesomeIcon icon={faClock} />
                    <span>Last Login: {formatDateTime(selectedUserForActivity?.last_login)}</span>
                  </div>
                  <div className="user-meta-item">
                    <FontAwesomeIcon icon={faUserTag} />
                    <span>Role: {selectedUserForActivity?.user_role}</span>
                  </div>
                </div>
                <div className="role-badge-modal">{selectedUserForActivity?.user_role}</div>
              </div>
            </div>

            {/* Activity Stats Summary */}
            <div className="activity-stats-modal">
              <div className="stat-summary-card login">
                <div className="stat-icon-circle"><FontAwesomeIcon icon={faSignInAlt} /></div>
                <div className="stat-info">
                  <h4>{loginCount}</h4>
                  <p>Login Activities</p>
                </div>
              </div>
              <div className="stat-summary-card total">
                <div className="stat-icon-circle"><FontAwesomeIcon icon={faList} /></div>
                <div className="stat-info">
                  <h4>{userActivities.length}</h4>
                  <p>Total Activities</p>
                </div>
              </div>
            </div>

            {/* Activity Table */}
            <div className="activity-table-wrapper">
              <table className="activity-log-table">
                <thead>
                  <tr>
                    <th>DATE & TIME</th>
                    <th>ACTION</th>
                    <th>IP ADDRESS</th>
                    <th>DEVICE INFO</th>
                  </tr>
                </thead>
                <tbody>
                  {userActivities.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-activity">
                        <FontAwesomeIcon icon={faClipboardList} />
                        <p>No activity records found</p>
                      </td>
                    </tr>
                  ) : (
                    userActivities.map((activity, index) => (
                      <tr key={index}>
                        <td className="datetime-cell">{formatDateTime(activity.login_time)}</td>
                        <td>
                          <span className={`action-badge-log ${activity.action}`}>
                            {getActionText(activity.action)}
                          </span>
                        </td>
                        <td>
                          <code className="ip-cell">{activity.ip_address || 'N/A'}</code>
                        </td>
                        <td className="device-cell">{activity.device_info || 'Unknown device'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="activity-modal-footer">
              <button className="btn-close-modal" onClick={() => setShowActivityModal(false)}>
                Close
              </button>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;