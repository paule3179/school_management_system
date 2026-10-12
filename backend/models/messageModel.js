const pool = require('../config/database');

class MessageModel {
  async getAllMessages(_filters = {}, user) {
    const result = await pool.query(`
      SELECT m.*, m.message AS content,
             CONCAT_WS(' ', sender.first_name, sender.last_name) AS sender_name
      FROM messages m
      LEFT JOIN users sender ON sender.id = m.sender_id
      WHERE ($1 = 'admin' OR m.sender_id = $2 OR m.receiver_id = $2
             OR (m.receiver_type = 'broadcast' AND $1 = 'parent'))
      ORDER BY m.sent_at DESC, m.id DESC
    `, [user.role, user.id]);
    return result.rows;
  }

  async getMessageById(id, user) {
    const result = await pool.query(`
      SELECT m.*, m.message AS content,
             CONCAT_WS(' ', sender.first_name, sender.last_name) AS sender_name
      FROM messages m
      LEFT JOIN users sender ON sender.id = m.sender_id
      WHERE m.id = $1
        AND ($2 = 'admin' OR m.sender_id = $3 OR m.receiver_id = $3
             OR (m.receiver_type = 'broadcast' AND $2 = 'parent'))
    `, [id, user.role, user.id]);
    return result.rows[0] || null;
  }

  async sendMessage(data, sender) {
    const receiver = data.to ?? data.receiver_id;
    if (!receiver || typeof data.subject !== 'string' || !data.subject.trim() ||
        typeof (data.content ?? data.message) !== 'string' || !(data.content ?? data.message).trim()) {
      throw new Error('Recipient, subject, and message are required');
    }

    let receiverId = Number(receiver);
    let receiverType = data.receiver_type || 'user';
    if (data.to !== undefined && sender.role === 'parent') {
      const teacher = await pool.query('SELECT user_id FROM teachers WHERE id = $1', [receiverId]);
      if (!teacher.rows[0]?.user_id) throw new Error('Teacher not found');
      receiverId = teacher.rows[0].user_id;
      receiverType = 'teacher';
    }
    if (!Number.isInteger(receiverId) || receiverId <= 0) throw new Error('Invalid recipient');

    const result = await pool.query(`
      INSERT INTO messages (sender_id, sender_type, receiver_id, receiver_type, subject, message, priority)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *, message AS content
    `, [sender.id, sender.role, receiverId, receiverType, data.subject.trim(),
      (data.content ?? data.message).trim(), data.priority || 'normal']);
    return result.rows[0];
  }

  async markAsRead(id, user) {
    const result = await pool.query(`
      UPDATE messages
      SET read_at = CURRENT_TIMESTAMP, status = 'read'
      WHERE id = $1 AND (receiver_id = $2 OR ($3 = 'parent' AND receiver_type = 'broadcast'))
      RETURNING *, message AS content
    `, [id, user.id, user.role]);
    return result.rows[0] || null;
  }

  async getUnreadCount(user) {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS unread_count
      FROM messages
      WHERE read_at IS NULL
        AND (receiver_id = $1 OR ($2 = 'parent' AND receiver_type = 'broadcast'))
    `, [user.id, user.role]);
    return result.rows[0].unread_count;
  }

  async getAllAnnouncements(user = { role: 'student', allowedClassIds: [] }) {
    const role = user.role || 'student';
    const audience = { teacher: 'teachers', parent: 'parents', student: 'students' }[role] || role;
    const result = await pool.query(`
      SELECT * FROM announcements
      WHERE (expiry_date IS NULL OR expiry_date >= CURRENT_DATE)
        AND (audience = 'all' OR audience = $1)
        AND ($3 = 'admin' OR class_id IS NULL OR class_id = ANY($2::int[]))
      ORDER BY posted_date DESC, id DESC
    `, [audience, user.allowedClassIds || [], role]);
    return result.rows;
  }

  async createAnnouncement(data, user) {
    if (typeof data.title !== 'string' || !data.title.trim() ||
        typeof (data.content ?? data.message) !== 'string' || !(data.content ?? data.message).trim()) {
      throw new Error('Title and announcement content are required');
    }
    const audience = data.audience || 'all';
    const targetAudience = Array.isArray(data.target_audience) ? data.target_audience : [audience];
    const result = await pool.query(`
      INSERT INTO announcements (title, content, posted_by, author_id, expiry_date, target_audience, status, type, audience, class_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [data.title.trim(), (data.content ?? data.message).trim(), user.role, user.id,
      data.expiry_date || null, targetAudience,
      data.status || 'published', data.type || 'general', audience, data.class_id || null]);
    return result.rows[0];
  }

  async updateAnnouncement(id, data, user) {
    const fields = ['title', 'content', 'status', 'type', 'audience', 'class_id', 'expiry_date'];
    const updates = fields.filter(field => data[field] !== undefined);
    if (updates.length === 0) return null;
    const values = updates.map(field => data[field]);
    const setters = updates.map((field, index) => `${field} = $${index + 1}`);
    values.push(id, user.role, user.id);
    const result = await pool.query(`
      UPDATE announcements SET ${setters.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length - 2} AND ($${values.length - 1} = 'admin' OR author_id = $${values.length})
      RETURNING *
    `, values);
    return result.rows[0] || null;
  }

  async deleteAnnouncement(id, user) {
    const result = await pool.query(`
      DELETE FROM announcements
      WHERE id = $1 AND ($2 = 'admin' OR author_id = $3)
      RETURNING id
    `, [id, user.role, user.id]);
    return result.rowCount > 0;
  }
}

module.exports = new MessageModel();
