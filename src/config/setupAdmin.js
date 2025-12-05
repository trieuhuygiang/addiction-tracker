require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const setupAdmin = async () => {
  const client = await pool.connect();

  try {
    console.log('Setting up admin system...');

    // Add is_admin column if it doesn't exist
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE
    `);
    console.log('✓ Added is_admin column to users table');

    // Check if admin user exists
    const adminUsername = 'admin';
    const adminPassword = '49914991';
    
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [adminUsername]
    );

    if (existingAdmin.rows.length > 0) {
      // Update existing admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await client.query(
        'UPDATE users SET password_hash = $1, is_admin = TRUE WHERE username = $2',
        [hashedPassword, adminUsername]
      );
      console.log('✓ Updated existing admin user');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await client.query(
        'INSERT INTO users (email, username, password_hash, is_admin) VALUES ($1, $2, $3, $4)',
        [null, adminUsername, hashedPassword, true]
      );
      console.log('✓ Created admin user');
    }

    console.log('\n✓ Admin setup completed!');
    console.log('  Login: admin');
    console.log('  Password: 49914991');

  } catch (error) {
    console.error('Error setting up admin:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

setupAdmin()
  .then(() => {
    console.log('\nSetup completed!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Setup failed:', err);
    process.exit(1);
  });
