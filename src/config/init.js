require('dotenv').config();
const { Pool } = require('pg');

// Connection configuration - support both DATABASE_URL and individual vars
const getConnectionConfig = () => {
  if (process.env.DATABASE_URL) {
    // Railway/Heroku/Render style - use DATABASE_URL
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
  } else {
    // Local development - use individual environment variables
    return {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'postgres',
    };
  }
};

// Connection to default postgres database for initial setup
const setupPool = new Pool(getConnectionConfig());

const initializeDatabase = async () => {
  const client = await setupPool.connect();

  try {
    console.log('Starting database initialization...');

    // Skip database creation on Railway (database already exists)
    if (!process.env.DATABASE_URL) {
      // Create database if it doesn't exist (local development only)
      const dbName = process.env.DB_NAME;
      const dbCheckQuery = `SELECT datname FROM pg_database WHERE datname = '${dbName}'`;
      const dbCheckResult = await client.query(dbCheckQuery);

      if (dbCheckResult.rows.length === 0) {
        console.log(`Creating database: ${dbName}`);
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`✓ Database ${dbName} created`);
      } else {
        console.log(`✓ Database ${dbName} already exists`);
      }
    } else {
      console.log('✓ Using Railway PostgreSQL database');
    }

    // Now connect to the actual database
    const mainPool = new Pool(process.env.DATABASE_URL
      ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      }
      : {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      }
    );

    const mainClient = await mainPool.connect();

    try {
      // Create users table
      const usersTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          username VARCHAR(100),
          password_hash VARCHAR(255) NOT NULL,
          reset_token VARCHAR(255),
          reset_token_expiry TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      await mainClient.query(usersTableQuery);
      console.log('✓ Users table created or already exists');

      // Add reset_token columns if they don't exist (for existing databases)
      const addResetTokenColumn = `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);
      `;
      const addResetTokenExpiryColumn = `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
      `;
      await mainClient.query(addResetTokenColumn);
      await mainClient.query(addResetTokenExpiryColumn);
      console.log('✓ Reset token columns added or already exist');

      // Create entries table
      const entriesTableQuery = `
        CREATE TABLE IF NOT EXISTS entries (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          had_leakage BOOLEAN NOT NULL,
          note TEXT,
          failure_level INT DEFAULT 0,
          has_morning_wood BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE (user_id, date)
        );
      `;
      await mainClient.query(entriesTableQuery);
      console.log('✓ Entries table created or already exists');

      // Add failure_level column if it doesn't exist (for existing databases)
      const addFailureLevelColumn = `
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS failure_level INT DEFAULT 0;
      `;
      await mainClient.query(addFailureLevelColumn);
      console.log('✓ Failure level column added or already exists');

      // Add morning_wood column if it doesn't exist (for existing databases)
      const addMorningWoodColumn = `
        ALTER TABLE entries ADD COLUMN IF NOT EXISTS has_morning_wood BOOLEAN DEFAULT FALSE;
      `;
      await mainClient.query(addMorningWoodColumn);
      console.log('✓ Morning wood tracking column added or already exists');

      // Create index for faster queries
      const indexQuery = `
        CREATE INDEX IF NOT EXISTS idx_entries_user_date 
        ON entries(user_id, date DESC);
      `;
      await mainClient.query(indexQuery);
      console.log('✓ Index created for entries table');

      // Create streak_history table
      const streakHistoryTableQuery = `
        CREATE TABLE IF NOT EXISTS streak_history (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          streak_days INT NOT NULL,
          start_date DATE,
          end_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      await mainClient.query(streakHistoryTableQuery);
      console.log('✓ Streak history table created or already exists');

      // Create clock_history table for NoFap counter resets
      const clockHistoryTableQuery = `
        CREATE TABLE IF NOT EXISTS clock_history (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          duration_seconds BIGINT NOT NULL,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      await mainClient.query(clockHistoryTableQuery);
      console.log('✓ Clock history table created or already exists');

      // Add clock_start column to users table
      const addClockStartColumn = `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS clock_start TIMESTAMP;
      `;
      await mainClient.query(addClockStartColumn);
      console.log('✓ Clock start column added or already exists');

      // Add counter_theme column to users table
      const addCounterThemeColumn = `
        ALTER TABLE users ADD COLUMN IF NOT EXISTS counter_theme VARCHAR(50) DEFAULT 'ancient';
      `;
      await mainClient.query(addCounterThemeColumn);
      console.log('✓ Counter theme column added or already exists');

      // Create session table for express-session
      const sessionTableQuery = `
        CREATE TABLE IF NOT EXISTS session (
          sid VARCHAR NOT NULL PRIMARY KEY,
          sess JSON NOT NULL,
          expire TIMESTAMP NOT NULL
        );
      `;
      await mainClient.query(sessionTableQuery);
      console.log('✓ Session table created or already exists');

      // Create global_settings table for application settings
      const globalSettingsTableQuery = `
        CREATE TABLE IF NOT EXISTS global_settings (
          id SERIAL PRIMARY KEY,
          setting_key VARCHAR(255) UNIQUE NOT NULL,
          setting_value TEXT,
          updated_by INT REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `;
      await mainClient.query(globalSettingsTableQuery);
      console.log('✓ Global settings table created or already exists');

      console.log('\n✓ Database initialization completed successfully!');
    } finally {
      mainClient.release();
      await mainPool.end();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await setupPool.end();
  }
};

// Run initialization
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Setup completed!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Setup failed:', err);
      process.exit(1);
    });
}

module.exports = initializeDatabase;
