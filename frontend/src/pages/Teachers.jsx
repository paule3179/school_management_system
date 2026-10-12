import { apiFetch } from '../services/api.js';
import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, faEdit, faTrash, faSearch, faTimes,
  faFileExport, faChalkboardUser, faEnvelope, faBook, faUserGraduate, 
  faEye, faIdCard, faUser, faBriefcase, faHistory, faFilter, faUndo,
  faGraduationCap, faPhone, faCalendarAlt, faDollarSign, faHeartbeat
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from "../components/ToastNotification";
import './Teachers.css';

function Teachers({ API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api') }) {
  const [teachers, setTeachers] = useState([]);
  const [toast, setToast] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  
  const [filters, setFilters] = useState({
    department: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  // COMPLETE form data with ALL fields
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    employee_number: '',
    department: '',
    status: 'Active',
    subject_specialty: '',
    qualification: '',
    years_of_experience: '',
    date_hired: '',
    ghana_card_number: '',
    ssn: '',
    religion: '',
    bank_account: '',
    gender: '',
    date_of_birth: '',
    address: ''
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
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, teachers]);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const response = await apiFetch(`${API_BASE}/admin/teachers`, {
        headers: getAuthHeaders()
      });
      const result = await response.json();
      if (result.success) {
        setTeachers(result.data || []);
        setFilteredTeachers(result.data || []);
      } else {
        setTeachers([]);
        setFilteredTeachers([]);
      }
    } catch (error) {
      console.error('Error loading teachers:', error);
      setTeachers([]);
      setFilteredTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...teachers];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(teacher => {
        const searchableText = `${teacher.first_name || ''} ${teacher.last_name || ''} ${teacher.employee_number || ''} ${teacher.department || ''} ${teacher.email || ''} ${teacher.phone || ''} ${teacher.ghana_card_number || ''} ${teacher.ssn || ''} ${teacher.religion || ''}`.toLowerCase();
        return searchableText.includes(term);
      });
    }
    
    if (filters.department) {
      filtered = filtered.filter(teacher => 
        teacher.department && teacher.department.toLowerCase().includes(filters.department.toLowerCase())
      );
    }
    
    if (filters.status) {
      filtered = filtered.filter(teacher => teacher.status === filters.status);
    }
    
    setFilteredTeachers(filtered);
  };

  const clearFilters = () => {
    setFilters({ department: '', status: '' });
    setSearchTerm('');
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingTeacher(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      employee_number: '',
      department: '',
      status: 'Active',
      subject_specialty: '',
      qualification: '',
      years_of_experience: '',
      date_hired: '',
      ghana_card_number: '',
      ssn: '',
      religion: '',
      bank_account: '',
      gender: '',
      date_of_birth: '',
      address: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const url = editingTeacher 
        ? `${API_BASE}/admin/teachers/${editingTeacher.id}`
        : `${API_BASE}/admin/teachers`;
    const method = editingTeacher ? 'PUT' : 'POST';
    
    try {
        const response = await apiFetch(url, {
            method,
            headers: getAuthHeaders(),
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
          showToastMessage(editingTeacher ? 'Teacher updated successfully!' : 'Teacher added successfully!', 'success');
          setShowModal(false);
          resetForm();
          loadTeachers();
        } else {
          showToastMessage('Error: ' + (data.error || 'Failed to save teacher'), 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToastMessage('Error saving teacher: ' + error.message, 'error');
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (userRole !== 'admin') {
      showToastMessage('Only administrators can delete teachers', 'error');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        const response = await apiFetch(`${API_BASE}/admin/teachers/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          showToastMessage('Teacher deleted successfully', 'success');
          loadTeachers();
        } else {
          const data = await response.json();
          showToastMessage('Error: ' + (data.error || 'Failed to delete teacher'), 'error');
        }
      } catch (error) {
        console.error('Error deleting teacher:', error);
        showToastMessage('Network error: ' + error.message, 'error');
      }
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      first_name: teacher.first_name || '',
      last_name: teacher.last_name || '',
      email: teacher.email || '',
      phone: teacher.phone || '',
      employee_number: teacher.employee_number || '',
      department: teacher.department || '',
      status: teacher.status || 'Active',
      subject_specialty: teacher.subject_specialty || '',
      qualification: teacher.qualification || '',
      years_of_experience: teacher.years_of_experience || '',
      date_hired: teacher.date_hired || '',
      ghana_card_number: teacher.ghana_card_number || '',
      ssn: teacher.ssn || '',
      religion: teacher.religion || '',
      bank_account: teacher.bank_account || '',
      gender: teacher.gender || '',
      date_of_birth: teacher.date_of_birth || '',
      address: teacher.address || ''
    });
    setShowModal(true);
  };

  const handleView = (teacher) => {
    setSelectedTeacher(teacher);
    setShowViewModal(true);
  };

  const exportToCSV = () => {
    try {
      const dataToExport = filteredTeachers.length > 0 ? filteredTeachers : teachers;
      if (dataToExport.length === 0) {
        showToastMessage('No data to export', 'error');
        return;
      }
      const exportData = dataToExport.map(teacher => ({
        'Employee Number': teacher.employee_number || '',
        'Name': `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim(),
        'Email': teacher.email || '',
        'Phone': teacher.phone || '',
        'Department': teacher.department || '',
        'Subject Specialty': teacher.subject_specialty || '',
        'Qualification': teacher.qualification || '',
        'Years Experience': teacher.years_of_experience || '',
        'Date Hired': teacher.date_hired || '',
        'Status': teacher.status || 'Active'
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
      const filename = `teachers_export_${dateStr}.csv`;
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToastMessage(`Exported ${dataToExport.length} teachers successfully!`, 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToastMessage('Error exporting data', 'error');
    }
  };

  const displayTeachers = filteredTeachers.length > 0 ? filteredTeachers : teachers;
  const totalTeachers = teachers.length;
  const activeTeachers = teachers.filter(t => t.status === 'Active' || t.status === 'active').length;

  const canEdit = userRole === 'admin';

  if (loading && teachers.length === 0) {
    return <div className="loading">Loading teachers...</div>;
  }

  return (
    <div className="teachers-page">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faChalkboardUser} /></div>
          <div className="stat-info"><h3>{totalTeachers}</h3><p>TOTAL TEACHERS</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faUserGraduate} /></div>
          <div className="stat-info"><h3>{activeTeachers}</h3><p>ACTIVE TEACHERS</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faBook} /></div>
          <div className="stat-info"><h3>{teachers.length}</h3><p>STAFF COUNT</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FontAwesomeIcon icon={faGraduationCap} /></div>
          <div className="stat-info"><h3>{teachers.filter(t => t.subject_specialty).length}</h3><p>SPECIALISTS</p></div>
        </div>
      </div>

      <div className="teachers-section">
        <div className="section-header">
          <h2><FontAwesomeIcon icon={faChalkboardUser} /> Teacher Management</h2>
          <div className="header-buttons">
            {canEdit && (
              <button className="btn-add" onClick={() => { resetForm(); setShowModal(true); }}>
                <FontAwesomeIcon icon={faPlus} /> Add Teacher
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
            <input type="text" placeholder="Search by name, employee number, department, email, phone, Ghana Card, SSN, or Religion..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
            {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}><FontAwesomeIcon icon={faTimes} /></button>}
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
                <label>Department</label>
                <select value={filters.department} onChange={(e) => setFilters({...filters, department: e.target.value})}>
                  <option value="">All Departments</option>
                  {[...new Set(teachers.map(t => t.department).filter(Boolean))].map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Teachers Table */}
        <div className="table-container">
          <table className="professional-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>TEACHER</th>
                <th style={{ width: '18%' }}>DEPARTMENT</th>
                <th style={{ width: '18%' }}>SPECIALTY</th>
                <th style={{ width: '18%' }}>EMAIL</th>
                <th style={{ width: '12%' }}>PHONE</th>
                <th style={{ width: '6%' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayTeachers.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">

                  <div className="empty-icon"><FontAwesomeIcon icon={faChalkboardUser} /></div>
                  <p>No teachers found</p>
                  {canEdit && <button className="btn-add-small" onClick={() => { resetForm(); setShowModal(true); }}><FontAwesomeIcon icon={faPlus} /> Add your first teacher</button>}
                </td></tr>
              ) : (
                displayTeachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td className="teacher-name-cell"><strong>{teacher.first_name} {teacher.last_name}</strong></td>

                    <td>{teacher.department || '-'}</td>
                    <td>{teacher.subject_specialty || '-'}</td>
                    <td>{teacher.email || '-'}</td>
                    <td>{teacher.phone || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-view" onClick={() => handleView(teacher)}><FontAwesomeIcon icon={faEye} /></button>
                        {canEdit && (
                          <>
                            <button className="btn-edit" onClick={() => handleEdit(teacher)}><FontAwesomeIcon icon={faEdit} /></button>
                            <button className="btn-delete" onClick={() => handleDelete(teacher.id)}><FontAwesomeIcon icon={faTrash} /></button>
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

      {/* Add/Edit Teacher Modal */}
      {showModal && canEdit && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <FontAwesomeIcon icon={faChalkboardUser} />
                </div>
                <div>
                  <h2>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
                  <p className="modal-subtitle">
                    {editingTeacher ? 'Update teacher information' : 'Fill in the details to add a new teacher'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="modal-body form-modal-body">
                {/* Personal Information */}
                <div className="form-section">
                  <div className="section-title">
                    <FontAwesomeIcon icon={faUser} />
                    <span>Personal Information</span>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name <span className="required">*</span></label>
                      <input type="text" value={formData.first_name} onChange={(e) => handleChange('first_name', e.target.value)} placeholder="Enter first name" required />
                    </div>
                    <div className="form-group">
                      <label>Last Name <span className="required">*</span></label>
                      <input type="text" value={formData.last_name} onChange={(e) => handleChange('last_name', e.target.value)} placeholder="Enter last name" required />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select value={formData.gender} onChange={(e) => handleChange('gender', e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" value={formData.date_of_birth} onChange={(e) => handleChange('date_of_birth', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Ghana Card Number</label>
                      <input type="text" value={formData.ghana_card_number} onChange={(e) => handleChange('ghana_card_number', e.target.value)} placeholder="GHA-XXXXXXXXXX-XX" />
                    </div>
                    <div className="form-group">
                      <label>SSN</label>
                      <input type="text" value={formData.ssn} onChange={(e) => handleChange('ssn', e.target.value)} placeholder="SSN-XXX-XX-XXXX" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Religion</label>
                      <select value={formData.religion} onChange={(e) => handleChange('religion', e.target.value)}>
                        <option value="">Select Religion</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Islam">Islam</option>
                        <option value="Traditional">Traditional</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Address</label>
                      <input type="text" value={formData.address} onChange={(e) => handleChange('address', e.target.value)} placeholder="Full address" />
                    </div>
                    <div className="form-group">
                      <label>Bank Account</label>
                      <input type="text" value={formData.bank_account} onChange={(e) => handleChange('bank_account', e.target.value)} placeholder="Bank account number" />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="form-section">
                  <div className="section-title">
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>Contact Information</span>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email <span className="required">*</span></label>
                      <input type="email" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} placeholder="teacher@school.edu" required />
                    </div>
                    <div className="form-group">
                      <label>Phone</label>
                      <input type="tel" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+233 XX XXX XXXX" />
                    </div>
                    <div className="form-group">
                      <label>Employee Number</label>
                      <input type="text" value={formData.employee_number} onChange={(e) => handleChange('employee_number', e.target.value)} placeholder="EMP-XXXX" />
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="form-section">
                  <div className="section-title">
                    <FontAwesomeIcon icon={faBriefcase} />
                    <span>Professional Information</span>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Department</label>
                      <input type="text" value={formData.department} onChange={(e) => handleChange('department', e.target.value)} placeholder="e.g., Science Department" />
                    </div>
                    <div className="form-group">
                      <label>Subject Specialty</label>
                      <input type="text" value={formData.subject_specialty} onChange={(e) => handleChange('subject_specialty', e.target.value)} placeholder="e.g., Mathematics, Science" />
                    </div>
                    <div className="form-group">
                      <label>Qualification</label>
                      <input type="text" value={formData.qualification} onChange={(e) => handleChange('qualification', e.target.value)} placeholder="e.g., B.Ed, M.Ed" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Years of Experience</label>
                      <input type="number" value={formData.years_of_experience} onChange={(e) => handleChange('years_of_experience', e.target.value)} placeholder="0" min="0" />
                    </div>
                    <div className="form-group">
                      <label>Date Hired</label>
                      <input type="date" value={formData.date_hired} onChange={(e) => handleChange('date_hired', e.target.value)} />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={formData.status} onChange={(e) => handleChange('status', e.target.value)}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel-modal" onClick={() => { setShowModal(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="submit" className="btn-save-modal" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner"></span> Saving...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPlus} /> {editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Teacher Modal with ALL FIELDS */}
      {showViewModal && selectedTeacher && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <FontAwesomeIcon icon={faUserGraduate} />
                </div>
                <div>
                  <h2>Teacher Details</h2>
                  <p className="modal-subtitle">Complete teacher information</p>
                </div>
              </div>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="view-details">
                {/* Personal Information */}
                <div className="detail-section">
                  <h3><FontAwesomeIcon icon={faUser} /> Personal Information</h3>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faUser} /> Full Name</span>
                    <span className="detail-value">{selectedTeacher.first_name} {selectedTeacher.last_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faIdCard} /> Gender</span>
                    <span className="detail-value">{selectedTeacher.gender || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faCalendarAlt} /> Date of Birth</span>
                    <span className="detail-value">{selectedTeacher.date_of_birth || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faIdCard} /> Ghana Card</span>
                    <span className="detail-value">{selectedTeacher.ghana_card_number || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faIdCard} /> SSN</span>
                    <span className="detail-value">{selectedTeacher.ssn || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faHeartbeat} /> Religion</span>
                    <span className="detail-value">{selectedTeacher.religion || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faDollarSign} /> Bank Account</span>
                    <span className="detail-value">{selectedTeacher.bank_account || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faHistory} /> Address</span>
                    <span className="detail-value">{selectedTeacher.address || 'N/A'}</span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="detail-section">
                  <h3><FontAwesomeIcon icon={faEnvelope} /> Contact Information</h3>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faEnvelope} /> Email</span>
                    <span className="detail-value">{selectedTeacher.email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faPhone} /> Phone</span>
                    <span className="detail-value">{selectedTeacher.phone || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faIdCard} /> Employee Number</span>
                    <span className="detail-value">{selectedTeacher.employee_number || 'N/A'}</span>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="detail-section">
                  <h3><FontAwesomeIcon icon={faBriefcase} /> Professional Information</h3>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faBook} /> Department</span>
                    <span className="detail-value">{selectedTeacher.department || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faGraduationCap} /> Subject Specialty</span>
                    <span className="detail-value">{selectedTeacher.subject_specialty || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faGraduationCap} /> Qualification</span>
                    <span className="detail-value">{selectedTeacher.qualification || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faHistory} /> Years Experience</span>
                    <span className="detail-value">{selectedTeacher.years_of_experience || '0'} years</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faCalendarAlt} /> Date Hired</span>
                    <span className="detail-value">{selectedTeacher.date_hired || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label"><FontAwesomeIcon icon={faHeartbeat} /> Status</span>
                    <span className="detail-value">
                      <span className={`status-badge ${selectedTeacher.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}>
                        {selectedTeacher.status || 'Active'}
                      </span>
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

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default Teachers;