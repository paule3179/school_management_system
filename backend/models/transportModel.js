const pool = require('../config/database');

class TransportModel {
  async getAllVehicles(filters = {}) {
    const values = [];
    const where = [];
    for (const field of ['status', 'type']) {
      if (filters[field]) { values.push(filters[field]); where.push(`${field} = $${values.length}`); }
    }
    const result = await pool.query(`SELECT * FROM vehicles ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY registration_number`, values);
    return result.rows;
  }

  async getVehicleById(id) {
    const result = await pool.query(`
      SELECT v.*, r.name AS assigned_route,
             (SELECT COUNT(*)::int FROM transport_assignments a WHERE a.vehicle_id = v.id AND a.status = 'active') AS assignments_count
      FROM vehicles v LEFT JOIN transport_routes r ON r.vehicle_id = v.id
      WHERE v.id = $1
    `, [id]);
    if (!result.rows[0]) return null;
    return { ...result.rows[0], route: result.rows[0].assigned_route || 'Not assigned' };
  }

  async createVehicle(data) {
    const result = await pool.query(`
      INSERT INTO vehicles (registration_number, driver_name, driver_phone, capacity, type, status, maintenance_due, insurance_expiry)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
    `, [data.registration_number, data.driver_name, data.driver_phone || null, data.capacity,
      data.type || null, data.status || 'active', data.maintenance_due || null, data.insurance_expiry || null]);
    return result.rows[0];
  }

  async updateVehicle(id, data) {
    return this.updateByFields('vehicles', id, data, ['registration_number', 'driver_name', 'driver_phone', 'capacity', 'type', 'status', 'maintenance_due', 'insurance_expiry']);
  }

  async deleteVehicle(id) {
    const active = await pool.query("SELECT 1 FROM transport_assignments WHERE vehicle_id = $1 AND status = 'active' LIMIT 1", [id]);
    if (active.rows.length) throw new Error('Cannot delete a vehicle with active assignments');
    const result = await pool.query('DELETE FROM vehicles WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  async getAllRoutes(filters = {}) {
    const values = [];
    let where = '';
    if (filters.active !== undefined) { values.push(filters.active === 'true'); where = `WHERE r.active = $1`; }
    const result = await pool.query(`
      SELECT r.*, v.registration_number, v.driver_name,
             (SELECT COUNT(*)::int FROM transport_assignments a WHERE a.route_id = r.id AND a.status = 'active') AS students_count
      FROM transport_routes r LEFT JOIN vehicles v ON v.id = r.vehicle_id
      ${where} ORDER BY r.name
    `, values);
    return result.rows;
  }

  async getRouteById(id) {
    const route = await pool.query(`
      SELECT r.*, v.registration_number, v.driver_name, v.driver_phone, v.capacity
      FROM transport_routes r LEFT JOIN vehicles v ON v.id = r.vehicle_id WHERE r.id = $1
    `, [id]);
    if (!route.rows[0]) return null;
    const students = await this.getRouteStudents(id);
    return { ...route.rows[0], vehicle_info: route.rows[0].vehicle_id ? route.rows[0] : null,
      students_count: students.length, students_list: students.map(student => student.name) };
  }

  async createRoute(data) {
    const result = await pool.query(`
      INSERT INTO transport_routes (name, stops, morning_pickup, afternoon_dropoff, vehicle_id, active)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [data.name, Array.isArray(data.stops) ? data.stops : [], data.morning_pickup || null,
      data.afternoon_dropoff || null, data.vehicle_id || null, data.active ?? true]);
    return result.rows[0];
  }

  async updateRoute(id, data) {
    return this.updateByFields('transport_routes', id, data, ['name', 'stops', 'morning_pickup', 'afternoon_dropoff', 'vehicle_id', 'active']);
  }

  async deleteRoute(id) {
    const history = await pool.query('SELECT 1 FROM transport_assignments WHERE route_id = $1 LIMIT 1', [id]);
    if (history.rows.length) throw new Error('Cannot delete a route with transport assignment history');
    const result = await pool.query('DELETE FROM transport_routes WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  async assignStudent(data) {
    if (!data.student_id || !data.route_id || !data.academic_year) {
      throw new Error('Student, route, and academic year are required');
    }
    const result = await pool.query(`
      INSERT INTO transport_assignments (student_id, route_id, vehicle_id, pickup_point, dropoff_point, status, term, academic_year)
      VALUES ($1,$2,$3,$4,$5,'active',$6,$7)
      ON CONFLICT (student_id, term, academic_year)
      DO UPDATE SET route_id = EXCLUDED.route_id, vehicle_id = EXCLUDED.vehicle_id,
        pickup_point = EXCLUDED.pickup_point, dropoff_point = EXCLUDED.dropoff_point,
        status = 'active', ended_at = NULL
      RETURNING *
    `, [data.student_id, data.route_id, data.vehicle_id || null, data.pickup_point || null,
      data.dropoff_point || null, data.term || 1, data.academic_year || null]);
    return result.rows[0];
  }

  async removeAssignment(id) {
    const result = await pool.query(`
      UPDATE transport_assignments SET status = 'inactive', ended_at = CURRENT_DATE
      WHERE id = $1 AND status = 'active' RETURNING id
    `, [id]);
    return result.rowCount > 0;
  }

  async getStudentTransport(studentId, term, academicYear) {
    const result = await pool.query(`
      SELECT CONCAT_WS(' ', s.first_name, s.last_name) AS student,
             r.name AS route, a.pickup_point, a.dropoff_point,
             r.morning_pickup, r.afternoon_dropoff,
             json_build_object('registration', v.registration_number,
               'driver', v.driver_name, 'driver_phone', v.driver_phone) AS vehicle
      FROM transport_assignments a
      JOIN students s ON s.id = a.student_id
      JOIN transport_routes r ON r.id = a.route_id
      LEFT JOIN vehicles v ON v.id = a.vehicle_id
      WHERE a.student_id = $1 AND a.term = $2 AND a.academic_year = $3 AND a.status = 'active'
      ORDER BY a.id DESC LIMIT 1
    `, [studentId, term, academicYear]);
    return result.rows[0] || null;
  }

  async getRouteStudents(routeId) {
    const result = await pool.query(`
      SELECT s.id, CONCAT_WS(' ', s.first_name, s.last_name) AS name,
             s.admission_number, a.pickup_point, a.dropoff_point, s.parent_phone
      FROM transport_assignments a JOIN students s ON s.id = a.student_id
      WHERE a.route_id = $1 AND a.status = 'active'
      ORDER BY s.last_name, s.first_name
    `, [routeId]);
    return result.rows;
  }

  async updateByFields(table, id, data, allowedFields) {
    const fields = allowedFields.filter(field => data[field] !== undefined);
    if (!fields.length) {
      const result = await pool.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      return result.rows[0] || null;
    }
    const values = fields.map(field => data[field]);
    values.push(id);
    const result = await pool.query(`
      UPDATE ${table} SET ${fields.map((field, index) => `${field} = $${index + 1}`).join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${values.length} RETURNING *
    `, values);
    return result.rows[0] || null;
  }
}

module.exports = new TransportModel();
