import React, { useState, useEffect } from 'react';
import './Grades.css';

const Grades = ({ API_BASE }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('1');
  const [selectedYear, setSelectedYear] = useState('2024-2025');
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState({});

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const response = await fetch(`${API_BASE}/classes`);
      const result = await response.json();
      setClasses(result.data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const loadClassStudents = async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      // Load students for class
      const studentsResponse = await fetch(`${API_BASE}/students/class/${selectedClass}`);
      const studentsResult = await studentsResponse.json();
      setClassStudents(studentsResult.data || []);

      // Load subjects for class level
      const classResponse = await fetch(`${API_BASE}/classes/${selectedClass}`);
      const classResult = await classResponse.json();
      const classLevel = classResult.data?.level;
      if (classLevel) {
        const subjectsResponse = await fetch(`${API_BASE}/subjects/level/${classLevel}`);
        const subjectsResult = await subjectsResponse.json();
        setSubjects(subjectsResult.data || []);
      }

      // Load existing grades
      const gradesResponse = await fetch(`${API_BASE}/grades?class_id=${selectedClass}&term=${selectedTerm}&academic_year=${selectedYear}`);
      const gradesResult = await gradesResponse.json();
      const existingGrades = gradesResult.data || {};
      
      // Initialize grades state
      const initialGrades = {};
      studentsResult.data.forEach(student => {
        initialGrades[student.id] = {};
        subjectsResult.data.forEach(subject => {
          const existingGrade = existingGrades.find(g => g.student_id === student.id && g.subject === subject.name);
          initialGrades[student.id][subject.name] = { 
            ca: existingGrade?.continuous_assessment || '', 
            exam: existingGrade?.exam_score || '' 
          };
        });
      });
      setGrades(initialGrades);
    } catch (error) {
      console.error('Error loading class:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (studentId, subject, field, value) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: {
          ...prev[studentId][subject],
          [field]: value
        }
      }
    }));
  };

  const saveAllGrades = async () => {
    setLoading(true);
    try {
      for (const studentId of Object.keys(grades)) {
        for (const subject of Object.keys(grades[studentId])) {
          const gradeData = grades[studentId][subject];
          if (gradeData.ca !== '' && gradeData.exam !== '') {
            const ca = parseFloat(gradeData.ca);
            const exam = parseFloat(gradeData.exam);
            
            if (isNaN(ca) || ca < 0 || ca > 40 || isNaN(exam) || exam < 0 || exam > 60) {
              alert(`Invalid grade for ${subject}: CA (0-40), Exam (0-60)`);
              return;
            }

            await fetch(`${API_BASE}/grades`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                student_id: parseInt(studentId),
                subject,
                term: parseInt(selectedTerm),
                academic_year: selectedYear,
                class_id: parseInt(selectedClass),
                continuous_assessment: ca,
                exam_score: exam
              })
            });
          }
        }
      }
      alert('All grades saved!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Save error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="grades-page">
      <div className="section-header">
        <h2>📊 Grade Entry</h2>
        <button className="btn-save-grades" onClick={saveAllGrades} disabled={loading}>
          Save All Grades
        </button>
      </div>

      <div className="filters-row">
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="filter-select">
          <option value="">Select Class</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name} ({cls.level})</option>
          ))}
        </select>
        <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="filter-select">
          <option value="1">Term 1</option>
          <option value="2">Term 2</option>
          <option value="3">Term 3</option>
        </select>
        <input type="text" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} placeholder="Academic Year" className="filter-input" />
        <button className="btn-primary" onClick={loadClassStudents} disabled={loading || !selectedClass}>Load Class</button>
      </div>

      {classStudents.length > 0 && subjects.length > 0 && (
        <div className="grades-grid">
          <div className="subjects-header">
            Students
            {subjects.map(subject => (
              <div key={subject.id} className="subject-header">
                <div>{subject.name}</div>
                <div className="score-type">CA (40)</div>
                <div className="score-type">Exam (60)</div>
              </div>
            ))}
          </div>
          
          <div className="students-grid">
            {classStudents.map(student => (
              <div key={student.id} className="student-row">
                <div className="student-name">{`${student.first_name} ${student.last_name}`}</div>
                {subjects.map(subject => (
                  <>
                    <div className="grade-input">
                      <input
                        type="number"
                        value={grades[student.id]?.[subject.name]?.ca || ''}
                        onChange={(e) => handleGradeChange(student.id, subject.name, 'ca', e.target.value)}
                        max="40"
                        placeholder="CA"
                        className="grade-ca"
                      />
                    </div>
                    <div className="grade-input">
                      <input
                        type="number"
                        value={grades[student.id]?.[subject.name]?.exam || ''}
                        onChange={(e) => handleGradeChange(student.id, subject.name, 'exam', e.target.value)}
                        max="60"
                        placeholder="Exam"
                        className="grade-exam"
                      />
                    </div>
                  </>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Grades;

