require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Auto-create .env file if it doesn't exist
const envPath = path.join(__dirname, '../../.env');
if (!fs.existsSync(envPath)) {
  console.log('⚙️  Creating .env file...');
  const sessionSecret = crypto.randomBytes(32).toString('hex');
  const envContent = `PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=tracker_user
DB_PASSWORD=tracker_password
DB_NAME=addiction_tracker

# Session Configuration
SESSION_SECRET=${sessionSecret}
`;
  fs.writeFileSync(envPath, envContent);
  console.log('✓ .env file created');
  // Reload environment variables
  require('dotenv').config();
}

// // Connection configuration - support both DATABASE_URL and individual vars
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

// Setup PostgreSQL user and database using shell commands for local development
const setupPostgreSQLUserAndDatabase = () => {
  if (process.env.DATABASE_URL) {
    console.log('✓ Using cloud database (Railway/Render)');
    return;
  }

  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;

  try {
    // Create user if doesn't exist
    try {
      const checkUserCmd = `sudo -u postgres psql -c "SELECT usename FROM pg_user WHERE usename = '${dbUser}'" 2>/dev/null`;
      const userExists = execSync(checkUserCmd, { encoding: 'utf-8' }).includes(dbUser);

      if (!userExists) {
        console.log(`Creating PostgreSQL user: ${dbUser}`);
        const createUserCmd = `sudo -u postgres psql -c "CREATE USER ${dbUser} WITH ENCRYPTED PASSWORD '${dbPassword}'"`;
        execSync(createUserCmd, { stdio: 'pipe' });
        console.log(`✓ PostgreSQL user ${dbUser} created`);
      } else {
        console.log(`✓ PostgreSQL user ${dbUser} already exists`);
      }
    } catch (error) {
      console.log(`✓ PostgreSQL user ${dbUser} verification completed`);
    }

    // Create database if doesn't exist
    try {
      const checkDbCmd = `sudo -u postgres psql -c "SELECT datname FROM pg_database WHERE datname = '${dbName}'" 2>/dev/null`;
      const dbExists = execSync(checkDbCmd, { encoding: 'utf-8' }).includes(dbName);

      if (!dbExists) {
        console.log(`Creating database: ${dbName}`);
        const createDbCmd = `sudo -u postgres psql -c "CREATE DATABASE ${dbName}"`;
        execSync(createDbCmd, { stdio: 'pipe' });
        console.log(`✓ Database ${dbName} created`);
      } else {
        console.log(`✓ Database ${dbName} already exists`);
      }
    } catch (error) {
      console.log(`✓ Database ${dbName} verification completed`);
    }

    // Grant privileges
    try {
      const grantCmd = `sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}"`;
      execSync(grantCmd, { stdio: 'pipe' });
      console.log(`✓ Database privileges granted to ${dbUser}`);
    } catch (error) {
      console.log(`✓ Database privileges verified for ${dbUser}`);
    }

    // Grant schema permissions
    try {
      const grantSchemaCmd = `sudo -u postgres psql -d ${dbName} -c "GRANT ALL ON SCHEMA public TO ${dbUser}"`;
      execSync(grantSchemaCmd, { stdio: 'pipe' });
      console.log(`✓ Schema permissions granted to ${dbUser}`);
    } catch (error) {
      console.log(`✓ Schema permissions verified for ${dbUser}`);
    }

    // Transfer ownership of existing tables to the user
    try {
      const tables = ['users', 'entries', 'streak_history', 'clock_history', 'session', 'global_settings'];
      for (const table of tables) {
        const alterOwnerCmd = `sudo -u postgres psql -d ${dbName} -c "ALTER TABLE IF EXISTS ${table} OWNER TO ${dbUser}" 2>/dev/null`;
        execSync(alterOwnerCmd, { stdio: 'pipe' });
      }
      console.log(`✓ Table ownership transferred to ${dbUser}`);
    } catch (error) {
      // This is expected if tables don't exist yet
      console.log(`✓ Table ownership setup completed`);
    }

    // Transfer ownership of sequences to the user
    try {
      const sequences = ['users_id_seq', 'entries_id_seq', 'streak_history_id_seq', 'clock_history_id_seq', 'global_settings_id_seq'];
      for (const seq of sequences) {
        const alterSeqCmd = `sudo -u postgres psql -d ${dbName} -c "ALTER SEQUENCE IF EXISTS ${seq} OWNER TO ${dbUser}" 2>/dev/null`;
        execSync(alterSeqCmd, { stdio: 'pipe' });
      }
      console.log(`✓ Sequence ownership transferred to ${dbUser}`);
    } catch (error) {
      // This is expected if sequences don't exist yet
      console.log(`✓ Sequence ownership setup completed`);
    }

  } catch (error) {
    console.warn('⚠ PostgreSQL setup via shell commands failed');
    console.warn('  This is normal on cloud platforms or if sudo is not available');
  }
};

// Connection to default postgres database for initial setup
const setupPool = new Pool(getConnectionConfig());

const initializeDatabase = async () => {
  // First, setup PostgreSQL user and database using shell commands
  setupPostgreSQLUserAndDatabase();

  const client = await setupPool.connect();

  try {
    console.log('Starting table initialization...');

    // Database setup via shell commands was done above
    // Now we can connect to the main database with the user credentials

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
      // Schema permissions are already granted via shell commands above

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

      // Initialize background video setting to enabled by default
      const backgroundVideoInitQuery = `
        INSERT INTO global_settings (setting_key, setting_value)
        VALUES ('background_video_enabled', 'true')
        ON CONFLICT (setting_key) DO NOTHING;
      `;
      await mainClient.query(backgroundVideoInitQuery);
      console.log('✓ Background video enabled by default');

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
