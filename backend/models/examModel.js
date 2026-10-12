const pool = require('../config/database');

const fields = ['name', 'term', 'term_name', 'academic_year', 'start_date', 'end_date', 'status', 'classes_involved'];

class ExamModel {
  async getAllExams(filters = {}) {
    const values = [];
    const where = [];
    for (const field of ['term', 'status', 'academic_year']) {
      if (filters[field] !== undefined && filters[field] !== '') {
        values.push(filters[field]);
        where.push(`${field} = $${values.length}`);
      }
    }
    const result = await pool.query(
      `SELECT * FROM exams ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY start_date DESC, id DESC`,
      values
    );
    return result.rows;
  }

  async getExamById(id) {
    const result = await pool.query(`
      SELECT e.*,
        COALESCE((SELECT json_agg(json_build_object(
          'id', et.id, 'exam_id', et.exam_id, 'class_id', et.class_id,
          'class_name', c.class_name, 'subject', et.subject, 'date', et.date,
          'time', et.time, 'venue', et.venue
        ) ORDER BY et.date, et.time) FROM exam_timetables et
          LEFT JOIN classes c ON c.id = et.class_id WHERE et.exam_id = e.id), '[]'::json) AS timetable
      FROM exams e WHERE e.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async createExam(data) {
    const result = await pool.query(`
      INSERT INTO exams (name, term, term_name, academic_year, start_date, end_date, status, classes_involved)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [data.name, data.term, data.term_name || null, data.academic_year,
      data.start_date, data.end_date, data.status || 'upcoming',
      Array.isArray(data.classes_involved) ? data.classes_involved.map(Number) : []]);
    return result.rows[0];
  }

  async updateExam(id, data) {
    const updateFields = fields.filter(field => data[field] !== undefined);
    if (updateFields.length === 0) return this.getExamById(id);
    const values = updateFields.map(field => field === 'classes_involved' && Array.isArray(data[field])
      ? data[field].map(Number) : data[field]);
    const assignments = updateFields.map((field, index) => `${field} = $${index + 1}`);
    values.push(id);
    const result = await pool.query(`
      UPDATE exams SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length} RETURNING *
    `, values);
    return result.rows[0] || null;
  }

  async deleteExam(id) {
    const result = await pool.query('DELETE FROM exams WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  async getExamTimetable(examId) {
    const exam = await pool.query('SELECT id, name, start_date, end_date FROM exams WHERE id = $1', [examId]);
    if (!exam.rows[0]) return null;
    const entries = await pool.query(`
      SELECT et.*, c.class_name
      FROM exam_timetables et LEFT JOIN classes c ON c.id = et.class_id
      WHERE et.exam_id = $1 ORDER BY et.date, et.time
    `, [examId]);
    return { exam: exam.rows[0], timetable: entries.rows };
  }

  async addExamTimetableEntry(data) {
    const result = await pool.query(`
      INSERT INTO exam_timetables (exam_id, class_id, subject, date, time, venue)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [data.exam_id, data.class_id, data.subject, data.date, data.time, data.venue || null]);
    return result.rows[0];
  }

  async getStudentExamResults(studentId, examId) {
    const result = await pool.query(`
      SELECT s.id AS student_id, s.first_name, s.last_name, s.admission_number,
             s.class_id, e.id AS exam_id, e.name AS exam_name, e.term,
             e.academic_year, g.*
      FROM students s CROSS JOIN exams e
      LEFT JOIN grades g ON g.student_id = s.id
        AND g.term = e.term AND g.academic_year = e.academic_year
      WHERE s.id = $1 AND e.id = $2
      ORDER BY g.subject
    `, [studentId, examId]);
    if (result.rows.length === 0) return null;
    const first = result.rows[0];
    const grades = result.rows.filter(row => row.id !== null);
    const totalScore = grades.reduce((sum, grade) => sum + Number(grade.total_score || grade.score || 0), 0);
    return {
      student: { name: `${first.first_name} ${first.last_name}`, admission_number: first.admission_number, class: first.class_id },
      exam: { name: first.exam_name, term: first.term, academic_year: first.academic_year },
      results: grades,
      summary: {
        total_subjects: grades.length,
        total_score: totalScore.toFixed(2),
        average_score: (grades.length ? totalScore / grades.length : 0).toFixed(2)
      }
    };
  }
}

module.exports = new ExamModel();
