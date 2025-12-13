const { query } = require('../config/db');

class Entry {
  // Create a new entry
  // failureLevel: 0 = clean, 1 = a little bit, 2 = totally failed
  static async create(userId, date, hadSlip, note = null, failureLevel = null, hasMorningWood = false) {
    try {
      // If failureLevel not provided, derive from hadSlip for backwards compatibility
      const level = failureLevel !== null ? failureLevel : (hadSlip ? 1 : 0);
      const result = await query(
        'INSERT INTO entries (user_id, date, had_leakage, failure_level, note, has_morning_wood) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, date, hadSlip, level, note, hasMorningWood]
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
  static async update(entryId, hadSlip, note = null) {
    try {
      const result = await query(
        'UPDATE entries SET had_leakage = $1, note = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [hadSlip, note, entryId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update an entry with failure level and morning wood
  static async updateWithLevel(entryId, hadSlip, note = null, failureLevel = 0, hasMorningWood = false) {
    try {
      const result = await query(
        'UPDATE entries SET had_leakage = $1, note = $2, failure_level = $3, has_morning_wood = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
        [hadSlip, note, failureLevel, hasMorningWood, entryId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update just the morning wood status
  static async updateMorningWood(entryId, hasMorningWood) {
    try {
      const result = await query(
        'UPDATE entries SET has_morning_wood = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [hasMorningWood, entryId]
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

  // Get count of "a little bit" entries for a user (failure_level = 1)
  static async getSlipCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) FROM entries WHERE user_id = $1 AND (failure_level = 1 OR (had_leakage = true AND (failure_level IS NULL OR failure_level = 0)))',
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw error;
    }
  }

  // Get count of "totally failed" entries for a user (failure_level = 2)
  static async getTotallyFailedCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) FROM entries WHERE user_id = $1 AND failure_level = 2',
        [userId]
      );
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw error;
    }
  }

  // Get count of clean entries for a user (failure_level = 0 or no slip)
  static async getCleanCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) FROM entries WHERE user_id = $1 AND had_leakage = false AND (failure_level IS NULL OR failure_level = 0)',
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

  // Get count of morning wood entries for a user
  static async getMorningWoodCount(userId) {
    try {
      const result = await query(
        'SELECT COUNT(*) FROM entries WHERE user_id = $1 AND has_morning_wood = true',
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
