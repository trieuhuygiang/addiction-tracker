const { query } = require('../config/db');

class StreakHistory {
  // Create a new streak history record (called when user relapses)
  static async create(userId, streakDays, startDate, endDate) {
    try {
      const result = await query(
        'INSERT INTO streak_history (user_id, streak_days, start_date, end_date) VALUES ($1, $2, $3, $4) RETURNING *',
        [userId, streakDays, startDate, endDate]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all streak history for a user
  static async findByUser(userId) {
    try {
      const result = await query(
        'SELECT * FROM streak_history WHERE user_id = $1 ORDER BY end_date DESC',
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get the best (longest) streak for a user
  static async getBestStreak(userId) {
    try {
      const result = await query(
        'SELECT MAX(streak_days) as best_streak FROM streak_history WHERE user_id = $1',
        [userId]
      );
      return result.rows[0]?.best_streak || 0;
    } catch (error) {
      throw error;
    }
  }

  // Delete a specific streak history record
  static async delete(historyId, userId) {
    try {
      const result = await query(
        'DELETE FROM streak_history WHERE id = $1 AND user_id = $2 RETURNING id',
        [historyId, userId]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete all streak history for a user
  static async deleteAllByUser(userId) {
    try {
      const result = await query(
        'DELETE FROM streak_history WHERE user_id = $1',
        [userId]
      );
      return result.rowCount;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = StreakHistory;
