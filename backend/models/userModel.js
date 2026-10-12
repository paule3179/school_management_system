const bcrypt = require('bcrypt');
const pool = require('../config/database');

const safeColumns = 'id, email, first_name, last_name, phone, role, status, last_login, created_at, updated_at';

class UserModel {
  async getAllUsers(filters = {}) {
    const values = [];
    const conditions = [];
    for (const field of ['role', 'status']) {
      if (filters[field]) { values.push(filters[field]); conditions.push(`${field} = $${values.length}`); }
    }
    const result = await pool.query(`SELECT ${safeColumns} FROM users ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC`, values);
    return result.rows;
  }

  async getUserById(id) {
    const result = await pool.query(`SELECT ${safeColumns} FROM users WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async getUserByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return result.rows[0] || null;
  }

  async createUser(data) {
    if (!data.email || !data.password || !data.role) throw new Error('Email, password, and role are required');
    const password = await bcrypt.hash(data.password, 10);
    const result = await pool.query(`
      INSERT INTO users (email, password, first_name, last_name, phone, role, status)
      VALUES ($1,$2,$3,$4,$5,$6,'active')
      RETURNING ${safeColumns}
    `, [data.email.trim().toLowerCase(), password, data.first_name || null,
      data.last_name || null, data.phone || null, data.role]);
    return result.rows[0];
  }

  async updateUser(id, data) {
    const fields = ['email', 'first_name', 'last_name', 'phone', 'role', 'status'];
    const updates = fields.filter(field => data[field] !== undefined);
    const values = updates.map(field => field === 'email' ? String(data[field]).trim().toLowerCase() : data[field]);
    if (data.password) {
      updates.push('password');
      values.push(await bcrypt.hash(data.password, 10));
    }
    if (!updates.length) return this.getUserById(id);
    const assignments = updates.map((field, index) => `${field} = $${index + 1}`);
    assignments.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query(`UPDATE users SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING ${safeColumns}`, values);
    return result.rows[0] || null;
  }

  async deleteUser(id) {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  async verifyPassword(email, password) {
    const user = await this.getUserByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) return null;
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  async updateLastLogin(id) {
    const result = await pool.query(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING ${safeColumns}`, [id]);
    return result.rows[0] || null;
  }

  async getUsersByRole(role) {
    const result = await pool.query(`SELECT ${safeColumns} FROM users WHERE role = $1 ORDER BY last_name, first_name`, [role]);
    return result.rows;
  }
}

module.exports = new UserModel();
