import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faEdit, faTrash, faSearch, faTimes,
  faFileExport, faBookOpen, faBuilding, faSchool,
  faFilter, faUndo, faEye, faSpinner, faChalkboard,
  faUserTie
} from '@fortawesome/free-solid-svg-icons';

import './Classes.css';

const Classes = ({ API_BASE = 'http://localhost:5000/api' }) => {
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [teachers, setTeachers] = useState([]);
  
  const [filters, setFilters] = useState({
    level: '',
    academic_year: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const [formData, setFormData] = useState({
    class_name: '',
    level: 'Primary',
    capacity: 30,
    room_number: '',
    academic_year: '2024-2025',
    teacher_id: ''
  });

  const showToastMessage = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserRole(user.role);
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToastMessage('Please login again', 'error');
      return;
    }
    loadTeachers();
  }, []);

  useEffect(() => {
    loadClasses();
  }, [teachers.length]);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, classes]);

  const loadTeachers = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/admin/teachers`, {
        method: 'GET',
        headers: headers
      });
      const result = await response.json();
      if (result.success) {
        setTeachers(result.data || []);
        console.log('✅ Teachers loaded:', result.data.length);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/admin/classes`, {
        method: 'GET',
        headers: headers
      });
      const result = await response.json();
      console.log('📚 Classes API Response:', result);
      
      if (result.success) {
        // Map classes with teacher names - USE teacher_first_name and teacher_last_name from API
        const classesWithTeachers = (result.data || []).map(cls => {
          // Check if teacher info exists from the join
          if (cls.teacher_first_name && cls.teacher_last_name) {
            return {
              ...cls,
              teacher_name: `${cls.teacher_first_name} ${cls.teacher_last_name}`,
              teacher_id: cls.teacher_id || null
            };
          }
          
          // Fallback: Find teacher by teacher_id from teachers array
          const teacher = teachers.find(t => t.id === cls.teacher_id);
          return {
            ...cls,
            teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Not Assigned',
            teacher_id: cls.teacher_id || null
          };
        });
        setClasses(classesWithTeachers);
        setFilteredClasses(classesWithTeachers);
        console.log('✅ Classes loaded with teachers:', classesWithTeachers.length);
      } else {
        setClasses([]);
        setFilteredClasses([]);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
      setFilteredClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...classes];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(cls => 
        cls.class_name?.toLowerCase().includes(term) ||
        cls.level?.toLowerCase().includes(term) ||
        cls.teacher_name?.toLowerCase().includes(term) ||
        cls.room_number?.toLowerCase().includes(term)
      );
    }
    
    if (filters.level) {
      filtered = filtered.filter(cls => cls.level === filters.level);
    }
    
    if (filters.academic_year) {
      filtered = filtered.filter(cls => cls.academic_year === filters.academic_year);
    }
    
    setFilteredClasses(filtered);
  };

  const clearFilters = () => {
    setFilters({ level: '', academic_year: '' });
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (userRole !== 'admin') {
      showToastMessage('Only administrators can add or edit classes', 'error');
      setLoading(false);
      return;
    }
    
    try {
      const headers = getAuthHeaders();
      const url = editingClass 
        ? `${API_BASE}/admin/classes/${editingClass.id}`
        : `${API_BASE}/admin/classes`;
      const method = editingClass ? 'PUT' : 'POST';
      
      // Ensure teacher_id is sent as integer or null
      const submitData = {
        ...formData,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        capacity: parseInt(formData.capacity) || 30
      };
      
      console.log(`📤 ${method} request to:`, url);
      console.log('📤 Data:', submitData);
      
      const response = await fetch(url, {
        method,
        headers: headers,
        body: JSON.stringify(submitData)
      });
      
      const result = await response.json();
      console.log('📥 Response:', result);
      
      if (response.ok) {
        // Show teacher assignment notification
        if (submitData.teacher_id) {
          const teacher = teachers.find(t => t.id === submitData.teacher_id);
          if (teacher) {
            showToastMessage(
              `✅ ${teacher.first_name} ${teacher.last_name} assigned to ${submitData.class_name || editingClass?.class_name}!`,
              'success'
            );
          }
        } else {
          showToastMessage(editingClass ? 'Class updated successfully!' : 'Class added successfully!');
        }
        setShowModal(false);
        resetForm();
        // Reload classes after successful operation
        await loadClasses();
      } else {
        showToastMessage(result.error || 'Failed to save class', 'error');
      }
    } catch (error) {
      console.error('Error saving class:', error);
      showToastMessage('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClassDelete = async (id) => {
    if (userRole !== 'admin') {
      showToastMessage('Only administrators can delete classes', 'error');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/admin/classes/${id}`, {
        method: 'DELETE',
        headers: headers
      });
      
      if (response.ok) {
        showToastMessage('Class deleted successfully!');
        await loadClasses();
      } else {
        const result = await response.json();
        showToastMessage(result.error || 'Failed to delete class', 'error');
      }
    } catch (error) {
      showToastMessage('Network error', 'error');
    }
  };

  const handleClassEdit = (cls) => {
    console.log('Editing class:', cls);
    setEditingClass(cls);
    setFormData({
      class_name: cls.class_name || '',
      level: cls.level || 'Primary',
      capacity: cls.capacity || 30,
      room_number: cls.room_number || '',
      academic_year: cls.academic_year || '2024-2025',
      teacher_id: cls.teacher_id || ''
    });
    setShowModal(true);
  };

  const handleClassView = (cls) => {
    setSelectedClass(cls);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setEditingClass(null);
    setFormData({
      class_name: '',
      level: 'Primary',
      capacity: 30,
      room_number: '',
      academic_year: '2024-2025',
      teacher_id: ''
    });
  };

  const exportToCSV = () => {
    try {
      const dataToExport = filteredClasses.length > 0 ? filteredClasses : classes;
      
      if (dataToExport.length === 0) {
        showToastMessage('No data to export', 'error');
        return;
      }

      const exportData = dataToExport.map(cls => ({
        'Class Name': cls.class_name || '',
        'Level': cls.level || '',
        'Teacher': cls.teacher_name || 'Not Assigned',
        'Capacity': cls.capacity || 0,
        'Room Number': cls.room_number || '',
        'Academic Year': cls.academic_year || '2024-2025'
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
      const filename = `classes_export_${dateStr}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToastMessage(`Exported ${dataToExport.length} classes successfully!`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToastMessage('Error exporting data', 'error');
    }
  };

  const displayClasses = filteredClasses.length > 0 ? filteredClasses : classes;
  const totalClasses = classes.length;
  const totalCapacity = classes.reduce((sum, cls) => sum + (parseInt(cls.capacity) || 0), 0);
  const levels = [...new Set(classes.map(c => c.level).filter(Boolean))];
  const academicYears = [...new Set(classes.map(c => c.academic_year).filter(Boolean))];

  const canEdit = userRole === 'admin';

  if (loading && classes.length === 0) {
    return <div className="loading"><FontAwesomeIcon icon={faSpinner} spin /> Loading classes...</div>;
  }

  return (
    <div className="classes-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faBookOpen} /></div>
          <div className="stat-info"><h3>{totalClasses}</h3><p>TOTAL CLASSES</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faBuilding} /></div>
          <div className="stat-info"><h3>{totalCapacity}</h3><p>TOTAL CAPACITY</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faUserTie} /></div>
          <div className="stat-info"><h3>{teachers.length}</h3><p>TOTAL TEACHERS</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faSchool} /></div>
          <div className="stat-info"><h3>{academicYears.length}</h3><p>ACADEMIC YEARS</p></div>
        </div>
      </div>

      {/* Main Section */}
      <div className="classes-section">
        <div className="section-header">
          <h2><FontAwesomeIcon icon={faChalkboard} /> Class Management</h2>
          <div className="header-buttons">
            {canEdit && (
              <button className="btn-add" onClick={() => { resetForm(); setEditingClass(null); setShowModal(true); }}>
                <FontAwesomeIcon icon={faPlus} /> Add Class
              </button>
            )}
            <button className="btn-export" onClick={exportToCSV}>
              <FontAwesomeIcon icon={faFileExport} /> Export
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="search-bar-container">
          <div className="search-input-wrapper">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Search by class name, level, teacher, or room..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button className="clear-search" onClick={() => setSearchTerm('')}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            )}
          </div>
          <button className="btn-filter" onClick={() => setShowFilters(!showFilters)}>
            <FontAwesomeIcon icon={faFilter} /> Filter
          </button>
          <button className="btn-reset" onClick={clearFilters}>
            <FontAwesomeIcon icon={faUndo} /> Reset
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filter-panel">
            <div className="filter-row">
              <div className="filter-group">
                <label>Level</label>
                <select value={filters.level} onChange={(e) => setFilters({...filters, level: e.target.value})}>
                  <option value="">All Levels</option>
                  {levels.map(level => <option key={level} value={level}>{level}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Academic Year</label>
                <select value={filters.academic_year} onChange={(e) => setFilters({...filters, academic_year: e.target.value})}>
                  <option value="">All Years</option>
                  {academicYears.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Classes Table */}
        <div className="table-container">
          <table className="professional-table">
            <thead>
              <tr>
                <th>CLASS NAME</th>
                <th>LEVEL</th>
                <th>TEACHER</th>
                <th>CAPACITY</th>
                <th>ROOM NUMBER</th>
                <th>ACADEMIC YEAR</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayClasses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-state">
                    <div className="empty-icon"></div>
                    <p>No classes found</p>
                    {canEdit && (
                      <button className="btn-add-small" onClick={() => { resetForm(); setEditingClass(null); setShowModal(true); }}>
                        <FontAwesomeIcon icon={faPlus} /> Add your first class
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayClasses.map(cls => (
                  <tr key={cls.id}>
                    <td className="class-name-cell"><strong>{cls.class_name || 'N/A'}</strong></td>
                    <td className="level-cell"><span className="badge-level">{cls.level || 'N/A'}</span></td>
                    <td className="teacher-cell">
                      {cls.teacher_id && cls.teacher_name && cls.teacher_name !== 'Not Assigned' ? (
                        <span className="teacher-assigned" style={{  fontWeight: 500 }}>
                            {cls.teacher_name}
                        </span>
                      ) : (
                        <span className="teacher-not-assigned" style={{   fontStyle: 'italic' }}>
                          Not Assigned
                        </span>
                      )}
                    </td>
                    <td className="capacity-cell">{cls.capacity || '-'}</td>
                    <td className="room-cell">{cls.room_number || '-'}</td>
                    <td className="year-cell">{cls.academic_year || '2024-2025'}</td>
                    <td className="actions-cell">
                      <div className="action-buttons">
                        <button className="btn-view" onClick={() => handleClassView(cls)} title="View Details">
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        {canEdit && (
                          <>
                            <button className="btn-edit" onClick={() => handleClassEdit(cls)} title="Edit Class">
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button className="btn-delete" onClick={() => handleClassDelete(cls.id)} title="Delete Class">
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

      {/* Add/Edit Class Modal */}
      {showModal && canEdit && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <FontAwesomeIcon icon={faChalkboard} />
                </div>
                <div>
                  <h2>{editingClass ? 'Edit Class' : 'Add New Class'}</h2>
                  <p className="modal-subtitle">
                    {editingClass ? 'Update class information' : 'Fill in the details to add a new class'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <form onSubmit={handleClassSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Class Name <span className="required">*</span></label>
                  <input 
                    type="text" 
                    value={formData.class_name} 
                    onChange={(e) => setFormData({...formData, class_name: e.target.value})} 
                    placeholder="e.g., Form 1A, JHS 2B"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>Level <span className="required">*</span></label>
                  <select 
                    value={formData.level} 
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                    required
                  >
                    <option value="KG">Kindergarten</option>
                    <option value="Primary">Primary</option>
                    <option value="JHS">Junior High School</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Capacity</label>
                  <input 
                    type="number" 
                    value={formData.capacity} 
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 0})} 
                    placeholder="Maximum number of students"
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Room Number</label>
                  <input 
                    type="text" 
                    value={formData.room_number} 
                    onChange={(e) => setFormData({...formData, room_number: e.target.value})} 
                    placeholder="e.g., Room 101, Block A" 
                  />
                </div>
                <div className="form-group">
                  <label>Assigned Teacher</label>
                  <select 
                    value={formData.teacher_id} 
                    onChange={(e) => setFormData({...formData, teacher_id: e.target.value})}
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name} 
                        {teacher.teacher_code ? ` (${teacher.teacher_code})` : ''}
                      </option>
                    ))}
                  </select>
                  {formData.teacher_id && (
                    <small style={{ color: '#059669', marginTop: '4px', display: 'block' }}>
                      ✅ Teacher selected
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Academic Year</label>
                  <input 
                    type="text" 
                    value={formData.academic_year} 
                    onChange={(e) => setFormData({...formData, academic_year: e.target.value})} 
                    placeholder="e.g., 2024-2025" 
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel-modal" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-save-modal" disabled={loading}>
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPlus} /> {editingClass ? 'Update Class' : 'Add Class'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Class Modal */}
      {showViewModal && selectedClass && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <FontAwesomeIcon icon={faBookOpen} />
                </div>
                <div>
                  <h2>Class Details</h2>
                  <p className="modal-subtitle">Complete class information</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="view-details">
                <div className="detail-section">
                  <h3><FontAwesomeIcon icon={faChalkboard} /> Class Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Class Name</span>
                    <span className="detail-value">{selectedClass.class_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Level</span>
                    <span className="detail-value">{selectedClass.level || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Capacity</span>
                    <span className="detail-value">{selectedClass.capacity || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Room Number</span>
                    <span className="detail-value">{selectedClass.room_number || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Academic Year</span>
                    <span className="detail-value">{selectedClass.academic_year || 'N/A'}</span>
                  </div>
                </div>
                <div className="detail-section">
                  <h3><FontAwesomeIcon icon={faUserTie} /> Teacher Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Assigned Teacher</span>
                    <span className="detail-value">
                      {selectedClass.teacher_id && selectedClass.teacher_name && selectedClass.teacher_name !== 'Not Assigned' ? (
                        <span style={{ color: '#059669', fontWeight: 500 }}>
                          <FontAwesomeIcon icon={faUserTie} style={{ marginRight: '6px' }} /> {selectedClass.teacher_name}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Not Assigned</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-cancel-modal" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Classes;