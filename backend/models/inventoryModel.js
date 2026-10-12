const pool = require('../config/database');

class InventoryModel {
  async getAllItems(filters = {}) {
    const values = [];
    const where = [];
    for (const field of ['category', 'status', 'condition']) {
      if (filters[field]) { values.push(filters[field]); where.push(`${field} = $${values.length}`); }
    }
    const result = await pool.query(`
      SELECT * FROM inventory_items ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY name
    `, values);
    return result.rows;
  }

  async getItemById(id) {
    const item = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);
    if (!item.rows[0]) return null;
    const transactions = await pool.query('SELECT * FROM inventory_transactions WHERE item_id = $1 ORDER BY date DESC, id DESC', [id]);
    return { ...item.rows[0], transactions: transactions.rows };
  }

  async createItem(data) {
    const quantity = Number(data.quantity);
    const price = Number(data.unit_price);
    if (typeof data.name !== 'string' || !data.name.trim() || !Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(price) || price < 0) {
      throw new Error('Name, non-negative quantity, and non-negative unit price are required');
    }
    const result = await pool.query(`
      INSERT INTO inventory_items (
        name, category, quantity, unit, unit_price, total_value, location,
        supplier, purchase_date, condition, last_inventory_date, status, notes, minimum_quantity
      ) VALUES ($1,$2,$3,$4,$5,$3 * $5,$6,$7,$8,$9,CURRENT_DATE,$10,$11,$12)
      RETURNING *
    `, [data.name.trim(), data.category || null, quantity, data.unit || 'units', price,
      data.location || null, data.supplier || null, data.purchase_date || null,
      data.condition || 'good', data.status || 'in_stock', data.notes || null,
      Number.isInteger(Number(data.minimum_quantity)) ? Number(data.minimum_quantity) : 0]);
    return result.rows[0];
  }

  async updateItem(id, data) {
    const fields = ['name', 'category', 'quantity', 'unit', 'unit_price', 'location', 'supplier', 'purchase_date', 'condition', 'status', 'notes', 'minimum_quantity'];
    const updates = fields.filter(field => data[field] !== undefined);
    if (!updates.length) return this.getItemById(id);
    const values = updates.map(field => data[field]);
    const sets = updates.map((field, index) => `${field} = $${index + 1}`);
    if (updates.includes('quantity') || updates.includes('unit_price')) {
      const quantityExpression = updates.includes('quantity') ? `$${updates.indexOf('quantity') + 1}` : 'quantity';
      const priceExpression = updates.includes('unit_price') ? `$${updates.indexOf('unit_price') + 1}` : 'unit_price';
      sets.push(`total_value = ${quantityExpression} * ${priceExpression}`);
    }
    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await pool.query(`UPDATE inventory_items SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`, values);
    return result.rows[0] || null;
  }

  async deleteItem(id) {
    const hasHistory = await pool.query('SELECT 1 FROM inventory_transactions WHERE item_id = $1 LIMIT 1', [id]);
    if (hasHistory.rows.length) throw new Error('Cannot delete an item with transaction history');
    const result = await pool.query('DELETE FROM inventory_items WHERE id = $1 RETURNING id', [id]);
    return result.rowCount > 0;
  }

  async recordTransaction(data, userId) {
    const quantity = Number(data.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0 || !['issued', 'purchased', 'damaged'].includes(data.transaction_type)) {
      throw new Error('A valid transaction type and positive whole-number quantity are required');
    }
    const result = await pool.query(`
      INSERT INTO inventory_transactions (item_id, transaction_type, quantity, recipient, issued_by, purpose, status)
      VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *
    `, [data.item_id, data.transaction_type, quantity, data.recipient || null, userId, data.purpose || null]);
    return result.rows[0];
  }

  async approveTransaction(transactionId, approvedBy) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = await client.query(`
        SELECT * FROM inventory_transactions WHERE id = $1 AND status = 'pending' FOR UPDATE
      `, [transactionId]);
      if (!tx.rows[0]) { await client.query('ROLLBACK'); return null; }
      const transaction = tx.rows[0];
      const item = await client.query('SELECT * FROM inventory_items WHERE id = $1 FOR UPDATE', [transaction.item_id]);
      if (!item.rows[0]) throw new Error('Inventory item not found');
      const delta = transaction.transaction_type === 'purchased' ? transaction.quantity : -transaction.quantity;
      if (item.rows[0].quantity + delta < 0) throw new Error('Not enough stock to approve this issue');
      await client.query(`
        UPDATE inventory_items SET quantity = quantity + $1,
          total_value = (quantity + $1) * unit_price,
          condition = CASE WHEN $2 = 'damaged' THEN 'damaged' ELSE condition END,
          last_inventory_date = CURRENT_DATE, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [delta, transaction.transaction_type, transaction.item_id]);
      const updated = await client.query(`
        UPDATE inventory_transactions SET status = 'approved', approved_by = $1,
          approved_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *
      `, [approvedBy, transactionId]);
      await client.query('COMMIT');
      return updated.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }

  async getInventorySummary() {
    const result = await pool.query(`
      SELECT category, COUNT(*)::int AS item_count,
             COALESCE(SUM(quantity), 0)::int AS total_quantity,
             COALESCE(SUM(total_value), 0)::numeric AS total_value
      FROM inventory_items GROUP BY category ORDER BY category
    `);
    return Object.fromEntries(result.rows.map(row => [row.category || 'Uncategorized', {
      item_count: row.item_count, total_quantity: row.total_quantity, total_value: row.total_value
    }]));
  }

  async getLowStockAlerts() {
    const result = await pool.query(`
      SELECT id AS item_id, name AS item_name, minimum_quantity AS threshold,
             quantity AS current_quantity,
             GREATEST(minimum_quantity - quantity, 0) AS recommended_order_quantity
      FROM inventory_items WHERE quantity <= minimum_quantity
      ORDER BY quantity, name
    `);
    return result.rows;
  }

  async getInventoryCategories() {
    const result = await pool.query("SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL AND category <> '' ORDER BY category");
    return result.rows.map(row => row.category);
  }

  async searchInventory(keyword) {
    const query = `%${keyword}%`;
    const result = await pool.query(`
      SELECT * FROM inventory_items
      WHERE name ILIKE $1 OR category ILIKE $1 OR location ILIKE $1
      ORDER BY name
    `, [query]);
    return result.rows;
  }
}

module.exports = new InventoryModel();
