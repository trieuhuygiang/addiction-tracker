require('dotenv').config();
const { Pool } = require('pg');

// Connection to default postgres database for initial setup
const setupPool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: 'postgres',
});

const initializeDatabase = async () => {
  const client = await setupPool.connect();

  try {
    console.log('Starting database initialization...');

    // Create database if it doesn't exist
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

    // Now connect to the actual database
    const mainPool = new Pool({
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
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;
      await mainClient.query(usersTableQuery);
      console.log('✓ Users table created or already exists');

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
