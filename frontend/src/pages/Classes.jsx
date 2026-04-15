import React, { useState, useEffect } from 'react';
import './Classes.css'; // Create this CSS or use shared styles

function Classes({ API_BASE }) {
  const [classes, setClasses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    level: 'Primary',
    capacity: 30,
    classroom: '',
    academic_year: '2024-2025'
  });

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/classes`);
      const result = await response.json();
      setClasses(result.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingClass ? `${API_BASE}/classes/${editingClass.id}` : `${API_BASE}/classes`;
      const method = editingClass ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert('Class saved!');
        setShowModal(false);
        loadClasses();
        resetForm();
      } else {
        alert('Error saving class');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this class?')) {
      try {
        const response = await fetch(`${API_BASE}/classes/${id}`, { method: 'DELETE' });
        if (response.ok) {
          loadClasses();
        }
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      level: cls.level,
      capacity: cls.capacity,
      classroom: cls.classroom || '',
      academic_year: cls.academic_year
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingClass(null);
    setFormData({
      name: '',
      level: 'Primary',
      capacity: 30,
      classroom: '',
      academic_year: '2024-2025'
    });
  };

  if (loading) return <div className="loading">Loading classes...</div>;

  return (
    <div className="classes-page">
      <div className="section-header">
        <h2>📚 Class Management ({classes.length} classes)</h2>
        <button className="btn-add" onClick={() => setShowModal(true)}>
          + Add Class
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Level</th>
              <th>Capacity</th>
              <th>Current</th>
              <th>Classroom</th>
              <th>Year</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.map(cls => (
              <tr key={cls.id}>
                <td>{cls.name}</td>
                <td>{cls.level}</td>
                <td>{cls.capacity}</td>
                <td>{cls.current_count || 0}</td>
                <td>{cls.classroom || '-'}</td>
                <td>{cls.academic_year}</td>
                <td>
                  <button className="btn-edit" onClick={() => handleEdit(cls)}>Edit</button>
                  <button className="btn-delete" onClick={() => handleDelete(cls.id)}>Delete</button>
                </td>
              </tr>
            ))}
            {classes.length === 0 && (
              <tr>
                <td colSpan="7" style={{textAlign: 'center', padding: '40px'}}>
                  No classes found. Add your first class!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingClass ? 'Edit Class' : 'Add Class'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Level *</label>
                  <select
                    value={formData.level}
                    onChange={(e) => setFormData({...formData, level: e.target.value})}
                  >
                    <option value="KG">KG</option>
                    <option value="Primary">Primary</option>
                    <option value="JHS">JHS</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Capacity *</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Classroom</label>
                  <input
                    value={formData.classroom}
                    onChange={(e) => setFormData({...formData, classroom: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Academic Year *</label>
                  <input
                    value={formData.academic_year}
                    onChange={(e) => setFormData({...formData, academic_year: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-save">Save</button>
                <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Classes;
