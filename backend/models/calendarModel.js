const pool = require('../config/database');

const editableFields = [
  'title', 'description', 'event_type', 'start_date', 'end_date',
  'start_time', 'end_time', 'venue', 'target_audience', 'status'
];

class CalendarModel {
  async getAllEvents(filters = {}) {
    const conditions = [];
    const values = [];

    for (const field of ['event_type', 'status']) {
      if (filters[field]) {
        values.push(filters[field]);
        conditions.push(`${field} = $${values.length}`);
      }
    }
    if (filters.start_date) {
      values.push(filters.start_date);
      conditions.push(`end_date >= $${values.length}`);
    }
    if (filters.end_date) {
      values.push(filters.end_date);
      conditions.push(`start_date <= $${values.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(
      `SELECT * FROM calendar_events ${where} ORDER BY start_date, start_time, id`,
      values
    );
    return result.rows;
  }

  async getEventById(id) {
    const result = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async createEvent(data) {
    const result = await pool.query(`
      INSERT INTO calendar_events (
        title, description, event_type, start_date, end_date,
        start_time, end_time, venue, target_audience, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      data.title, data.description || null, data.event_type,
      data.start_date, data.end_date || data.start_date,
      data.start_time || null, data.end_time || null, data.venue || null,
      Array.isArray(data.target_audience) ? data.target_audience : ['all'],
      data.status || 'upcoming', data.created_by || null
    ]);
    return result.rows[0];
  }

  async updateEvent(id, data) {
    const fields = editableFields.filter(field => data[field] !== undefined);
    if (fields.length === 0) return this.getEventById(id);

    const assignments = fields.map((field, index) => `${field} = $${index + 1}`);
    const values = fields.map(field => data[field]);
    values.push(id);
    const result = await pool.query(`
      UPDATE calendar_events
      SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length}
      RETURNING *
    `, values);
    return result.rows[0] || null;
  }

  async deleteEvent(id) {
    const result = await pool.query('DELETE FROM calendar_events WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  async getUpcomingEvents(days = 30) {
    const result = await pool.query(`
      SELECT * FROM calendar_events
      WHERE start_date >= CURRENT_DATE
        AND start_date <= CURRENT_DATE + ($1::int * INTERVAL '1 day')
        AND status <> 'completed'
      ORDER BY start_date, start_time, id
    `, [days]);
    return result.rows;
  }

  async getEventTypes() {
    const result = await pool.query(`
      SELECT DISTINCT event_type
      FROM calendar_events
      WHERE event_type IS NOT NULL AND event_type <> ''
      ORDER BY event_type
    `);
    return result.rows.map(row => row.event_type);
  }
}

module.exports = new CalendarModel();
