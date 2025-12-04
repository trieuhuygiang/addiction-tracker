const { Pool } = require('pg');
require('dotenv').config();

// Create a connection pool
// Support both DATABASE_URL (for cloud) and individual env vars (for local)
const pool = process.env.DATABASE_URL 
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

// Test the connection
pool.on('connect', () => {
  console.log('Database pool connected');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Query helper function
const query = (text, params) => {
  return pool.query(text, params);
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connection...');
  await pool.end();
  process.exit(0);
});

module.exports = {
  pool,
  query,
};
