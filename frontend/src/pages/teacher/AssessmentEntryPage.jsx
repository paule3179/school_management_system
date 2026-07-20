import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AssessmentEntry from './components/AssessmentEntry';

const AssessmentEntryPage = ({ API_BASE = 'http://localhost:5000/api' }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [gradeDraft, setGradeDraft] = useState({});

  const token = localStorage.getItem('token');

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
    return res.json();
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchJson(`${API_BASE}/teacher/classes`);
        if (data?.success) {
          const classes = data.data || [];
          setTeacherClasses(classes);
          if (classes.length > 0) {
            const cls = classes[0];
            setSelectedClass(cls);
            await loadClassData(cls.id);
          }
        }
      } catch (e) {
        console.error('Failed to load assessment entry page:', e);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClassData = async (classId) => {
    const data = await fetchJson(
      `${API_BASE}/teacher/class/${classId}/grading-subjects`
    );

    if (!data?.success) return;

    const payload = data.data || {};
    const nextStudents = payload.students || [];
    const nextSubjects = payload.subjects || [];

    setStudents(nextStudents);
    setSubjects(nextSubjects);

    // initialize gradeDraft[studentId][subjectId] = { CA1, CA2, CA3, Exam }
    const draft = {};
    nextStudents.forEach((student) => {
      draft[student.student_id] = {};
      (student.subjects || []).forEach(() => {});
    });

    // The API may not include per-student subject blobs; subjects is global.
    nextStudents.forEach((student) => {
      nextSubjects.forEach((subject) => {
        draft[student.student_id][subject.subject_id] = {
          CA1: subject.ca1 ?? null,
          CA2: subject.ca2 ?? null,
          CA3: subject.ca3 ?? null,
          Exam: subject.exam ?? null
        };
      });
    });

    setGradeDraft(draft);
  };

  const onGradeUpdate = (studentId, subjectId, caType, value) => {
    setGradeDraft((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      if (!next[studentId][subjectId]) next[studentId][subjectId] = { CA1: null, CA2: null, CA3: null, Exam: null };
      next[studentId] = { ...next[studentId], [subjectId]: { ...next[studentId][subjectId], [caType]: value } };
      return next;
    });
  };

  const onViewReport = (studentId) => {
    // If you later implement report views, navigate there.
    console.log('View report for student:', studentId);
  };

  const onNext = () => {
    navigate('/teacher/grades/exam-entry');
  };

  if (loading) {
    return (
      <div style={{ padding: 24 }}>Loading continuous assessment...</div>
    );
  }

  return (
    <AssessmentEntry
      students={students}
      subjects={subjects}
      gradeDraft={gradeDraft}
      onGradeUpdate={onGradeUpdate}
      onViewReport={onViewReport}
      onNext={onNext}
    />
  );
};

export default AssessmentEntryPage;

