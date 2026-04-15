import React, { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ API_BASE }) => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalFeesCollected: 0,
    attendanceRate: 0,
    paymentRate: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, feesRes] = await Promise.all([
        fetch(`${API_BASE}/students`).then(r => r.json()),
        fetch(`${API_BASE}/teachers`).then(r => r.json()),
        fetch(`${API_BASE}/classes`).then(r => r.json()),
        fetch(`${API_BASE}/fees/school-summary?academic_year=2024-2025`).then(r => r.json())
      ]);

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalClasses: classesRes.count || 0,
        totalFeesCollected: feesRes.data?.summary?.collected || 0,
        paymentRate: feesRes.data?.summary?.expected > 0 
          ? ((feesRes.data.summary.collected / feesRes.data.summary.expected) * 100).toFixed(1) 
          : 0,
        attendanceRate: 92.5 // This would come from attendance API
      });

      // Sample recent activities (would come from API)
      setRecentActivities([
        { id: 1, action: 'New student enrolled', user: 'Admin', time: '2 minutes ago', icon: '👨‍🎓' },
        { id: 2, action: 'Fee payment recorded', user: 'Accountant', time: '1 hour ago', icon: '💰' },
        { id: 3, action: 'Grades entered for P5A', user: 'Teacher Kwame', time: '3 hours ago', icon: '📊' },
        { id: 4, action: 'Attendance marked for JHS2A', user: 'Teacher Ama', time: '5 hours ago', icon: '📅' }
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's what's happening in your school today.</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ borderLeftColor: '#76B900' }}>
          <div className="stat-icon">👨‍🎓</div>
          <div className="stat-info">
            <h3>{stats.totalStudents}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#2196F3' }}>
          <div className="stat-icon">👨‍🏫</div>
          <div className="stat-info">
            <h3>{stats.totalTeachers}</h3>
            <p>Total Teachers</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#FF9800' }}>
          <div className="stat-icon">📚</div>
          <div className="stat-info">
            <h3>{stats.totalClasses}</h3>
            <p>Total Classes</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: '#4CAF50' }}>
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>₵{stats.totalFeesCollected.toLocaleString()}</h3>
            <p>Fees Collected</p>
          </div>
        </div>
      </div>

      {/* Progress Cards */}
      <div className="progress-grid">
        <div className="progress-card">
          <div className="progress-header">
            <span>Attendance Rate</span>
            <span className="progress-value">{stats.attendanceRate}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stats.attendanceRate}%`, background: '#76B900' }}></div>
          </div>
        </div>
        <div className="progress-card">
          <div className="progress-header">
            <span>Payment Collection</span>
            <span className="progress-value">{stats.paymentRate}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${stats.paymentRate}%`, background: '#2196F3' }}></div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="recent-activities">
        <h2>Recent Activities</h2>
        <div className="activities-list">
          {recentActivities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-details">
                <div className="activity-action">{activity.action}</div>
                <div className="activity-meta">
                  <span>by {activity.user}</span>
                  <span>•</span>
                  <span>{activity.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;