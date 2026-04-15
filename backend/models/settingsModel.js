const pool = require('../config/database');

class SettingsModel {
  // Get current school settings (single row)
  async getSettings() {
    try {
      // Ensure settings table exists (handled by Prisma migration)
      const result = await pool.query(`
        SELECT * FROM settings 
        ORDER BY id LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        // Insert default settings
        const defaultResult = await pool.query(`
          INSERT INTO settings (
            currency_symbol, currency_name, currency_code, daily_fine_rate
          ) VALUES (
            $1, $2, $3, $4
          ) RETURNING *
        `, ['₵', 'Ghana Cedis', 'GHS', 1.00]);
        return defaultResult.rows[0];
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting settings:', error);
      throw error;
    }
  }

  // Update school settings
  async updateSettings(settingsData) {
    try {
      const {
        currency_symbol,
        currency_name,
        currency_code,
        daily_fine_rate
      } = settingsData;

      // Check if settings exist
      const existing = await pool.query('SELECT id FROM settings LIMIT 1');
      
      if (existing.rows.length > 0) {
        // Update existing
        const result = await pool.query(`
          UPDATE settings 
          SET 
            currency_symbol = $1,
            currency_name = $2,
            currency_code = $3,
            daily_fine_rate = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $5
          RETURNING *
        `, [currency_symbol, currency_name, currency_code, daily_fine_rate, existing.rows[0].id]);
        return result.rows[0];
      } else {
        // Insert new
        const result = await pool.query(`
          INSERT INTO settings (
            currency_symbol, currency_name, currency_code, daily_fine_rate
          ) VALUES ($1, $2, $3, $4)
          RETURNING *
        `, [currency_symbol, currency_name, currency_code, daily_fine_rate]);
        return result.rows[0];
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  // Get currency info only (for library fines, etc.)
  async getCurrency() {
    const settings = await this.getSettings();
    return {
      symbol: settings.currency_symbol,
      name: settings.currency_name,
      code: settings.currency_code
    };
  }

  // Get daily fine rate (for library)
  async getDailyFineRate() {
    const settings = await this.getSettings();
    return parseFloat(settings.daily_fine_rate);
  }
}

module.exports = new SettingsModel();
