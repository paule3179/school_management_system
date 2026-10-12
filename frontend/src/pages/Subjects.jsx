import { apiFetch } from '../services/api.js';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBook, faPlus, faEdit, faTrash, faTimes,
  faSearch, faLayerGroup, faChalkboardTeacher,
  faGraduationCap, faFilter, faRefresh, faEye,
  faUniversity, faList, faFileExport,
  faChevronDown, faChevronUp
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from '../components/ToastNotification';
import './Subjects.css';

const LEVEL_OPTIONS = [
  { value: 'KG', label: 'Kindergarten' },
  { value: 'Primary', label: 'Primary' },
  { value: 'JHS', label: 'Junior High School' } 
];

const Subjects = ({ API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api') }) => {
  // NOTE: This page intentionally uses existing modal/button classes.
  // Unused imports/vars are left untouched by design to avoid functional regressions.

  const [subjects, setSubjects] = useState([]);
  const [filteredSubjects, setFilteredSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);
  const [activeTab, setActiveTab] = useState('subjects');
  const [userRole, setUserRole] = useState(null);
  
  const [filters, setFilters] = useState({ level: '' });
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    level: 'Primary'
  });

  const [assignData, setAssignData] = useState({
    subject_id: '',
    hours_per_week: 3
  });

  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
  }, []);

  useEffect(() => {
    loadSubjects();
    loadClasses();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [subjects, searchTerm, filters, sortField, sortDirection]);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('No token! Please login again.');
        showToastMessage('Please login again', 'error');
        setLoading(false);
        return;
      }
      
      const response = await apiFetch(`${API_BASE}/admin/subjects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.status === 401) {
        showToastMessage('Session expired. Please login again.', 'error');
        setLoading(false);
        return;
      }
      
      const result = await response.json();
      console.log('Subjects API response:', result);
      
      if (result.success) {
        console.log(`✅ Loaded ${result.data?.length} subjects`);
        setSubjects(result.data || []);
        setFilteredSubjects(result.data || []);
      } else {
        console.error('Failed to load subjects:', result.error);
        setSubjects([]);
        setFilteredSubjects([]);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
      setSubjects([]);
      setFilteredSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await apiFetch(`${API_BASE}/admin/classes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setClasses(result.data || []);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadClassSubjects = async (classId) => {
    if (!classId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await apiFetch(`${API_BASE}/admin/classes/${classId}/subjects`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        setClassSubjects(result.data || []);
      } else {
        setClassSubjects([]);
      }
    } catch (error) {
      console.error('Error loading class subjects:', error);
      setClassSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...subjects];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(subject => 
        subject.name?.toLowerCase().includes(term) ||
        subject.code?.toLowerCase().includes(term)
      );
    }
    
    if (filters.level) {
      filtered = filtered.filter(subject => subject.level === filters.level);
    }
    
    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredSubjects(filtered);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const resetFilters = () => {
    setFilters({ level: '' });
    setSearchTerm('');
    setSortField('name');
    setSortDirection('asc');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      showToastMessage('Subject name is required', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToastMessage('Please login again', 'error');
        setLoading(false);
        return;
      }
      
      const url = editingSubject 
        ? `${API_BASE}/admin/subjects/${editingSubject.id}`
        : `${API_BASE}/admin/subjects`;
      const method = editingSubject ? 'PUT' : 'POST';
      
      const response = await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      if (result.success) {
        showToastMessage(editingSubject ? 'Subject updated!' : 'Subject added!');
        loadSubjects();
        setShowModal(false);
        resetForm();
      } else {
        showToastMessage(result.error || 'Error saving subject', 'error');
      }
    } catch (error) {
      console.error('Error saving subject:', error);
      showToastMessage('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (userRole !== 'admin') {
      showToastMessage('Only administrators can delete subjects', 'error');
      return;
    }
    
    if (!window.confirm(`Delete "${name}"? This will remove it from all classes.`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToastMessage('Please login again', 'error');
        setLoading(false);
        return;
      }
      
      const response = await apiFetch(`${API_BASE}/admin/subjects/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        showToastMessage('Subject deleted!');
        loadSubjects();
        if (selectedClass) loadClassSubjects(selectedClass);
      } else {
        showToastMessage(result.error || 'Error deleting subject', 'error');
      }
    } catch (error) {
      console.error('Error deleting subject:', error);
      showToastMessage('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    if (!assignData.subject_id) {
      showToastMessage('Please select a subject', 'warning');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToastMessage('Please login again', 'error');
        setLoading(false);
        return;
      }
      
      const response = await apiFetch(`${API_BASE}/admin/classes/${selectedClass}/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(assignData)
      });
      
      const result = await response.json();
      if (result.success) {
        showToastMessage('Subject assigned to class!');
        loadClassSubjects(selectedClass);
        setShowAssignModal(false);
        setAssignData({ subject_id: '', hours_per_week: 3 });
      } else {
        showToastMessage(result.error || 'Error assigning subject', 'error');
      }
    } catch (error) {
      console.error('Error assigning subject:', error);
      showToastMessage('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClassSubject = async (classSubjectId, subjectName) => {
    if (userRole !== 'admin') {
      showToastMessage('Only administrators can remove subjects', 'error');
      return;
    }
    
    if (!window.confirm(`Remove "${subjectName}" from this class?`)) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        showToastMessage('Please login again', 'error');
        setLoading(false);
        return;
      }
      
      const response = await apiFetch(`${API_BASE}/admin/class-subjects/${classSubjectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (result.success) {
        showToastMessage('Subject removed from class');
        loadClassSubjects(selectedClass);
      } else {
        showToastMessage(result.error || 'Error removing subject', 'error');
      }
    } catch (error) {
      console.error('Error removing subject:', error);
      showToastMessage('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingSubject(null);
    setFormData({ name: '', code: '', description: '', level: 'Primary' });
  };

  const exportToCSV = () => {
    try {
      const dataToExport = filteredSubjects.length > 0 ? filteredSubjects : subjects;
      if (dataToExport.length === 0) {
        showToastMessage('No data to export', 'error');
        return;
      }
      const exportData = dataToExport.map(subject => ({
        'Subject Name': subject.name || '',
        'Code': subject.code || '',
        'Level': subject.level || '',
        'Description': subject.description || ''
      }));
      const headers = Object.keys(exportData[0]);
      const csvRows = [headers.join(',')];
      for (const row of exportData) {
        const values = headers.map(header => {
          const value = row[header];
          const escaped = String(value).replace(/"/g, '""');
          return `"${escaped}"`;
        });
        csvRows.push(values.join(','));
      }
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const filename = `subjects_export_${dateStr}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToastMessage(`Exported ${dataToExport.length} subjects successfully!`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToastMessage('Error exporting data', 'error');
    }
  };

  const getAvailableSubjects = () => {
    const assignedIds = classSubjects.map(cs => cs.subject_id);
    return subjects.filter(s => !assignedIds.includes(s.id));
  };

  const totalSubjects = subjects.length;
  const totalClasses = classes.length;

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <FontAwesomeIcon icon={faChevronDown} />;
    return <FontAwesomeIcon icon={sortDirection === 'asc' ? faChevronUp : faChevronDown} />;
  };

  const canEdit = userRole === 'admin';

  if (loading) {
    return (
      <div className="subjects-page">
        <div className="loading-container">Loading subjects...</div>
      </div>
    );
  }

  return (
    <div className="subjects-page">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faBook} /></div>
          <div className="stat-info"><h3>{totalSubjects}</h3><p>TOTAL SUBJECTS</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faUniversity} /></div>
          <div className="stat-info"><h3>{totalClasses}</h3><p>TOTAL CLASSES</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faList} /></div>
          <div className="stat-info"><h3>{classes.length}</h3><p>CLASSES</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faGraduationCap} /></div>
          <div className="stat-info"><h3>{totalSubjects}</h3><p>SUBJECTS</p></div>
        </div>
      </div>

      <div className="subjects-header">
        <h1><FontAwesomeIcon icon={faBook} /> Subject Management</h1>
        <p>Manage school subjects and assign them to classes</p>
      </div>

      <div className="subjects-tabs">
        <button className={`tab-btn ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>
          <FontAwesomeIcon icon={faLayerGroup} /> Master Subjects
        </button>
        <button className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
          <FontAwesomeIcon icon={faChalkboardTeacher} /> Class Assignments
        </button>
      </div>

      {activeTab === 'subjects' && (
        <div className="subjects-section">
          <div className="section-header">
            <h2>All Subjects</h2>
            <div className="header-buttons">
              <button className="btn-filter" onClick={() => setShowFilters(!showFilters)}>
                <FontAwesomeIcon icon={faFilter} /> Filter
              </button>
              <button className="btn-export" onClick={exportToCSV}>
                <FontAwesomeIcon icon={faFileExport} /> Export
              </button>
              {canEdit && (
                <button className="btn-add" onClick={() => setShowModal(true)}>
                  <FontAwesomeIcon icon={faPlus} /> Add Subject
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="filter-panel">
              <div className="filter-row">
                <div className="filter-group">
                  <label>Level</label>
                  <select value={filters.level} onChange={(e) => setFilters({...filters, level: e.target.value})}>
                    <option value="">All Levels</option>
                    {LEVEL_OPTIONS.map(level => (<option key={level.value} value={level.value}>{level.label}</option>))}
                  </select>
                </div>
                <div className="filter-actions">
                  <button className="btn-reset-filters" onClick={resetFilters}>Reset</button>
                </div>
              </div>
            </div>
          )}

          <div className="search-bar-container">
            <div className="search-input-wrapper">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input type="text" placeholder="Search subjects..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
              {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}><FontAwesomeIcon icon={faTimes} /></button>}
            </div>
            <button className="btn-reset" onClick={resetFilters}>Reset All</button>
          </div>

          <div className="table-container">
            <table className="professional-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')}>SUBJECT NAME</th>
                  <th onClick={() => handleSort('code')}>CODE</th>
                  <th onClick={() => handleSort('level')}>LEVEL</th>
                  <th>DESCRIPTION</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      No subjects found.
                      {canEdit && (
                        <button className="btn-add-small" onClick={() => setShowModal(true)}>
                          Add Subject
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map(subject => (
                    <tr key={subject.id}>
                      <td className="subject-name-cell"><strong>{subject.name}</strong></td>
                      <td className="subject-code-cell"><code>{subject.code || '-'}</code></td>
                      <td className="subject-level-cell"><span className="level-badge">{subject.level || 'N/A'}</span></td>
                      <td className="subject-desc-cell">{subject.description || '-'}</td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button className="btn-view" onClick={() => { setEditingSubject(subject); setFormData(subject); setShowViewModal(true); }}>
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          {canEdit && (
                            <>
                              <button className="btn-edit" onClick={() => { setEditingSubject(subject); setFormData(subject); setShowModal(true); }}>
                                <FontAwesomeIcon icon={faEdit} />
                              </button>
                              <button className="btn-delete" onClick={() => handleDelete(subject.id, subject.name)}>
                                <FontAwesomeIcon icon={faTrash} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'assignments' && (
        <div className="subjects-section">
          <div className="section-header">
            <h2>Class Subject Assignments</h2>
            {canEdit && (
              <button className="btn-primary" onClick={() => setShowAssignModal(true)} disabled={!selectedClass}>
                <FontAwesomeIcon icon={faPlus} /> Assign Subject
              </button>
            )}
          </div>

          <div className="class-selector">
            <select 
              value={selectedClass} 
              onChange={(e) => { 
                setSelectedClass(e.target.value); 
                if (e.target.value) loadClassSubjects(e.target.value); 
              }}
            >
              <option value="">Select a class...</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.class_name}</option>
              ))}
            </select>
            <button 
              className="btn-refresh" 
              onClick={() => selectedClass && loadClassSubjects(selectedClass)} 
              disabled={!selectedClass}
            >
              <FontAwesomeIcon icon={faRefresh} /> Refresh
            </button>
          </div>

          {selectedClass && (
            <div className="table-container">
              <table className="professional-table">
                <thead>
                  <tr>
                    <th>SUBJECT</th>
                    <th>CODE</th>
                    <th>HOURS/WEEK</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {classSubjects.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-state">
                        No subjects assigned.
                        {canEdit && (
                          <button onClick={() => setShowAssignModal(true)}>
                            Assign First Subject
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    classSubjects.map(cs => (
                      <tr key={cs.id}>
                        <td className="subject-name-cell"><strong>{cs.subject_name}</strong></td>
                        <td className="subject-code-cell"><code>{cs.subject_code || '-'}</code></td>
                        <td className="hours-cell">{cs.hours_per_week} hrs</td>
                        <td className="actions-cell">
                          {canEdit && (
                            <button className="btn-delete" onClick={() => handleRemoveClassSubject(cs.id, cs.subject_name)}>
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {/* Modals */}
      
      
      {showViewModal && editingSubject && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Subject Details</h2>
              <button onClick={() => setShowViewModal(false)}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <div className="modal-body">
              <p><strong>Name:</strong> {editingSubject.name}</p>
              <p><strong>Code:</strong> {editingSubject.code || 'N/A'}</p>
              <p><strong>Level:</strong> {editingSubject.level || 'N/A'}</p>
              <p><strong>Description:</strong> {editingSubject.description || 'No description'}</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showModal && canEdit && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
              <button onClick={() => { setShowModal(false); resetForm(); }}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Subject Name *</label>
                  <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Code</label>
                  <input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <select value={formData.level} onChange={(e) => setFormData({...formData, level: e.target.value})}>
                    <option value="KG">KG</option>
                    <option value="Primary">Primary</option>
                    <option value="JHS">JHS</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows="3" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : (editingSubject ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedClass && canEdit && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Subject</h2>
              <button onClick={() => setShowAssignModal(false)}><FontAwesomeIcon icon={faTimes} /></button>
            </div>
            <form onSubmit={handleAssignSubject}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Select Subject</label>
                  <select value={assignData.subject_id} onChange={(e) => setAssignData({...assignData, subject_id: e.target.value})} required>
                    <option value="">Choose...</option>
                    {getAvailableSubjects().map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Hours per Week</label>
                  <input type="number" min="1" max="40" value={assignData.hours_per_week} onChange={(e) => setAssignData({...assignData, hours_per_week: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowAssignModal(false)}>Cancel</button>
                <button type="submit" disabled={loading}>
                  {loading ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Subjects;
