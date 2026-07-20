import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarAlt, faPlus, faEdit, faTrash, faDownload, 
  faSync, faMagic, faTimes, faSave, faClock, 
  faDoorOpen, faUserTie, faSearch, 
  faSpinner, faBookOpen
} from '@fortawesome/free-solid-svg-icons';
import './Timetable.css';

const TimetablePage = ({ API_BASE: apiBase }) => {
  const API_BASE = apiBase || 'http://localhost:5000/api';

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [formData, setFormData] = useState({
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '09:00',
    subject: '',
    teacher_id: '',
    room: ''
  });
  const [toast, setToast] = useState(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadTimetable();
    }
  }, [selectedClass, selectedTerm, academicYear]);

  const loadAllData = async () => {
    await loadClasses();
    await loadTeachers();
    await loadSubjects();
  };

  // ============================================
  // LOAD CLASSES - FIXED WITH PROPER ENDPOINT
  // ============================================
  const loadClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.warn('⚠️ No token found');
        showToast('Please login first', 'warning');
        setLoading(false);
        return;
      }

      console.log('📚 Fetching classes from API...');
      console.log('📍 API Base:', API_BASE);
      
      // Try the main classes endpoint first
      let response = await fetch(`${API_BASE}/classes`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      
      // If 404, try admin endpoint
      if (response.status === 404) {
        console.log('🔄 Main endpoint not found, trying admin endpoint...');
        response = await fetch(`${API_BASE}/admin/classes`, {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('📡 Admin endpoint status:', response.status);
      }
      
      if (!response.ok) {
        if (response.status === 401) {
          showToast('Session expired. Please login again.', 'error');
          localStorage.removeItem('token');
          window.location.href = '/login';
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📚 API Response:', result);
      
      let classData = [];
      
      // Extract data from different response formats
      if (result.success && result.data) {
        classData = result.data;
      } else if (Array.isArray(result)) {
        classData = result;
      } else if (result.classes) {
        classData = result.classes;
      } else if (result.data && Array.isArray(result.data)) {
        classData = result.data;
      }
      
      console.log(`📊 Found ${classData.length} classes`);
      
      if (classData.length === 0) {
        console.warn('⚠️ No classes found');
        setClasses([]);
        showToast('No classes found. Please add classes first.', 'warning');
        setLoading(false);
        return;
      }
      
      // Map classes to ensure we have a valid ID and name field
      const mappedClasses = classData.map(cls => {
        const id = cls.id || cls.class_id || cls.classId || cls.ID;
        const name = cls.class_name || cls.name || cls.className || `Class ${id || 'Unknown'}`;
        return {
          ...cls,
          id: id,
          name: name,
          display_name: `${name}${cls.stream ? ` (${cls.stream})` : ''}`
        };
      }).filter(cls => cls.id !== undefined && cls.id !== null);
      
      console.log(`✅ Loaded ${mappedClasses.length} classes:`, mappedClasses);
      
      setClasses(mappedClasses);
      if (mappedClasses.length === 0) {
        showToast('No classes found. Please add classes first.', 'warning');
      } else {
        showToast(`✅ Loaded ${mappedClasses.length} classes`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Error loading classes:', error);
      showToast('❌ Error loading classes: ' + error.message, 'error');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/teachers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      setTeachers(result.data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadSubjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        setSubjects(result.data || []);
      }
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadTimetable = async () => {
    if (!selectedClass) {
      console.log('ℹ️ Skipping timetable load: no class selected');
      setTimetable([]);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('📥 Loading timetable for class:', selectedClass);
      
      const response = await fetch(`${API_BASE}/timetables/class/${selectedClass}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('📡 Timetable response status:', response.status);
      const result = await response.json();
      console.log('📊 Timetable response:', result);
      
      if (result.success) {
        setTimetable(result.data || []);
      } else {
        setTimetable([]);
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
      setTimetable([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.subject || !formData.day_of_week || !formData.start_time) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let response;
      
      if (editingEntry) {
        response = await fetch(`${API_BASE}/timetables/entry/${editingEntry.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            subject: formData.subject,
            teacher_id: formData.teacher_id || null,
            day_of_week: formData.day_of_week,
            start_time: formData.start_time,
            end_time: formData.end_time,
            room: formData.room
          })
        });
      } else {
        response = await fetch(`${API_BASE}/timetables`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            class_id: selectedClass,
            teacher_id: formData.teacher_id || null,
            subject: formData.subject,
            day_of_week: formData.day_of_week,
            start_time: formData.start_time,
            end_time: formData.end_time,
            room: formData.room,
            term: selectedTerm,
            academic_year: academicYear
          })
        });
      }
      
      const result = await response.json();
      if (result.success) {
        showToast(editingEntry ? 'Entry updated successfully' : 'Entry added successfully');
        setShowForm(false);
        resetForm();
        loadTimetable();
      } else {
        showToast(result.error || 'Error saving entry', 'error');
      }
    } catch (error) {
      console.error('Error saving entry:', error);
      showToast('Error saving timetable entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/timetables/entry/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        showToast('Entry deleted successfully');
        loadTimetable();
      } else {
        showToast(result.error || 'Error deleting entry', 'error');
      }
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast('Error deleting entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const editEntry = (entry) => {
    setEditingEntry(entry);
    setFormData({
      day_of_week: entry.day_of_week,
      start_time: entry.start_time.slice(0, 5),
      end_time: entry.end_time.slice(0, 5),
      subject: entry.subject,
      teacher_id: entry.teacher_id || '',
      room: entry.room || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      day_of_week: 'Monday',
      start_time: '08:00',
      end_time: '09:00',
      subject: '',
      teacher_id: '',
      room: ''
    });
    setEditingEntry(null);
  };

  const clearAllEntries = async () => {
    if (!window.confirm('⚠️ WARNING: This will delete ALL timetable entries for this class. Continue?')) {
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/timetables/class/${selectedClass}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (result.success) {
        showToast(result.message || 'All entries deleted');
        loadTimetable();
      }
    } catch (error) {
      console.error('Error clearing timetable:', error);
      showToast('Error clearing timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getEntryForSlot = (day, time) => {
    return timetable.find(e => 
      e.day_of_week === day && e.start_time === `${time}:00`
    );
  };

  const autoGenerateTimetable = async () => {
    if (!selectedClass) {
      showToast('Please select a class first', 'warning');
      return;
    }
    
    const className = classes.find(c => c.id === selectedClass)?.name || 'Selected Class';
    
    if (!window.confirm(`Auto-generate timetable for ${className}? This will replace existing timetable.`)) {
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/timetables/auto-generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          classId: parseInt(selectedClass),
          term: parseInt(selectedTerm),
          academic_year: academicYear
        })
      });
      const result = await response.json();
      if (result.success) {
        showToast('Timetable generated successfully!');
        loadTimetable();
      } else {
        showToast(result.error || 'Failed to generate timetable', 'error');
      }
    } catch (error) {
      console.error('Error generating timetable:', error);
      showToast('Error generating timetable: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const downloadTimetable = () => {
    if (!selectedClass || timetable.length === 0) {
      showToast('No timetable data to download', 'warning');
      return;
    }

    try {
      const className = classes.find(c => c.id === selectedClass)?.name || 'Class';
      const csvRows = [];
      const headers = ['Time / Day', ...days];
      csvRows.push(headers.join(','));
      
      for (const time of timeSlots) {
        const nextHour = parseInt(time) + 1;
        const row = [`${time} - ${nextHour}:00`];
        for (const day of days) {
          const entry = getEntryForSlot(day, time);
          if (entry) {
            let cellContent = `${entry.subject}`;
            if (entry.room) cellContent += ` (${entry.room})`;
            row.push(`"${cellContent}"`);
          } else {
            row.push('"Free Period"');
          }
        }
        csvRows.push(row.join(','));
      }
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      const date = new Date();
      const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      const filename = `timetable_${className}_term${selectedTerm}_${dateStr}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Timetable downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      showToast('Error downloading timetable', 'error');
    }
  };

  const className = classes.find(c => c.id === selectedClass)?.name || '';

  // Debug reload function
  const reloadClasses = () => {
    console.log('🔄 Manually reloading classes...');
    loadClasses();
  };

  return (
    <div className="timetable-page">
      {/* Page Header */}
      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faCalendarAlt} /> Timetable Management
        </h1>
        <p>Create, edit, and manage class schedules</p>
      </div>

      {/* Toast Message */}
      {toast && (
        <div className={`toast-message ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.message}
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <div className="filters">
          {/* Class Selector */}
          <div className="filter-group">
            <label>Select Class</label>
            <select 
              value={selectedClass} 
              onChange={(e) => {
                const value = e.target.value;
                const parsed = value ? parseInt(value, 10) : '';
                const classId = Number.isNaN(parsed) ? '' : parsed;
                console.log('🧩 Class selected:', value, 'parsed:', classId);
                setSelectedClass(classId);
              }} 
              className="filter-select"
            >
              <option value="">Select Class</option>
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.display_name || cls.name || `Class ${cls.id}`}
                </option>
              ))}
            </select>
            {classes.length === 0 && (
              <span style={{color: 'red', fontSize: '12px', marginLeft: '10px'}}>
                ⚠️ No classes loaded
              </span>
            )}
            {classes.length > 0 && (
              <span style={{color: 'green', fontSize: '12px', marginLeft: '10px'}}>
                ✅ {classes.length} classes loaded
              </span>
            )}
          </div>
          
          {/* Term Selector */}
          <div className="filter-group">
            <label>Term</label>
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)} 
              className="filter-select"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>
          
          {/* Academic Year Input */}
          <div className="filter-group">
            <label>Academic Year</label>
            <input 
              type="text" 
              value={academicYear} 
              onChange={(e) => setAcademicYear(e.target.value)} 
              placeholder="Academic Year"
              className="filter-input"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="action-buttons-group">
            <button 
              className="btn-primary" 
              onClick={loadTimetable} 
              disabled={!selectedClass}
            >
              <FontAwesomeIcon icon={faSync} spin={loading} /> Load
            </button>
            
            <button 
              className="btn-add" 
              onClick={() => { resetForm(); setShowForm(true); }} 
              disabled={!selectedClass}
            >
              <FontAwesomeIcon icon={faPlus} /> Add Entry
            </button>
            
            <button 
              className="btn-generate" 
              onClick={autoGenerateTimetable} 
              disabled={!selectedClass}
            >
              <FontAwesomeIcon icon={faMagic} /> Auto Generate
            </button>
            
            {timetable.length > 0 && (
              <button 
                className="btn-download" 
                onClick={downloadTimetable} 
                title="Download Timetable as CSV"
              >
                <FontAwesomeIcon icon={faDownload} /> Download
              </button>
            )}
            
            <button 
              className="btn-danger" 
              onClick={clearAllEntries} 
              disabled={!selectedClass}
            >
              <FontAwesomeIcon icon={faTrash} /> Clear All
            </button>

            {/* Reload Classes Button */}
            <button 
              className="btn-reload" 
              onClick={reloadClasses} 
              title="Reload Classes"
              style={{
                background: '#8b5cf6', 
                color: 'white', 
                padding: '8px 16px', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer'
              }}
            >
              <FontAwesomeIcon icon={faSync} /> Reload Classes
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => { setShowForm(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="modal-icon">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                </div>
                <div>
                  <h2>{editingEntry ? 'Edit Timetable Entry' : 'Add Timetable Entry'}</h2>
                  <p className="modal-subtitle">
                    {editingEntry ? 'Update timetable entry' : 'Fill in the details to add a new entry'}
                  </p>
                </div>
              </div>
              <button 
                className="modal-close" 
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="modal-body">
              <div className="form-section">
                <div className="section-title">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  <span>Schedule Information</span>
                </div>
                
                {/* Day of Week */}
                <div className="form-group">
                  <label>Day of Week <span className="required">*</span></label>
                  <select 
                    value={formData.day_of_week} 
                    onChange={(e) => setFormData({...formData, day_of_week: e.target.value})} 
                    className="form-select"
                  >
                    {days.map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                
                {/* Time Row */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Start Time <span className="required">*</span></label>
                    <select 
                      value={formData.start_time} 
                      onChange={(e) => setFormData({...formData, start_time: e.target.value})} 
                      className="form-select"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>End Time <span className="required">*</span></label>
                    <select 
                      value={formData.end_time} 
                      onChange={(e) => setFormData({...formData, end_time: e.target.value})} 
                      className="form-select"
                    >
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Subject */}
                <div className="form-group">
                  <label>Subject <span className="required">*</span></label>
                  <input 
                    type="text" 
                    value={formData.subject} 
                    onChange={(e) => setFormData({...formData, subject: e.target.value})} 
                    placeholder="e.g., Mathematics"
                    className="form-input"
                  />
                </div>
                
                {/* Teacher */}
                <div className="form-group">
                  <label>Teacher (Optional)</label>
                  <select 
                    value={formData.teacher_id} 
                    onChange={(e) => setFormData({...formData, teacher_id: e.target.value})} 
                    className="form-select"
                  >
                    <option value="">Select Teacher (Optional)</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.first_name} {teacher.last_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Room Number */}
                <div className="form-group">
                  <label>Room Number</label>
                  <input 
                    type="text" 
                    value={formData.room} 
                    onChange={(e) => setFormData({...formData, room: e.target.value})} 
                    placeholder="e.g., 201" 
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-cancel-modal" 
                onClick={() => { setShowForm(false); resetForm(); }}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-save-modal" 
                onClick={handleSubmit} 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Saving...
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} /> {editingEntry ? 'Update Entry' : 'Save Entry'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Display */}
      {selectedClass && (
        <div className="timetable-container">
          <div className="timetable-header">
            <h2>
              <FontAwesomeIcon icon={faCalendarAlt} /> {className} - Term {selectedTerm} Timetable
              {timetable.length > 0 && (
                <span className="entry-count">({timetable.length} entries)</span>
              )}
            </h2>
          </div>
          
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading timetable...</p>
            </div>
          ) : (
            <div className="timetable-wrapper">
              <table className="timetable-table">
                <thead>
                  <tr>
                    <th>Time / Day</th>
                    {days.map(day => (
                      <th key={day}>{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map(time => (
                    <tr key={time}>
                      <td className="time-cell">
                        <FontAwesomeIcon icon={faClock} /> {time} - {parseInt(time) + 1}:00
                      </td>
                      {days.map(day => {
                        const entry = getEntryForSlot(day, time);
                        return (
                          <td key={`${day}-${time}`}>
                            {entry ? (
                              <div className="timetable-entry">
                                <div className="timetable-subject">
                                  <FontAwesomeIcon icon={faBookOpen} /> {entry.subject}
                                </div>
                                {entry.room && (
                                  <div className="timetable-room">
                                    <FontAwesomeIcon icon={faDoorOpen} /> {entry.room}
                                  </div>
                                )}
                                {entry.teacher_first_name && (
                                  <div className="timetable-teacher">
                                    <FontAwesomeIcon icon={faUserTie} /> {entry.teacher_first_name} {entry.teacher_last_name}
                                  </div>
                                )}
                                <div className="timetable-actions">
                                  <button 
                                    className="btn-edit-entry" 
                                    onClick={() => editEntry(entry)} 
                                    title="Edit"
                                  >
                                    <FontAwesomeIcon icon={faEdit} /> Edit
                                  </button>
                                  <button 
                                    className="btn-delete-entry" 
                                    onClick={() => deleteEntry(entry.id)} 
                                    title="Delete"
                                  >
                                    <FontAwesomeIcon icon={faTrash} /> Delete
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button 
                                className="add-entry-btn"
                                onClick={() => {
                                  resetForm();
                                  setFormData({
                                    ...formData, 
                                    day_of_week: day, 
                                    start_time: time, 
                                    end_time: `${parseInt(time) + 1}:00`
                                  });
                                  setShowForm(true);
                                }}
                              >
                                <FontAwesomeIcon icon={faPlus} /> Add
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* No Class Selected Message */}
      {!selectedClass && (
        <div className="info-message">
          <FontAwesomeIcon icon={faCalendarAlt} /> Select a class to view and manage timetable
        </div>
      )}
    </div>
  );
};

export default TimetablePage;