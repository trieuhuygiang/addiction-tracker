const { query } = require('../config/db');

class Entry {
  // Create a new entry
  static async create(userId, date, hadLeakage, note = null) {
    try {
      const result = await query(
        'INSERT INTO entries (user_id, date, had_leakage, note) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, date, hadLeakage, note]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find entry by user and date
  static async findByUserAndDate(userId, date) {
    try {
      const result = await query(
        'SELECT * FROM entries WHERE user_id = $1 AND date = $2',
        [userId, date]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all entries for a user
  static async findByUser(userId) {
    try {
      const result = await query(
        'SELECT * FROM entries WHERE user_id = $1 ORDER BY date DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get entries for a user in a date range
  static async findByUserInRange(userId, startDate, endDate) {
    try {
      const result = await query(
        'SELECT * FROM entries WHERE user_id = $1 AND date >= $2 AND date <= $3 ORDER BY date DESC',
        [userId, startDate, endDate]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Update an entry
  static async update(entryId, hadLeakage, note = null) {
    try {
      const result = await query(
        'UPDATE entries SET had_leakage = $1, note = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [hadLeakage, note, entryId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete an entry
  static async delete(entryId) {
    try {
      const result = await query(
        'DELETE FROM entries WHERE id = $1 RETURNING id',
        [entryId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find entry by id
  static async findById(entryId) {
    try {
      const result = await query(
        'SELECT * FROM entries WHERE id = $1',
        [entryId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get count of leakage entries for a user
  static async getLeakageCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) FROM entries WHERE user_id = $1 AND had_leakage = true',
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw error;
    }
  }

  // Get count of clean entries for a user
  static async getCleanCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) FROM entries WHERE user_id = $1 AND had_leakage = false',
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw error;
    }
  }

  // Get total entries count for a user
  static async getTotalCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) FROM entries WHERE user_id = $1',
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw error;
    }
  }

  // Delete all entries for a user (reset progress)
  static async deleteAllByUser(userId) {
    try {
      const result = await query(
        'DELETE FROM entries WHERE user_id = $1 RETURNING id',
        [userId]
      );
      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Entry;
