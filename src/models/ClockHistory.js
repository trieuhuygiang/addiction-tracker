const { query } = require('../config/db');

class ClockHistory {
  // Create a new clock reset history record
  static async create(userId, durationSeconds, startTime, endTime) {
    try {
      const result = await query(
        'INSERT INTO clock_history (user_id, duration_seconds, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, durationSeconds, startTime, endTime]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all clock history for a user
  static async findByUser(userId) {
    try {
      const result = await query(
        'SELECT * FROM clock_history WHERE user_id = $1 ORDER BY end_time DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get the best (longest) duration for a user
  static async getBestDuration(userId) {
    try {
      const result = await query(
        'SELECT MAX(duration_seconds) as best_duration FROM clock_history WHERE user_id = $1',
        [userId]
      );
      return result.rows[0]?.best_duration || 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete a specific clock history record
  static async delete(historyId, userId) {
    try {
      const result = await query(
        'DELETE FROM clock_history WHERE id = $1 AND user_id = $2 RETURNING id',
        [historyId, userId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete all clock history for a user
  static async deleteAllByUser(userId) {
    try {
      const result = await query(
        'DELETE FROM clock_history WHERE user_id = $1',
        [userId]
      );
      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ClockHistory;
