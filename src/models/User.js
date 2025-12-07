const { query } = require('../config/db');

class User {
  // Create a new user
  static async create(email, username, passwordHash) {
    try {
      const result = await query(
        'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
        [email, username, passwordHash]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by username
  static async findByUsername(username) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE username = $1',
        [username]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by id
  static async findById(id) {
    try {
      const result = await query(
        'SELECT id, email, username, created_at FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update user
  static async update(id, data) {
    try {
      const fields = [];
      const values = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(data)) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }

      values.push(id);
      const query_str = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

      const result = await query(query_str, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  static async delete(id) {
    try {
      const result = await query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Generic query method
  static async query(queryStr, params = []) {
    try {
      return await query(queryStr, params);
    } catch (error) {
      throw error;
    }
  }

  // Update reset token for password reset
  static async updateResetToken(id, token, expiry) {
    try {
      const result = await query(
        'UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3 RETURNING *',
        [token, expiry, id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Find user by reset token
  static async findByResetToken(token) {
    try {
      const result = await query(
        'SELECT * FROM users WHERE reset_token = $1 AND reset_token_expiry > NOW()',
        [token]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update password and clear reset token
  static async updatePassword(id, passwordHash) {
    try {
      const result = await query(
        'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expiry = NULL WHERE id = $2 RETURNING *',
        [passwordHash, id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get clock start time
  static async getClockStart(id) {
    try {
      const result = await query(
        'SELECT clock_start FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0]?.clock_start;
    } catch (error) {
      throw error;
    }
  }

  // Set clock start time
  static async setClockStart(id, startTime) {
    try {
      const result = await query(
        'UPDATE users SET clock_start = $1 WHERE id = $2 RETURNING clock_start',
        [startTime, id]
      );
      return result.rows[0]?.clock_start;
    } catch (error) {
      throw error;
    }
  }

  // Clear clock start time (reset)
  static async clearClockStart(id) {
    try {
      const result = await query(
        'UPDATE users SET clock_start = NULL WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get counter theme preference
  static async getCounterTheme(id) {
    try {
      const result = await query(
        'SELECT counter_theme FROM users WHERE id = $1',
        [id]
      );
      return result.rows[0]?.counter_theme || 'ancient';
    } catch (error) {
      throw error;
    }
  }

  // Set counter theme preference
  static async setCounterTheme(id, theme) {
    try {
      const result = await query(
        'UPDATE users SET counter_theme = $1 WHERE id = $2 RETURNING counter_theme',
        [theme, id]
      );
      return result.rows[0]?.counter_theme;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
