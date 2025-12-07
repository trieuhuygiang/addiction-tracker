/**
 * Auto-initialize database tables on startup
 * This is designed for cloud deployments (Render, Railway, etc.)
 * where the database already exists via DATABASE_URL
 */

const { pool } = require('./db');
const bcrypt = require('bcrypt');

const autoInitialize = async () => {
  const client = await pool.connect();

  try {
    console.log('Checking database tables...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        username VARCHAR(100) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        reset_token VARCHAR(255),
        reset_token_expiry TIMESTAMP,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add columns if they don't exist (for migrations)
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS clock_start TIMESTAMP;`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS counter_theme VARCHAR(50) DEFAULT 'ancient';`);

    // Make email nullable if it's not already
    await client.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`).catch(() => { });

    // Create entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS entries (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        had_leakage BOOLEAN NOT NULL,
        failure_level INT DEFAULT 0,
        note TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (user_id, date)
      );
    `);

    // Add failure_level column if it doesn't exist (migration)
    await client.query(`ALTER TABLE entries ADD COLUMN IF NOT EXISTS failure_level INT DEFAULT 0;`);

    // Create index for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_entries_user_date 
      ON entries(user_id, date DESC);
    `);

    // Create streak_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS streak_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        streak_days INT NOT NULL,
        start_date DATE,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create clock_history table for rewiring day counter
    await client.query(`
      CREATE TABLE IF NOT EXISTS clock_history (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        duration_seconds INT NOT NULL,
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create session table for express-session
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);

    // Create admin user if not exists
    const adminCheck = await client.query(
      'SELECT id FROM users WHERE username = $1',
      ['admin']
    );

    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('49914991', 10);
      await client.query(
        'INSERT INTO users (email, username, password_hash, is_admin) VALUES ($1, $2, $3, $4)',
        [null, 'admin', hashedPassword, true]
      );
      console.log('✓ Admin user created (username: admin, password: 49914991)');
    }

    console.log('✓ Database tables ready');
  } catch (error) {
    console.error('Auto-init error:', error.message);
    // Don't throw - let the app continue and show errors on usage
  } finally {
    client.release();
  }
};

module.exports = autoInitialize;
