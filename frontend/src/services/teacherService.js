// frontend/src/services/teacherService.js  ✅ (NOT .jsx)

const API_BASE = 'http://localhost:5000/api';

export const getTeacherStats = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/dashboard/teacher/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const getTeacherClasses = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/dashboard/teacher/classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const getClassStudents = async (classId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/dashboard/teacher/class/${classId}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const saveAttendance = async (classId, date, records) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/dashboard/teacher/attendance`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            class_id: classId,
            date: date,
            attendance_records: records
        })
    });
    return response.json();
};

export const saveMarks = async (classId, examType, records) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/dashboard/teacher/marks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            class_id: classId,
            exam_type: examType,
            marks_records: records
        })
    });
    return response.json();
};

export const getTeacherSubjects = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/dashboard/teacher/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const getTodaySchedule = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/dashboard/teacher/schedule`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};

export const getNotifications = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/dashboard/teacher/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
};