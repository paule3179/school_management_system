import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faEdit,
  faTrash,
  faSearch,
  faTimes,
  faFileExport,
  faUserGraduate,
  faVenusMars,
  faGraduationCap,
  faFilter,
  faUndo,
  faEye,
  faSpinner,
  faEnvelope,
  faPhone,
  faCalendarAlt,
  faMapMarkerAlt,
  faHeartbeat,
  faUser,
  faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import './StudentsPage.css';

const StudentsPage = ({ API_BASE = 'http://localhost:5000/api' }) => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredStudents, setFilteredStudents] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);

  const [toast, setToast] = useState(null);
  const [userRole, setUserRole] = useState(null);

  const [filters, setFilters] = useState({
    class_id: '',
    gender: '',
    status: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    class_id: '',
    enrollment_date: '',
    status: 'Active',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    blood_group: '',
    allergies: '',
    medical_conditions: '',
    nationality: '',
    religion: '',
    previous_school: '',
    admission_number: ''
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
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No token found! Please login again.');
      showToastMessage('Please login again', 'error');
      return;
    }

    console.log('✅ Token found, loading students...');
    loadStudents();
    loadClasses();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchTerm, filters, students]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const url = `${API_BASE}/admin/students`;

      console.log('📡 Fetching students from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers
      });

      console.log('📡 Response status:', response.status);

      if (response.status === 401) {
        console.error('❌ Unauthorized - token invalid or expired');
        showToastMessage('Session expired. Please login again.', 'error');
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log('📡 Response data:', result);

      if (result.success) {
        setStudents(result.data || []);
        console.log(`✅ Loaded ${result.data?.length || 0} students`);
      } else {
        console.error('❌ Failed to load students:', result.error);
        showToastMessage(result.error || 'Failed to load students', 'error');
        setStudents([]);
      }
    } catch (error) {
      console.error('❌ Error loading students:', error);
      showToastMessage('Network error loading students', 'error');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/admin/classes`, {
        method: 'GET',
        headers
      });

      const result = await response.json();
      if (result.success) {
        setClasses(result.data || []);
        console.log(`✅ Loaded ${result.data?.length || 0} classes`);
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      setClasses([]);
    }
  };

  const applyFilters = () => {
    let filtered = [...students];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => {
        const searchableText = `${student.first_name || ''} ${student.last_name || ''} ${student.admission_number || ''} ${student.parent_name || ''} ${student.parent_phone || ''} ${student.parent_email || ''}`.toLowerCase();
        return searchableText.includes(term);
      });
    }

    if (filters.class_id) {
      filtered = filtered.filter(student => student.class_id === parseInt(filters.class_id));
    }

    if (filters.gender) {
      filtered = filtered.filter(student => student.gender === filters.gender);
    }

    if (filters.status) {
      const desired = filters.status.toLowerCase();
      filtered = filtered.filter(student => (student.status || '').toString().toLowerCase() === desired);
    }

    setFilteredStudents(filtered);
  };

  const clearFilters = () => {
    setFilters({ class_id: '', gender: '', status: '' });
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleStudentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (userRole !== 'admin') {
      showToastMessage('Only administrators can add or edit students', 'error');
      setLoading(false);
      return;
    }

    const missingFields = [];
    if (!formData.first_name) missingFields.push('First Name');
    if (!formData.last_name) missingFields.push('Last Name');
    if (!formData.parent_name) missingFields.push('Parent Name');
    if (!formData.parent_email) missingFields.push('Parent Email');
    if (!formData.class_id) missingFields.push('Class');

    if (missingFields.length > 0) {
      showToastMessage(`Missing required fields: ${missingFields.join(', ')}`, 'error');
      setLoading(false);
      return;
    }

    try {
      const headers = getAuthHeaders();
      const url = editingStudent
        ? `${API_BASE}/admin/students/${editingStudent.id}`
        : `${API_BASE}/admin/students`;

      const method = editingStudent ? 'PUT' : 'POST';

      console.log(`📤 ${method} request to:`, url);
      console.log('📤 Data:', formData);

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok) {
        showToastMessage(editingStudent ? 'Student updated successfully!' : 'Student enrolled successfully!', 'success');
        setShowModal(false);
        resetForm();
        loadStudents();
      } else {
        if (response.status === 409) {
          showToastMessage('Student with this parent email or admission number already exists.', 'error');
        } else if (response.status === 400 && result.missingFields) {
          showToastMessage(`Missing fields: ${result.missingFields.join(', ')}`, 'error');
        } else {
          showToastMessage(result.error || 'Failed to save student', 'error');
        }
      }
    } catch (error) {
      console.error('❌ Error saving student:', error);
      showToastMessage('Network error saving student', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentDelete = async (id) => {
    if (userRole !== 'admin') {
      showToastMessage('Only administrators can delete students', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this student?')) return;

    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/admin/students/${id}`, {
        method: 'DELETE',
        headers
      });

      if (response.ok) {
        showToastMessage('Student deleted successfully!', 'success');
        loadStudents();
      } else {
        const result = await response.json();
        showToastMessage(result.error || 'Failed to delete student', 'error');
      }
    } catch (error) {
      console.error('❌ Error deleting student:', error);
      showToastMessage('Network error', 'error');
    }
  };

  const handleStudentEdit = (student) => {
    if (userRole !== 'admin') {
      showToastMessage('Only administrators can edit students', 'error');
      return;
    }

    setEditingStudent(student);
    setFormData({
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : '',
      gender: student.gender || '',
      address: student.address || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_email: student.parent_email || '',
      class_id: student.class_id || '',
      enrollment_date: student.enrollment_date ? student.enrollment_date.split('T')[0] : '',
      status: student.status || 'Active',
      emergency_contact_name: student.emergency_contact_name || '',
      emergency_contact_phone: student.emergency_contact_phone || '',
      emergency_contact_relationship: student.emergency_contact_relationship || '',
      blood_group: student.blood_group || '',
      allergies: student.allergies || '',
      medical_conditions: student.medical_conditions || '',
      nationality: student.nationality || '',
      religion: student.religion || '',
      previous_school: student.previous_school || '',
      admission_number: student.admission_number || ''
    });
    setShowModal(true);
  };

  const handleStudentView = (student) => {
    setSelectedStudent(student);
    setShowViewModal(true);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: '',
      address: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      class_id: '',
      enrollment_date: '',
      status: 'Active',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relationship: '',
      blood_group: '',
      allergies: '',
      medical_conditions: '',
      nationality: '',
      religion: '',
      previous_school: '',
      admission_number: ''
    });
  };

  const exportToExcel = () => {
    try {
      const dataToExport = filteredStudents.length > 0 ? filteredStudents : students;

      if (dataToExport.length === 0) {
        showToastMessage('No data to export', 'error');
        return;
      }

      const exportData = dataToExport.map(student => ({
        'Admission Number': student.admission_number || '',
        'First Name': student.first_name || '',
        'Last Name': student.last_name || '',
        'Full Name': `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        'Gender': student.gender || '',
        'Parent Name': student.parent_name || '',
        'Parent Phone': student.parent_phone || '',
        'Parent Email': student.parent_email || '',
        'Class': student.class_name || '',
        'Status': student.status || 'Active'
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
      const filename = `students_export_${dateStr}.csv`;

      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToastMessage(`Exported ${dataToExport.length} students successfully!`, 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToastMessage('Error exporting data', 'error');
    }
  };

  const displayStudents = filteredStudents.length > 0 ? filteredStudents : students;
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.status === 'Active' || s.status === 'active').length;
  const maleStudents = students.filter(s => s.gender === 'Male' || s.gender === 'M').length;
  const femaleStudents = students.filter(s => s.gender === 'Female' || s.gender === 'F').length;

  const canEdit = userRole === 'admin';

  if (loading && students.length === 0) {
    return (
      <div className="loading">
        <FontAwesomeIcon icon={faSpinner} spin /> Loading students...
      </div>
    );
  }

  return (
    <div className="students-page">
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faUserGraduate} />
          </div>
          <div className="stat-info">
            <h3>{totalStudents}</h3>
            <p>TOTAL STUDENTS</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="stat-info">
            <h3>{activeStudents}</h3>
            <p>ACTIVE STUDENTS</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <FontAwesomeIcon icon={faVenusMars} />
          </div>
          <div className="stat-info">
            <h3>{maleStudents}</h3>
            <p>BOYS</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon pink">
            <FontAwesomeIcon icon={faVenusMars} />
          </div>
          <div className="stat-info">
            <h3>{femaleStudents}</h3>
            <p>GIRLS</p>
          </div>
        </div>
      </div>

      {/* Students Section */}
      <div className="students-section">
        <div className="section-header">
          <h2>
            <FontAwesomeIcon icon={faUserGraduate} /> Student Management
          </h2>
          <div className="header-buttons">
            {canEdit && (
              <button
                className="btn-add"
                onClick={() => {
                  resetForm();
                  setEditingStudent(null);
                  setShowModal(true);
                }}
              >
                <FontAwesomeIcon icon={faPlus} /> Enroll Student
              </button>
            )}
            <button className="btn-export" onClick={exportToExcel}>
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
              placeholder="Search by name, admission number, parent name, email, or phone..."
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
                <label>Class</label>
                <select
                  value={filters.class_id}
                  onChange={(e) => setFilters({ ...filters, class_id: e.target.value })}
                >
                  <option value="">All Classes</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name || cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label>Gender</label>
                <select
                  value={filters.gender}
                  onChange={(e) => setFilters({ ...filters, gender: e.target.value })}
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Students Table */}
        <div className="table-container">
          <table className="professional-table">
            <thead>
              <tr>
                <th>STUDENT NAME</th>
                <th>CLASS</th>
                <th>PARENT NAME</th>
                <th>PARENT EMAIL</th>
                <th>PARENT PHONE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {displayStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-state">

                    <div className="empty-icon">📚</div>
                    <p>No students found</p>
                    {canEdit && (
                      <button
                        className="btn-add-small"
                        onClick={() => {
                          resetForm();
                          setEditingStudent(null);
                          setShowModal(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faPlus} /> Enroll your first student
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                displayStudents.map(student => (
                  <tr key={student.id}>
                    <td className="student-name-cell">
                      <strong>
                        {student.first_name} {student.last_name}
                      </strong>
                    </td>
                    <td>
                      <span className="badge-class">{student.class_name || 'Not assigned'}</span>
                    </td>

                    <td>{student.parent_name || '-'}</td>
                    <td>{student.parent_email || '-'}</td>
                    <td>{student.parent_phone || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => handleStudentView(student)}
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        {canEdit && (
                          <>
                            <button
                              className="btn-edit"
                              onClick={() => handleStudentEdit(student)}
                              title="Edit Student"
                            >
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleStudentDelete(student.id)}
                              title="Delete Student"
                            >
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

      {/* Add/Edit Student Modal */}
      {showModal && canEdit && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content form-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <FontAwesomeIcon icon={faUserGraduate} />
                </div>
                <div>
                  <h2>{editingStudent ? 'Edit Student' : 'Enroll New Student'}</h2>
                  <p className="modal-subtitle">
                    {editingStudent ? 'Update student information' : 'Fill in the details to enroll a new student'}
                  </p>
                </div>
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleStudentSubmit}>
              <div className="modal-body form-modal-body">
                {/* Student Information */}
                <div className="form-section">
                  <div className="section-title">
                    <FontAwesomeIcon icon={faUser} />
                    <span>Student Information</span>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="Enter first name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Enter last name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Gender</label>
                      <select value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Class <span className="required">*</span></label>
                      <select
                        value={formData.class_id}
                        onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                        required
                      >
                        <option value="">Select Class</option>
                        {classes.map(cls => (
                          <option key={cls.id} value={cls.id}>
                            {cls.class_name || cls.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Enrollment Date</label>
                      <input
                        type="date"
                        value={formData.enrollment_date}
                        onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter address"
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Parent Information */}
                <div className="form-section">
                  <div className="section-title">
                    <FontAwesomeIcon icon={faEnvelope} />
                    <span>Parent Information</span>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Parent Name <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.parent_name}
                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                        placeholder="Enter parent's full name"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Parent Email <span className="required">*</span></label>
                      <input
                        type="email"
                        value={formData.parent_email}
                        onChange={(e) => setFormData({ ...formData, parent_email: e.target.value })}
                        placeholder="parent@email.com"
                        required
                      />
                      <small style={{ color: '#6c757d', fontSize: '11px', marginTop: '4px' }}>
                        This email will be used for parent login and notifications
                      </small>
                    </div>
                    <div className="form-group">
                      <label>Parent Phone</label>
                      <input
                        type="tel"
                        value={formData.parent_phone}
                        onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                        placeholder="+233 XX XXX XXXX"
                      />
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="form-section">
                  <div className="section-title">
                    <FontAwesomeIcon icon={faHeartbeat} />
                    <span>Emergency Contact & Medical Information</span>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Emergency Contact</label>
                      <input
                        type="text"
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        placeholder="Full name"
                      />
                    </div>
                    <div className="form-group">
                      <label>Emergency Phone</label>
                      <input
                        type="tel"
                        value={formData.emergency_contact_phone}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                    <div className="form-group">
                      <label>Relationship</label>
                      <input
                        type="text"
                        value={formData.emergency_contact_relationship}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                        placeholder="e.g., Aunt, Uncle"
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Blood Group</label>
                      <select value={formData.blood_group} onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}>
                        <option value="">Select</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Allergies</label>
                      <input
                        type="text"
                        value={formData.allergies}
                        onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                        placeholder="Any allergies"
                      />
                    </div>
                    <div className="form-group">
                      <label>Medical Conditions</label>
                      <input
                        type="text"
                        value={formData.medical_conditions}
                        onChange={(e) => setFormData({ ...formData, medical_conditions: e.target.value })}
                        placeholder="Any medical conditions"
                      />
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
                      <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faPlus} /> {editingStudent ? 'Update Student' : 'Enroll Student'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Student Modal */}
      {showViewModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <FontAwesomeIcon icon={faUserGraduate} />
                </div>
                <div>
                  <h2>Student Details</h2>
                  <p className="modal-subtitle">Complete student information</p>
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
                    <span className="detail-label">Full Name</span>
                    <span className="detail-value">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Admission Number</span>
                    <span className="detail-value">{selectedStudent.admission_number || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Gender</span>
                    <span className="detail-value">{selectedStudent.gender || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Date of Birth</span>
                    <span className="detail-value">{selectedStudent.date_of_birth || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Class</span>
                    <span className="detail-value">{selectedStudent.class_name || 'Not assigned'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status</span>
                    <span className="detail-value">
                      <span className={`status-badge ${selectedStudent.status?.toLowerCase() || 'active'}`}>
                        {selectedStudent.status || 'Active'}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Parent Information */}
                <div className="detail-section">
                  <h3><FontAwesomeIcon icon={faEnvelope} /> Parent Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Parent Name</span>
                    <span className="detail-value">{selectedStudent.parent_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Parent Email</span>
                    <span className="detail-value">{selectedStudent.parent_email || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Parent Phone</span>
                    <span className="detail-value">{selectedStudent.parent_phone || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Address</span>
                    <span className="detail-value">{selectedStudent.address || 'N/A'}</span>
                  </div>
                </div>

                {/* Medical Information */}
                <div className="detail-section">
                  <h3><FontAwesomeIcon icon={faHeartbeat} /> Medical Information</h3>
                  <div className="detail-row">
                    <span className="detail-label">Blood Group</span>
                    <span className="detail-value">{selectedStudent.blood_group || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Allergies</span>
                    <span className="detail-value">{selectedStudent.allergies || 'None'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Medical Conditions</span>
                    <span className="detail-value">{selectedStudent.medical_conditions || 'None'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Emergency Contact</span>
                    <span className="detail-value">{selectedStudent.emergency_contact_name || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Emergency Phone</span>
                    <span className="detail-value">{selectedStudent.emergency_contact_phone || 'N/A'}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Relationship</span>
                    <span className="detail-value">{selectedStudent.emergency_contact_relationship || 'N/A'}</span>
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

      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default StudentsPage;