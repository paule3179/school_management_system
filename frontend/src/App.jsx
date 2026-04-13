import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState({ students: 0, classes: 0 });
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'M',
    class_id: '',
    level: 'Primary',
    parent_name: '',
    parent_phone: '',
    address: ''
  });

  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
  try {
    // Try to fetch classes from API
    let classesData = [];
    try {
      const classesResponse = await fetch(`${API_BASE}/classes`);
      const classesResult = await classesResponse.json();
      classesData = classesResult.data || [];
      console.log('Classes from API:', classesData);
    } catch (apiError) {
      console.log('API error, using mock classes:', apiError);
    }
    
    // If no classes from API, use mock data
    if (classesData.length === 0) {
      classesData = [
        { id: 1, name: 'KG2A', level: 'KG', capacity: 25 },
        { id: 2, name: 'P5A', level: 'Primary', capacity: 35 },
        { id: 3, name: 'JHS2A', level: 'JHS', capacity: 40 }
      ];
      console.log('Using mock classes:', classesData);
    }
    
    setClasses(classesData);
    setStats(prev => ({ ...prev, classes: classesData.length }));
    
    // Fetch students
    const studentsResponse = await fetch(`${API_BASE}/students`);
    const studentsData = await studentsResponse.json();
    setStudents(studentsData.data || []);
    setStats(prev => ({ ...prev, students: studentsData.count || 0 }));
    
  } catch (error) {
    console.error('Error loading data:', error);
    // Fallback mock data
    setClasses([
      { id: 1, name: 'KG2A', level: 'KG' },
      { id: 2, name: 'P5A', level: 'Primary' },
      { id: 3, name: 'JHS2A', level: 'JHS' }
    ]);
  }
};

 const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('=== SAVING STUDENT ===');
  console.log('Form data being sent:', formData);
  
  try {
    const url = editingStudent 
      ? `${API_BASE}/students/${editingStudent.id}`
      : `${API_BASE}/students`;
    const method = editingStudent ? 'PUT' : 'POST';
    
    console.log('URL:', url);
    console.log('Method:', method);
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      console.log('✅ Student saved successfully!');
      setShowModal(false);
      resetForm();
      loadData(); // Reload the data
      alert('Student saved successfully!');
    } else {
      console.error('❌ Error saving student:', data);
      alert('Error: ' + (data.error || 'Failed to save student'));
    }
  } catch (error) {
    console.error('❌ Network error:', error);
    alert('Network error: ' + error.message);
  }
};

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE' });
        loadData();
      } catch (error) {
        console.error('Error deleting student:', error);
      }
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      date_of_birth: student.date_of_birth?.split('T')[0] || '',
      gender: student.gender,
      class_id: student.class_id,
      level: student.level,
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      address: student.address || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingStudent(null);
    setFormData({
      first_name: '',
      last_name: '',
      date_of_birth: '',
      gender: 'M',
      class_id: '',
      level: 'Primary',
      parent_name: '',
      parent_phone: '',
      address: ''
    });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>🏫 School Management System</h1>
        <p>KG | Primary | JHS</p>
      </header>

      <div className="dashboard">
        <div className="stats">
          <div className="stat-card">
            <h3>Total Students</h3>
            <div className="stat-number">{stats.students}</div>
          </div>
          <div className="stat-card">
            <h3>Total Classes</h3>
            <div className="stat-number">{stats.classes}</div>
          </div>
        </div>

        <div className="students-section">
          <div className="section-header">
            <h2>Student Management</h2>
            <button className="btn-add" onClick={() => setShowModal(true)}>
              + Add Student
            </button>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>Admission No</th>
                <th>Name</th>
                <th>Class</th>
                <th>Parent</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td>{student.admission_number || student.id}</td>
                  <td>{student.first_name} {student.last_name}</td>
                  <td>{student.class_name || student.class_id}</td>
                  <td>{student.parent_name || '-'}</td>
                  <td>{student.parent_phone || '-'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(student)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(student.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingStudent ? 'Edit Student' : 'Add New Student'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth *</label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Class *</label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                    required
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                  >
                    <option value="KG">Kindergarten</option>
                    <option value="Primary">Primary</option>
                    <option value="JHS">Junior High School</option>
                  </select>
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Parent Name</label>
                  <input
                    type="text"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Parent Phone</label>
                  <input
                    type="tel"
                    value={formData.parent_phone}
                    onChange={(e) => setFormData({...formData, parent_phone: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows="3"
                />
              </div>
              
              <div className="modal-actions">
                <button type="submit" className="btn-save">Save</button>
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;