require('dotenv').config();
const { Pool } = require('pg');

const initializeDatabase = async () => {
  // For Railway/cloud: DATABASE_URL connects directly to the target database
  // For local: use individual vars to connect to postgres db first, then target db
  const usesDatabaseUrl = !!process.env.DATABASE_URL;
  
  let setupPool;
  
  if (usesDatabaseUrl) {
    // Railway/Heroku - DATABASE_URL already points to the correct database
    setupPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    console.log('Using DATABASE_URL for connection');
  } else {
    // Local development - connect to postgres database first
    setupPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'postgres',
    });
    console.log('Using local PostgreSQL connection');
  }

  const client = await setupPool.connect();

  try {
    console.log('Starting database initialization...');

    // Only create database on local development (Railway database already exists)
    if (!usesDatabaseUrl) {
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
      
      // Release this connection and create new one to target database
      client.release();
      await setupPool.end();
    }

    // Now connect to the actual application database
    const mainPool = usesDatabaseUrl
      ? new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        })
      : new Pool({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
        });

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
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE (user_id, date)
        );
      `;
      await mainClient.query(entriesTableQuery);
      console.log('✓ Entries table created or already exists');

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

      console.log('\n✓ Database initialization completed successfully!');
    } finally {
      mainClient.release();
      await mainPool.end();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    // Clean up connections - only if local development
    if (!usesDatabaseUrl) {
      try {
        if (client) client.release();
        if (setupPool) await setupPool.end();
      } catch (e) {
        // Connection already closed
      }
    }
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
