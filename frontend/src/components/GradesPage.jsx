import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSave,
  faSpinner,
  faEye, 
  faAngleRight,
  faAngleLeft,
} from '@fortawesome/free-solid-svg-icons';
import ToastNotification from './ToastNotification';
import '../pages/Grades.css';

const EXAM_TYPES = {
  ASSESSMENT: ['CA1', 'CA2', 'CA3'],
  EXAM: ['Exam'],
};

const GradesPage = ({ API_BASE = 'http://localhost:5000/api' }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');

  // multi-subject grading data
  const [subjects, setSubjects] = useState([]); // subject meta
  const [classPayload, setClassPayload] = useState(null);


  const [students, setStudents] = useState([]);

  // view mode: assessments vs exams
  const [mode, setMode] = useState('ASSESSMENT'); // 'ASSESSMENT' | 'EXAM'

  const [selectedTerm, setSelectedTerm] = useState('1');
  const [academicYear, setAcademicYear] = useState('2024-2025');

  // gradeDraft: { [studentId]: { [subjectId]: { CA1?,CA2?,CA3?,Exam? } } }
  const [gradeDraft, setGradeDraft] = useState({});

  const showToast = (message, type = 'success') => setToast({ message, type });
  const hideToast = () => setToast(null);

  const token = useMemo(() => localStorage.getItem('token'), []);
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const classesRes = await fetch(`${API_BASE}/teacher/classes`, { headers });
        const classesData = await classesRes.json();
        if (classesData?.success) setClasses(classesData.data || []);
        else setClasses([]);
      } catch (e) {
        console.error(e);
        showToast('Failed to load classes', 'error');
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/teacher/class/${selectedClass}/grading-subjects?term_id=${encodeURIComponent(selectedTerm)}&academic_year=${encodeURIComponent(academicYear)}`,
          { headers }
        );
        const data = await res.json();
        if (!data?.success) {
          showToast(data?.error || 'Failed to load grading page data', 'error');
          setClassPayload(null);
          setSubjects([]);
          setStudents([]);
          setGradeDraft({});
          return;
        }

        const payload = data.data;
        setClassPayload(payload);
        const subjMeta = (payload?.subjects || []).map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
        }));
        setSubjects(subjMeta);
        setStudents(payload?.students || []);

        // initialize gradeDraft from payload.students[].subjects[]
        const draft = {};
        (payload?.students || []).forEach((st) => {
          draft[st.student_id] = {};
          (st.subjects || []).forEach((subj) => {
            const sid = subj.subject_id;
            draft[st.student_id][sid] = {
              CA1: subj.ca1,
              CA2: subj.ca2,
              CA3: subj.ca3,
              Exam: subj.exam,
            };
          });
        });
        setGradeDraft(draft);
      } catch (e) {
        console.error(e);
        showToast('Failed to load grading data', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedClass, selectedTerm, academicYear]);

  const activeExamTypes = mode === 'ASSESSMENT' ? EXAM_TYPES.ASSESSMENT : EXAM_TYPES.EXAM;

  const handleMarkChange = (studentId, subjectId, examType, marksOrNull) => {
    setGradeDraft((prev) => {
      const next = { ...prev };
      if (!next[studentId]) next[studentId] = {};
      if (!next[studentId][subjectId]) next[studentId][subjectId] = {};
      const existing = next[studentId][subjectId][examType] || null;
      const updated = marksOrNull === null ? null : {
        ...(existing || {}),
        marks: marksOrNull,

        // grade/remarks are optional for now
        grade: existing?.grade ?? null,
        remarks: existing?.remarks ?? null,
      };
      next[studentId] = { ...next[studentId], [subjectId]: { ...next[studentId][subjectId], [examType]: updated } };
      return next;
    });
  };

  const validateDraft = () => {
    // enforce max marks by examType
    const maxByExamType = { CA1: 40, CA2: 40, CA3: 40, Exam: 60 };

    for (const studentId of Object.keys(gradeDraft)) {
      const perSubj = gradeDraft[studentId] || {};
      for (const subjectId of Object.keys(perSubj)) {
        const perExam = perSubj[subjectId] || {};
        for (const examType of activeExamTypes) {
          const entry = perExam[examType];
          if (!entry) continue;
          const v = entry.marks;
          if (v === null || v === undefined || v === '') continue;
          const num = typeof v === 'number' ? v : parseFloat(v);
          if (Number.isNaN(num)) return false;
          const max = maxByExamType[examType];
          if (num > max) {
            showToast(`Marks for ${examType} exceed max (${max}).`, 'error');
            return false;
          }
        }
      }
    }
    return true;
  };

  const saveGrades = async () => {
    if (!selectedClass) {
      showToast('Select a class first', 'warning');
      return;
    }
    if (!validateDraft()) return;

    setSaving(true);
    try {
      // Build grades[] payload for activeExamTypes only
      const grades = [];
      for (const st of students) {
        const studentId = st.student_id;
        const perSubj = gradeDraft?.[studentId] || {};
        for (const subj of subjects) {
          const subjectId = subj.id;
          const perExam = perSubj?.[subjectId] || {};
          for (const examType of activeExamTypes) {
            const entry = perExam?.[examType];
            // Save empty as null (upsert will clear)
            const marks = entry?.marks === null || entry?.marks === undefined || entry?.marks === '' ? null : parseFloat(entry.marks);
            const gradeLetter = entry?.grade || null;
            const remarks = entry?.remarks || null;

            grades.push({
              student_id: studentId,
              subject_id: subjectId,
              exam_type: examType,
              marks,
              grade: gradeLetter,
              remarks,
            });
          }
        }
      }

      const res = await fetch(`${API_BASE}/teacher/grades/save`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: parseInt(selectedClass),
          term_id: parseInt(selectedTerm),
          academic_year: academicYear,
          grades,
        }),
      });

      const data = await res.json();
      if (!data?.success) {
        showToast(data?.error || 'Failed to save grades', 'error');
        return;
      }

      showToast(`Saved ${data?.data?.saved_count ?? 'grades'} successfully`, 'success');

      // reload to refresh computed grade data
      // trigger effect by setting selectedClass same; easiest: re-fetch
      setSelectedClass('');
      setTimeout(() => setSelectedClass(students?.length ? selectedClass : selectedClass), 0);
    } catch (e) {
      console.error(e);
      showToast('Network error while saving', 'error');
    } finally {
      setSaving(false);
    }
  };

  const viewReport = async (studentId) => {
    try {
      const res = await fetch(
        `${API_BASE}/grades/report-card/${studentId}?term=${selectedTerm}&academic_year=${academicYear}`,
        { headers: { ...headers } }
      );
      const data = await res.json();
      if (!data?.success) {
        showToast(data?.error || 'No report found', 'warning');
        return;
      }
      const win = window.open('', '_blank');
      win.document.write(`
        <html><head><title>Report Card</title></head>
        <body><pre>${JSON.stringify(data.data, null, 2)}</pre></body>
        </html>
      `);
    } catch (e) {
      console.error(e);
      showToast('Error generating report', 'error');
    }
  };

  return (
    <div className="grades-page">
      <div className="grades-filters">
        <div className="filter-group">
          <label>Class</label>
          <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.class_name || c.name || c.id}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Term</label>
          <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)}>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
            <option value="3">Term 3</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Academic Year</label>
          <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} />
        </div>
      </div>

      {/* Mode switch: assessments first, then exam */}
      {selectedClass ? (
        <div className="section-header" style={{ marginTop: 16 }}>
          <h2>{mode === 'ASSESSMENT' ? 'Assessments (CA1/CA2/CA3)' : 'Exam Scores'}</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              className="btn-save-all"
              onClick={() => setMode('ASSESSMENT')}
              disabled={mode === 'ASSESSMENT'}
            >

              <FontAwesomeIcon icon={faAngleLeft} /> CA Entry
            </button>
            <button
              type="button"
              className="btn-save-all"
              onClick={() => setMode('EXAM')}
              disabled={mode === 'EXAM'}
            >

              Exam Entry <FontAwesomeIcon icon={faAngleRight} />
            </button>
            <button className="btn-save-all" onClick={saveGrades} disabled={loading || saving}>
              <FontAwesomeIcon icon={saving ? faSpinner : faSave} spin={saving} />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="loading-state" style={{ marginTop: 24 }}>
          <FontAwesomeIcon icon={faSpinner} spin /> Loading...
        </div>
      ) : selectedClass && students.length ? (
        <div className="table-responsive" style={{ marginTop: 12 }}>



          {/* Simple wide table: per subject, show each examType mark in its own column */}
          <table className="grades-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Admission No</th>
                {subjects.map((s) =>
                  activeExamTypes.map((t) => (
                    <th key={`${s.id}-${t}`}>
                      {s.name} ({t})
                    </th>
                  ))
                )}
                <th>Report</th>
              </tr>
            </thead>
            <tbody>
              {students.map((st) => {
                return (
                  <tr key={st.student_id}>
                    <td>{st.first_name} {st.last_name}</td>
                    <td>{st.admission_number}</td>
                    {subjects.map((s) => (
                      activeExamTypes.map((t) => {
                        const entry = gradeDraft?.[st.student_id]?.[s.id]?.[t];
                        const value = entry?.marks ?? '';
                        const max = t.startsWith('CA') ? 40 : 60;
                        return (
                          <td key={`${st.student_id}-${s.id}-${t}`}>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max={max}
                              value={value}
                              onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === '') {
                                  handleMarkChange(st.student_id, s.id, t, null);
                                  return;
                                }
                                const num = parseFloat(raw);
                                handleMarkChange(st.student_id, s.id, t, Number.isNaN(num) ? null : num);
                              }}
                            />
                          </td>
                        );
                      })
                    ))}
                    <td>
                      <button className="btn-view-report" onClick={() => viewReport(st.student_id)}>
                        <FontAwesomeIcon icon={faEye} /> View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="info-message" style={{ marginTop: 20 }}>
          <FontAwesomeIcon icon={faEye} />
          <p>Select a class to begin entering grades.</p>
        </div>
      )}

      {toast && <ToastNotification message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  );
};

export default GradesPage;

