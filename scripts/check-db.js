#!/usr/bin/env node

/**
 * Database diagnostic script
 * Checks if all required columns exist in the entries table
 */

require('dotenv').config();
const { Pool } = require('pg');

const getPool = () => {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }
  return new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
};

async function checkDatabase() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    console.log('\n🔍 Checking database structure...\n');

    // Check if entries table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'entries'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Entries table does NOT exist!');
      console.log('   Run: npm run setup');
      process.exit(1);
    }
    console.log('✓ Entries table exists');

    // Get all columns in entries table
    const columnsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'entries'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Entries table columns:\n');
    const requiredColumns = ['id', 'user_id', 'date', 'had_leakage', 'note', 'failure_level', 'has_morning_wood', 'created_at', 'updated_at'];
    
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    
    columnsResult.rows.forEach(row => {
      const isRequired = requiredColumns.includes(row.column_name);
      const icon = isRequired ? '✓' : '•';
      console.log(`   ${icon} ${row.column_name.padEnd(20)} ${row.data_type}`);
    });

    console.log('\n🔎 Checking required columns:\n');
    let allPresent = true;
    requiredColumns.forEach(col => {
      if (existingColumns.includes(col)) {
        console.log(`   ✓ ${col}`);
      } else {
        console.log(`   ❌ ${col} - MISSING!`);
        allPresent = false;
      }
    });

    if (!allPresent) {
      console.log('\n⚠️  Some required columns are missing!');
      console.log('   Run: npm run setup');
      process.exit(1);
    }

    console.log('\n✅ All required columns are present!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error checking database:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. PostgreSQL is running');
    console.log('   2. .env file is configured correctly');
    console.log('   3. Database exists and is accessible');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  checkDatabase();
}

module.exports = { checkDatabase };
