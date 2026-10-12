import { apiFetch } from '../../services/api.js';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ExamEntry from './components/ExamEntry';

const ExamEntryPage = ({ API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api') }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [, setTeacherClasses] = useState([]);
  const [, setSelectedClass] = useState(null);

  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [gradeDraft, setGradeDraft] = useState({});

  const token = localStorage.getItem('token');

  const fetchJson = async (url, options = {}) => {
    const res = await apiFetch(url, {
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
        console.error('Failed to load exam entry page:', e);
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

    const draft = {};
    nextStudents.forEach((student) => {
      draft[student.student_id] = {};
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

  const onGradeUpdate = (studentId, subjectId, field, value) => {
    setGradeDraft((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      if (!next[studentId][subjectId]) next[studentId][subjectId] = { CA1: null, CA2: null, CA3: null, Exam: null };
      next[studentId] = { ...next[studentId], [subjectId]: { ...next[studentId][subjectId], [field]: value } };
      return next;
    });
  };

  const calculateAverage = (studentId) => {
    // CA avg = avg(CA1,CA2,CA3) across all subjects, then combined with exam weight.
    // In this UI component, it expects a percentage-like number.
    // We'll use: ((CA1+CA2+CA3)/120)*60 + (Exam/60)*40
    let caSum = 0;
    let caCount = 0;
    let examSum = 0;
    let examCount = 0;

    subjects.forEach((subject) => {
      // The draft uses subject.subject_id, but ExamEntry indexes by subject.id.
      // So prefer both keys.
      const subjKey = subject.id ?? subject.subject_id;
      const draftForSubj = gradeDraft[studentId]?.[subjKey] || {};

      ['CA1', 'CA2', 'CA3'].forEach((k) => {
        const v = draftForSubj[k];
        if (v !== null && v !== undefined) {
          caSum += Number(v);
          caCount += 1;
        }
      });
      const examV = draftForSubj['Exam'];
      if (examV !== null && examV !== undefined) {
        examSum += Number(examV);
        examCount += 1;
      }
    });

    const caAvg = caCount > 0 ? caSum / caCount : 0; // 0..40
    const examAvg = examCount > 0 ? examSum / examCount : 0; // 0..60

    const caPercentOfTotal = (caAvg / 40) * 60;
    const examPercentOfTotal = (examAvg / 60) * 40;
    return caPercentOfTotal + examPercentOfTotal;
  };

  const calculateGrade = (score) => {
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  };

  const onViewReport = (studentId) => {
    console.log('View report for student:', studentId);
  };

  const onBack = () => {
    navigate('/teacher/grades/ca-entry');
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading exam scores...</div>;
  }

  return (
    <ExamEntry
      students={students}
      subjects={subjects}
      gradeDraft={gradeDraft}
      onGradeUpdate={onGradeUpdate}
      onViewReport={onViewReport}
      onBack={onBack}
      calculateAverage={calculateAverage}
      calculateGrade={calculateGrade}
    />
  );
};

export default ExamEntryPage;

