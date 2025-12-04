# Database Setup Guide

This directory contains the database configuration and models for the NoFap Progress Tracker.

## Files

### `db.js`

Main database connection pool using the `pg` library. Handles:

- Connection pooling
- Query execution
- Graceful shutdown

### `init.js`

Database initialization script that:

- Creates the database if it doesn't exist
- Creates the `users` table
- Creates the `entries` table
- Creates indexes for performance

## Running Database Setup

Before running the application for the first time, initialize the database:

```bash
node src/config/init.js
```

This will:

1. Connect to PostgreSQL
2. Create the `nofap_tracker` database (if not exists)
3. Create required tables and indexes
4. Display status messages for each step

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Entries Table

```sql
CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  had_leakage BOOLEAN NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, date)
);
```

## Environment Variables Required

Make sure your `.env` file contains:

- `DB_HOST` - PostgreSQL server host
- `DB_PORT` - PostgreSQL server port
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - Database name (default: nofap_tracker)
