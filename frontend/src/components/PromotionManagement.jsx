// src/components/PromotionManagement.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faArrowUp, faList, faHistory, faUsers, 
  faGraduationCap, faBookOpen, faFileExport
} from '@fortawesome/free-solid-svg-icons';

const PromotionManagement = ({ API_BASE, setShowPromotionModal, setSelectedClassForPromotion }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [promotionTab, setPromotionTab] = useState('classes');
  const [promotionHistory, setPromotionHistory] = useState([]);

  const loadClasses = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/classes`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      const classesData = result.data || [];
      
      const classesWithCounts = await Promise.all(
        classesData.map(async (cls) => {
          try {
            const studentsResponse = await fetch(`${API_BASE}/students/class/${cls.id}`, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            const studentsResult = await studentsResponse.json();
            return {
              ...cls,
              current_count: studentsResult.data?.length || 0
            };
          } catch (error) {
            console.error(`Error loading students for class ${cls.id}:`, error);
            return {
              ...cls,
              current_count: 0
            };
          }
        })
      );
      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  const loadPromotionHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/promotion-history`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const result = await response.json();
      if (result.success) {
        setPromotionHistory(result.data || []);
      }
    } catch (error) {
      console.error('Error loading promotion history:', error);
    }
  }, [API_BASE]);

  useEffect(() => {
    loadClasses();
    loadPromotionHistory();
  }, [loadClasses, loadPromotionHistory]);

  const getNextClassName = (currentClassName, level) => {
    if (!currentClassName) return 'Unknown';
    const classNum = parseInt(currentClassName.match(/(\d+)/)?.[1] || 0);
    if (level === 'KG') {
      if (classNum < 2) return 'Primary 1A';
    } else if (level === 'Primary') {
      if (classNum < 6) return `Primary ${classNum + 1}A`;
      return 'GRADUATED';
    } else if (level === 'JHS') {
      if (classNum < 3) return `JHS${classNum + 1}A`;
      return 'GRADUATED';
    }
    return 'GRADUATED';
  };

  const openPromotionModal = (cls) => {
    setSelectedClassForPromotion(cls);
    setShowPromotionModal(true);
  };

  const exportPromotionHistory = () => {
    if (promotionHistory.length === 0) {
      alert('No history to export');
      return;
    }
    const csv = [
      ['Date', 'Student', 'Admission', 'From', 'To', 'Year'],
      ...promotionHistory.map(r => [
        new Date(r.promotion_date).toLocaleDateString(),
        `${r.first_name} ${r.last_name}`,
        r.admission_number,
        r.from_class_name,
        r.to_class_name || 'GRADUATED',
        `${r.from_academic_year} → ${r.to_academic_year}`
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return <div className="loading-container">Loading...</div>;
  }

  return (
    <div className="promotion-management-page">
      {/* Stats Cards - Dashboard style */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#eef2ff', color: '#4361ee' }}>
            <FontAwesomeIcon icon={faBookOpen} />
          </div>
          <div className="stat-info">
            <h3>{classes.filter(c => (c.current_count || 0) > 0).length}</h3>
            <p>Classes with Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e6faf5', color: '#06d6a0' }}>
            <FontAwesomeIcon icon={faUsers} />
          </div>
          <div className="stat-info">
            <h3>{classes.reduce((sum, c) => sum + (c.current_count || 0), 0)}</h3>
            <p>Total Students</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff8e7', color: '#ffd166' }}>
            <FontAwesomeIcon icon={faArrowUp} />
          </div>
          <div className="stat-info">
            <h3>{classes.filter(c => (c.current_count || 0) > 0 && c.level !== 'JHS').length}</h3>
            <p>Ready for Promotion</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}>
            <FontAwesomeIcon icon={faGraduationCap} />
          </div>
          <div className="stat-info">
            <h3>{classes.filter(c => c.name === 'JHS3A' && (c.current_count || 0) > 0).length}</h3>
            <p>Graduating Classes</p>
          </div>
        </div>
      </div>

      {/* Page Header */}
      <div className="page-header">
        <h1><FontAwesomeIcon icon={faGraduationCap} /> Promotion Management</h1>
        <p>Manage student promotions, view history, and track academic progression</p>
      </div>

      {/* Tabs */}
      <div className="promotion-tabs">
        <button className={`tab-btn ${promotionTab === 'classes' ? 'active' : ''}`} onClick={() => setPromotionTab('classes')}>
          <FontAwesomeIcon icon={faList} /> By Class
        </button>
        <button className={`tab-btn ${promotionTab === 'history' ? 'active' : ''}`} onClick={() => setPromotionTab('history')}>
          <FontAwesomeIcon icon={faHistory} /> History
        </button>
      </div>

      {/* By Class Tab */}
      {promotionTab === 'classes' && (
        <div className="promotion-classes-section">
          <div className="section-header">
            <h2>Promote Students by Class</h2>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>CLASS</th>
                  <th>LEVEL</th>
                  <th>STUDENTS</th>
                  <th>NEXT CLASS</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {classes.filter(c => (c.current_count || 0) > 0).map(cls => {
                  const nextClass = getNextClassName(cls.name, cls.level);
                  const isGraduated = nextClass === 'GRADUATED';
                  return (
                    <tr key={cls.id}>
                      <td><strong>{cls.name}</strong></td>
                      <td>{cls.level}</td>
                      <td>{cls.current_count} student(s)</td>
                      <td>{isGraduated ? 'GRADUATED' : nextClass}</td>
                      <td>{isGraduated ? 'Ready to Graduate' : 'Ready for Promotion'}</td>
                      <td>
                        <button 
                          className="btn-promote"
                          onClick={() => openPromotionModal(cls)}
                        >
                          {isGraduated ? 'Graduate' : 'Promote'}
                        </button>
                       </td>
                    </tr>
                  );
                })}
                {classes.filter(c => (c.current_count || 0) > 0).length === 0 && (
                  <tr><td colSpan="6" className="no-data">No classes with students found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* History Tab */}
      {promotionTab === 'history' && (
        <div className="promotion-history-section">
          <div className="section-header">
            <h2><FontAwesomeIcon icon={faHistory} /> Promotion History</h2>
            <button className="btn-export" onClick={exportPromotionHistory}>
              <FontAwesomeIcon icon={faFileExport} /> Export CSV
            </button>
          </div>
          
          {promotionHistory.length === 0 ? (
            <div className="no-data">
              <FontAwesomeIcon icon={faHistory} size="2x" style={{ marginBottom: '12px', color: '#cbd5e1' }} />
              <p>No promotion history found</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Student Name</th>
                    <th>Admission No</th>
                    <th>From Class</th>
                    <th>To Class</th>
                    <th>Academic Year</th>
                  </tr>
                </thead>
                <tbody>
                  {promotionHistory.map(record => (
                    <tr key={record.id}>
                      <td>{new Date(record.promotion_date).toLocaleDateString()}</td>
                      <td><strong>{record.first_name} {record.last_name}</strong></td>
                      <td>{record.admission_number}</td>
                      <td>{record.from_class_name}</td>
                      <td className="to-class">
                        <FontAwesomeIcon icon={faGraduationCap} /> {record.to_class_name || 'GRADUATED'}
                      </td>
                      <td>{record.from_academic_year} → {record.to_academic_year}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromotionManagement;