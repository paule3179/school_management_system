import React, { useState, useEffect } from 'react';
import './Teachers.css';

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    subject_specialty: '',
    phone: '',
    email: '',
    employment_date: ''
  });

  const API_BASE = 'http://localhost:5000/api';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const teachersResponse = await fetch(`${API_BASE}/teachers`);
      const teachersResult = await teachersResponse.json();
      setTeachers(teachersResult.data || []);
      
      const classesResponse = await fetch(`${API_BASE}/classes`);
      const classesResult = await classesResponse.json();
      setClasses(classesResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingTeacher 
        ? `${API_BASE}/teachers/${editingTeacher.id}`
        : `${API_BASE}/teachers`;
      const method = editingTeacher ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Teacher saved successfully!');
        setShowModal(false);
        resetForm();
        loadData();
      } else {
        alert('Error: ' + (data.error || 'Failed to save teacher'));
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        const response = await fetch(`${API_BASE}/teachers/${id}`, { method: 'DELETE' });
        if (response.ok) {
          alert('Teacher deleted successfully');
          loadData();
        } else {
          const data = await response.json();
          alert('Error: ' + (data.error || 'Failed to delete teacher'));
        }
      } catch (error) {
        console.error('Error deleting teacher:', error);
        alert('Network error: ' + error.message);
      }
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      subject_specialty: teacher.subject_specialty,
      phone: teacher.phone,
      email: teacher.email,
      employment_date: teacher.employment_date?.split('T')[0] || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingTeacher(null);
    setFormData({
      first_name: '',
      last_name: '',
      subject_specialty: '',
      phone: '',
      email: '',
      employment_date: ''
    });
  };

  if (loading) {
    return <div className="loading">Loading teachers...</div>;
  }

  return (
    <div className="teachers-page">
      <div className="page-header">
        <h1>👨‍🏫 Teacher Management</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Add New Teacher
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Teacher Code</th>
              <th>Name</th>
              <th>Subject</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Assigned Class</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {teachers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{textAlign: 'center'}}>
                  No teachers found. Click "Add New Teacher" to create one.
                </td>
              </tr>
            ) : (
              teachers.map(teacher => (
                <tr key={teacher.id}>
                  <td>{teacher.teacher_code}</td>
                  <td>{teacher.first_name} {teacher.last_name}</td>
                  <td>{teacher.subject_specialty}</td>
                  <td>{teacher.phone}</td>
                  <td>{teacher.email}</td>
                  <td>{teacher.assigned_class || 'Not assigned'}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleEdit(teacher)}>Edit</button>
                    <button className="btn-delete" onClick={() => handleDelete(teacher.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h2>
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
                  <label>Subject Specialty *</label>
                  <input
                    type="text"
                    value={formData.subject_specialty}
                    onChange={(e) => setFormData({...formData, subject_specialty: e.target.value})}
                    required
                    placeholder="e.g., Mathematics, English, Science"
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                    placeholder="e.g., 0244123456"
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                    placeholder="teacher@school.edu"
                  />
                </div>
                <div className="form-group">
                  <label>Employment Date</label>
                  <input
                    type="date"
                    value={formData.employment_date}
                    onChange={(e) => setFormData({...formData, employment_date: e.target.value})}
                  />
                </div>
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

export default Teachers;