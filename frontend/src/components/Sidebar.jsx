import React from 'react';
import './Sidebar.css';

const Sidebar = ({ currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊', color: '#76B900' },
    { id: 'students', name: 'Students', icon: '👨‍🎓', color: '#2196F3' },
    { id: 'teachers', name: 'Teachers', icon: '👨‍🏫', color: '#FF9800' },
    { id: 'classes', name: 'Classes', icon: '📚', color: '#9C27B0' },
    { id: 'attendance', name: 'Attendance', icon: '📅', color: '#00BCD4' },
    { id: 'grades', name: 'Grades', icon: '📊', color: '#4CAF50' },
    { id: 'fees', name: 'Fees', icon: '💰', color: '#E91E63' },
    { id: 'library', name: 'Library', icon: '📖', color: '#607D8B' },
    { id: 'transport', name: 'Transport', icon: '🚌', color: '#FF5722' },
    { id: 'inventory', name: 'Inventory', icon: '📦', color: '#795548' },
    { id: 'reports', name: 'Reports', icon: '📈', color: '#3F51B5' },
    { id: 'settings', name: 'Settings', icon: '⚙️', color: '#9E9E9E' }
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-icon">🏫</span>
          <span className="logo-text">SchoolMS</span>
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
            style={{ '--hover-color': item.color }}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-text">{item.name}</span>
            {currentPage === item.id && <span className="nav-indicator" style={{ background: item.color }}></span>}
          </button>
        ))}
      </nav>
      
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">A</div>
          <div className="user-details">
            <span className="user-name">Admin User</span>
            <span className="user-role">Administrator</span>
          </div>
        </div>
        <button className="logout-btn" onClick={() => alert('Logout functionality coming soon!')}>
          <span className="logout-icon">🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;