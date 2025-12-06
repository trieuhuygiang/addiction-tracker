const { pool } = require('../config/db');

class GlobalSettings {
    static async getSetting(key) {
        try {
            const result = await pool.query(
                'SELECT setting_value FROM global_settings WHERE setting_key = $1',
                [key]
            );
            return result.rows.length > 0 ? result.rows[0].setting_value : null;
        } catch (error) {
            console.error('Error getting global setting:', error);
            throw error;
        }
    }

    static async setSetting(key, value, userId = null) {
        try {
            const result = await pool.query(
                `INSERT INTO global_settings (setting_key, setting_value, updated_by)
                 VALUES ($1, $2, $3)
                 ON CONFLICT (setting_key) 
                 DO UPDATE SET 
                    setting_value = EXCLUDED.setting_value, 
                    updated_by = EXCLUDED.updated_by
                 RETURNING *`,
                [key, value, userId]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error setting global setting:', error);
            throw error;
        }
    }

    static async getAllSettings() {
        try {
            const result = await pool.query('SELECT * FROM global_settings ORDER BY setting_key');
            return result.rows;
        } catch (error) {
            console.error('Error getting all settings:', error);
            throw error;
        }
    }
}

module.exports = GlobalSettings;
