import React from 'react';

const StudentForm = ({ formData, onChange, onSubmit, editingStudent, classes, closeModal }) => {
  return (
    <div className="modern-modal-overlay">
      <div className="modern-modal-card">
        <div className="modal-header">
          <h2>{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
          <button className="close-button" onClick={closeModal}>×</button>
        </div>

        <form onSubmit={onSubmit} className="modern-form">
          <div className="form-grid">
            <div className="form-field">
              <label>First Name *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => onChange('first_name', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Last Name *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => onChange('last_name', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Date of Birth *</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => onChange('date_of_birth', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => onChange('gender', e.target.value)}
              >
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
            <div className="form-field">
              <label>Class *</label>
              <select
                value={formData.class_id}
                onChange={(e) => onChange('class_id', e.target.value)}
                required
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Level</label>
              <select
                value={formData.level}
                onChange={(e) => onChange('level', e.target.value)}
              >
                <option value="Primary">Primary</option>
                <option value="JHS">JHS</option>
                <option value="SHS">SHS</option>
              </select>
            </div>
            <div className="form-field">
              <label>Parent Name *</label>
              <input
                type="text"
                value={formData.parent_name}
                onChange={(e) => onChange('parent_name', e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label>Parent Phone *</label>
              <input
                type="tel"
                value={formData.parent_phone}
                onChange={(e) => onChange('parent_phone', e.target.value)}
                required
              />
            </div>
            <div className="form-field full-width">
              <label>Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => onChange('address', e.target.value)}
                rows="3"
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={closeModal}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              {editingStudent ? 'Update Student' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;

