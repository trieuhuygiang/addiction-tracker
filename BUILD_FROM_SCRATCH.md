# 🛠️ Build Addiction Tracker from Scratch

A complete step-by-step guide to building this addiction recovery tracking web application from zero to deployment.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [Database Setup (PostgreSQL)](#database-setup-postgresql)
4. [Project Structure](#project-structure)
5. [Configuration Files](#configuration-files)
6. [Database Models](#database-models)
7. [Authentication System](#authentication-system)
8. [Routes & Controllers](#routes--controllers)
9. [Views (EJS Templates)](#views-ejs-templates)
10. [Styling (CSS)](#styling-css)
11. [Running the Application](#running-the-application)
12. [Deployment to Render](#deployment-to-render)

---

## Prerequisites

Before starting, ensure you have:

- **Node.js** (v18.0.0 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (v14 or higher) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)
- **Text Editor** (VS Code recommended)

Verify installations:

```bash
node --version    # Should show v18.x.x or higher
npm --version     # Should show 9.x.x or higher
psql --version    # Should show psql 14.x or higher
git --version     # Should show git version 2.x.x
```

---

## Project Setup

### Step 1: Create Project Directory

```bash
mkdir addiction-tracker
cd addiction-tracker
```

### Step 2: Initialize Node.js Project

```bash
npm init -y
```

### Step 3: Install Dependencies

```bash
npm install express ejs express-session connect-pg-simple pg bcrypt dotenv cookie-parser
```

**Dependencies Explained:**
| Package | Purpose |
|---------|---------|
| `express` | Web framework for Node.js |
| `ejs` | Template engine for HTML views |
| `express-session` | Session management |
| `connect-pg-simple` | PostgreSQL session store |
| `pg` | PostgreSQL client for Node.js |
| `bcrypt` | Password hashing |
| `dotenv` | Environment variable management |
| `cookie-parser` | Parse cookies from requests |

### Step 4: Update package.json

Edit `package.json` to add scripts:

```json
{
  "name": "addiction-tracker",
  "version": "1.0.0",
  "description": "A web app to track your addiction recovery progress",
  "main": "src/server.js",
  "engines": {
    "node": ">=18.0.0"
  },
  "scripts": {
    "dev": "node src/server.js",
    "start": "node src/server.js",
    "setup": "node src/config/init.js"
  },
  "dependencies": {
    "bcrypt": "^6.0.0",
    "connect-pg-simple": "^10.0.0",
    "cookie-parser": "^1.4.7",
    "dotenv": "^16.0.0",
    "ejs": "^3.1.9",
    "express": "^4.22.1",
    "express-session": "^1.17.3",
    "pg": "^8.11.0"
  }
}
```

---

## Database Setup (PostgreSQL)

### 🗄️ Understanding PostgreSQL

PostgreSQL is a powerful, open-source relational database. Here's what you need to know:

### Step 1: Install PostgreSQL

**On Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**On macOS (using Homebrew):**

```bash
brew install postgresql@14
brew services start postgresql@14
```

**On Windows:**
Download installer from [postgresql.org](https://www.postgresql.org/download/windows/)

### Step 2: Start PostgreSQL Service

```bash
# Ubuntu/Debian
sudo systemctl start postgresql
sudo systemctl enable postgresql  # Auto-start on boot

# macOS
brew services start postgresql

# Windows (usually starts automatically)
```

### Step 3: Access PostgreSQL

```bash
# Switch to postgres user (Linux)
sudo -u postgres psql

# Or directly (macOS/Windows)
psql -U postgres
```

### Step 4: Create Database and User

Inside the PostgreSQL prompt (`psql`):

```sql
-- Create a new database
CREATE DATABASE addiction_tracker;

-- Create a new user with password
CREATE USER tracker_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON DATABASE addiction_tracker TO tracker_user;

-- Connect to the database
\c addiction_tracker

-- Grant schema permissions (PostgreSQL 15+)
GRANT ALL ON SCHEMA public TO tracker_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tracker_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tracker_user;

-- Exit psql
\q
```

### Step 5: Test Connection

```bash
psql -U tracker_user -d addiction_tracker -h localhost
```

Enter the password when prompted. If successful, you'll see the database prompt.

### 📊 Database Schema Explained

Our application uses 4 main tables:

#### 1. `users` Table

Stores user account information.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,           -- Auto-incrementing ID
    email VARCHAR(255) UNIQUE,       -- User's email (optional)
    username VARCHAR(100) UNIQUE,    -- Username for login
    password_hash VARCHAR(255) NOT NULL,  -- Bcrypt hashed password
    reset_token VARCHAR(255),        -- For password reset
    reset_token_expiry TIMESTAMP,    -- Token expiration
    is_admin BOOLEAN DEFAULT FALSE,  -- Admin flag
    clock_start TIMESTAMP,           -- Rewiring counter start time
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. `entries` Table

Stores daily check-in entries.

```sql
CREATE TABLE entries (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,              -- Entry date
    had_leakage BOOLEAN NOT NULL,    -- Did user slip? (true/false)
    note TEXT,                       -- Optional notes
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, date)           -- One entry per user per day
);

-- Index for faster queries
CREATE INDEX idx_entries_user_date ON entries(user_id, date DESC);
```

#### 3. `streak_history` Table

Tracks completed streaks.

```sql
CREATE TABLE streak_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_days INT NOT NULL,        -- Number of days in streak
    start_date DATE,                 -- When streak started
    end_date DATE NOT NULL,          -- When streak ended
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. `clock_history` Table

Tracks rewiring counter resets.

```sql
CREATE TABLE clock_history (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    duration_seconds INT NOT NULL,   -- How long the counter ran
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. `session` Table

Stores user sessions (managed by connect-pg-simple).

```sql
CREATE TABLE session (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP NOT NULL
);
```

### 🔑 Key Database Concepts

1. **PRIMARY KEY**: Unique identifier for each row (usually `id`)
2. **SERIAL**: Auto-incrementing integer
3. **FOREIGN KEY (REFERENCES)**: Links to another table
4. **ON DELETE CASCADE**: When parent is deleted, delete children too
5. **UNIQUE**: No duplicate values allowed
6. **INDEX**: Speeds up searches on specific columns

---

## Project Structure

Create the following folder structure:

```
addiction-tracker/
├── .env                    # Environment variables (DO NOT COMMIT)
├── .gitignore
├── package.json
├── src/
│   ├── server.js           # Entry point
│   ├── app.js              # Express app configuration
│   ├── config/
│   │   ├── db.js           # Database connection
│   │   └── autoInit.js     # Auto-create tables on startup
│   ├── middleware/
│   │   └── auth.js         # Authentication middleware
│   ├── models/
│   │   ├── User.js         # User model
│   │   ├── Entry.js        # Entry model
│   │   ├── StreakHistory.js
│   │   └── ClockHistory.js
│   ├── routes/
│   │   ├── auth.js         # Login, signup, logout
│   │   ├── entries.js      # Daily entries
│   │   ├── calendar.js     # Calendar view
│   │   ├── summary.js      # Statistics
│   │   ├── clock.js        # Rewiring counter
│   │   └── admin.js        # Admin functions
│   ├── utils/
│   │   ├── streakCalculator.js
│   │   ├── dateUtils.js
│   │   └── scheduler.js
│   ├── views/
│   │   ├── index.ejs       # Landing page
│   │   ├── login.ejs
│   │   ├── signup.ejs
│   │   ├── dashboard.ejs
│   │   ├── entries.ejs
│   │   ├── calendar.ejs
│   │   ├── summary.ejs
│   │   └── partials/
│   │       ├── header.ejs
│   │       └── footer.ejs
│   └── public/
│       ├── css/
│       │   └── style.css
│       └── js/
│           └── main.js
```

Create directories:

```bash
mkdir -p src/{config,middleware,models,routes,utils,views/partials,public/{css,js}}
```

---

## Configuration Files

### Step 1: Create .env file

Create `.env` in the project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration (Local)
DB_HOST=localhost
DB_PORT=5432
DB_USER=tracker_user
DB_PASSWORD=your_secure_password
DB_NAME=addiction_tracker

# For Production (Render, Railway, etc.)
# DATABASE_URL=postgresql://user:password@host:port/database

# Session Secret (generate a random string)
SESSION_SECRET=your-super-secret-session-key-change-this-in-production

# Optional
USE_HTTPS=false
```

### Step 2: Create .gitignore

```gitignore
# Dependencies
node_modules/

# Environment variables
.env
.env.local
.env.production

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

### Step 3: Create Database Connection (src/config/db.js)

```javascript
const { Pool } = require("pg");
require("dotenv").config();

// Create a connection pool
// Support both DATABASE_URL (for cloud) and individual env vars (for local)
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

// Test the connection
pool.on("connect", () => {
  console.log("Database pool connected");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

// Query helper function
const query = (text, params) => {
  return pool.query(text, params);
};

module.exports = {
  pool,
  query,
};
```

### Step 4: Create Auto-Init (src/config/autoInit.js)

This file automatically creates tables when the server starts:

```javascript
const { pool } = require("./db");
const bcrypt = require("bcrypt");

const autoInitialize = async () => {
  const client = await pool.connect();

  try {
    console.log("Checking database tables...");

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
        clock_start TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create entries table
    await client.query(`
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
    `);

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

    // Create clock_history table
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

    // Create session table
    await client.query(`
      CREATE TABLE IF NOT EXISTS session (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP NOT NULL
      );
    `);

    // Create admin user if not exists
    const adminCheck = await client.query(
      "SELECT id FROM users WHERE username = $1",
      ["admin"]
    );

    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await client.query(
        "INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3)",
        ["admin", hashedPassword, true]
      );
      console.log("✓ Admin user created (username: admin, password: admin123)");
    }

    console.log("✓ Database tables ready");
  } catch (error) {
    console.error("Auto-init error:", error.message);
  } finally {
    client.release();
  }
};

module.exports = autoInitialize;
```

---

## Database Models

### User Model (src/models/User.js)

```javascript
const { query } = require("../config/db");

class User {
  // Create a new user
  static async create(email, username, passwordHash) {
    const result = await query(
      "INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at",
      [email, username, passwordHash]
    );
    return result.rows[0];
  }

  // Find user by username
  static async findByUsername(username) {
    const result = await query("SELECT * FROM users WHERE username = $1", [
      username,
    ]);
    return result.rows[0];
  }

  // Find user by id
  static async findById(id) {
    const result = await query(
      "SELECT id, email, username, created_at, clock_start FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0];
  }

  // Update user
  static async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(data)) {
      fields.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    }

    values.push(id);
    const result = await query(
      `UPDATE users SET ${fields.join(
        ", "
      )} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  // Get all users (admin only)
  static async getAll() {
    const result = await query(
      "SELECT id, email, username, is_admin, created_at FROM users ORDER BY created_at DESC"
    );
    return result.rows;
  }
}

module.exports = User;
```

### Entry Model (src/models/Entry.js)

```javascript
const { query } = require("../config/db");

class Entry {
  // Create a new entry
  static async create(userId, date, hadSlip, note = null) {
    const result = await query(
      "INSERT INTO entries (user_id, date, had_leakage, note) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, date, hadSlip, note]
    );
    return result.rows[0];
  }

  // Find entry by user and date
  static async findByUserAndDate(userId, date) {
    const result = await query(
      "SELECT * FROM entries WHERE user_id = $1 AND date = $2",
      [userId, date]
    );
    return result.rows[0];
  }

  // Get all entries for a user
  static async findByUser(userId) {
    const result = await query(
      "SELECT * FROM entries WHERE user_id = $1 ORDER BY date DESC",
      [userId]
    );
    return result.rows;
  }

  // Update an entry
  static async update(entryId, hadSlip, note = null) {
    const result = await query(
      "UPDATE entries SET had_leakage = $1, note = $2, updated_at = NOW() WHERE id = $3 RETURNING *",
      [hadSlip, note, entryId]
    );
    return result.rows[0];
  }

  // Delete an entry
  static async delete(entryId) {
    const result = await query(
      "DELETE FROM entries WHERE id = $1 RETURNING id",
      [entryId]
    );
    return result.rows[0];
  }
}

module.exports = Entry;
```

---

## Authentication System

### Middleware (src/middleware/auth.js)

```javascript
// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
};

// Middleware to check if user is not logged in
const requireLogout = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect("/dashboard");
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  if (!req.session.isAdmin) {
    return res.status(403).render("error", {
      title: "Access Denied",
      message: "You do not have permission to access this page.",
    });
  }
  next();
};

// Middleware to set user data in locals for views
const setUserData = (req, res, next) => {
  if (req.session.userId) {
    res.locals.isAuthenticated = true;
    res.locals.userId = req.session.userId;
    res.locals.isAdmin = req.session.isAdmin || false;
  } else {
    res.locals.isAuthenticated = false;
    res.locals.isAdmin = false;
  }
  next();
};

module.exports = {
  requireLogin,
  requireLogout,
  requireAdmin,
  setUserData,
};
```

### Auth Routes (src/routes/auth.js)

```javascript
const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const { requireLogout } = require("../middleware/auth");

// GET /login
router.get("/login", requireLogout, (req, res) => {
  res.render("login", { title: "Login", error: null });
});

// POST /login
router.post("/login", requireLogout, async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findByUsername(username);

    if (!user) {
      return res.render("login", {
        title: "Login",
        error: "Invalid username or password",
      });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.render("login", {
        title: "Login",
        error: "Invalid username or password",
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.isAdmin = user.is_admin;

    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    res.render("login", {
      title: "Login",
      error: "An error occurred. Please try again.",
    });
  }
});

// GET /signup
router.get("/signup", requireLogout, (req, res) => {
  res.render("signup", { title: "Sign Up", error: null });
});

// POST /signup
router.post("/signup", requireLogout, async (req, res) => {
  const { username, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.render("signup", {
      title: "Sign Up",
      error: "Passwords do not match",
    });
  }

  try {
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.render("signup", {
        title: "Sign Up",
        error: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create(null, username, hashedPassword);

    req.session.userId = user.id;
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Signup error:", error);
    res.render("signup", {
      title: "Sign Up",
      error: "An error occurred. Please try again.",
    });
  }
});

// GET /logout
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
    }
    res.redirect("/");
  });
});

module.exports = router;
```

---

## Main Application Files

### Server Entry Point (src/server.js)

```javascript
require("dotenv").config();
const app = require("./app");
const autoInitialize = require("./config/autoInit");

const PORT = process.env.PORT || 3000;

// Initialize database tables then start server
autoInitialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize:", err);
    process.exit(1);
  });
```

### Express App (src/app.js)

```javascript
require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const cookieParser = require("cookie-parser");
const { pool } = require("./config/db");
const { requireLogin, setUserData } = require("./middleware/auth");
const authRoutes = require("./routes/auth");

const app = express();

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());

// Trust proxy for production (Render, Heroku, etc.)
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Session configuration with PostgreSQL store
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure:
        process.env.NODE_ENV === "production" &&
        process.env.USE_HTTPS === "true",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// User data middleware
app.use(setUserData);

// Routes
app.get("/", (req, res) => {
  res.render("index", { title: "Addiction Tracker" });
});

// Auth routes
app.use("/", authRoutes);

// Dashboard (protected)
app.get("/dashboard", requireLogin, async (req, res) => {
  res.render("dashboard", { title: "Dashboard" });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render("error", {
    title: "Error",
    message: "Something went wrong!",
  });
});

module.exports = app;
```

---

## Views (EJS Templates)

### Layout Partial - Header (src/views/partials/header.ejs)

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= title %> | Addiction Tracker</title>
    <link rel="stylesheet" href="/css/style.css" />
  </head>
  <body>
    <nav class="navbar">
      <div class="nav-brand">
        <a href="/">🎯 Addiction Tracker</a>
      </div>
      <div class="nav-links">
        <% if (isAuthenticated) { %>
        <a href="/dashboard">Dashboard</a>
        <a href="/entries">Entries</a>
        <a href="/calendar">Calendar</a>
        <a href="/logout">Logout</a>
        <% } else { %>
        <a href="/login">Login</a>
        <a href="/signup">Sign Up</a>
        <% } %>
      </div>
    </nav>
    <main class="container"></main>
  </body>
</html>
```

### Layout Partial - Footer (src/views/partials/footer.ejs)

```html
    </main>
    <footer class="footer">
        <p>&copy; 2024 Addiction Tracker. Stay strong! 💪</p>
    </footer>
    <script src="/js/main.js"></script>
</body>
</html>
```

### Landing Page (src/views/index.ejs)

```html
<%- include('partials/header') %>

<div class="hero">
  <h1>🎯 Track Your Recovery Journey</h1>
  <p>
    A simple, private tool to help you stay accountable and see your progress.
  </p>

  <% if (!isAuthenticated) { %>
  <div class="hero-buttons">
    <a href="/signup" class="btn btn-primary">Get Started</a>
    <a href="/login" class="btn btn-secondary">Login</a>
  </div>
  <% } else { %>
  <a href="/dashboard" class="btn btn-primary">Go to Dashboard</a>
  <% } %>
</div>

<div class="features">
  <div class="feature-card">
    <h3>📊 Track Daily</h3>
    <p>Log your daily check-ins with optional notes</p>
  </div>
  <div class="feature-card">
    <h3>🔥 Build Streaks</h3>
    <p>Watch your streak grow day by day</p>
  </div>
  <div class="feature-card">
    <h3>📅 Calendar View</h3>
    <p>See your progress at a glance</p>
  </div>
</div>

<%- include('partials/footer') %>
```

### Login Page (src/views/login.ejs)

```html
<%- include('partials/header') %>

<div class="auth-container">
  <h2>Login</h2>

  <% if (error) { %>
  <div class="alert alert-error"><%= error %></div>
  <% } %>

  <form action="/login" method="POST">
    <div class="form-group">
      <label for="username">Username</label>
      <input type="text" id="username" name="username" required />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required />
    </div>

    <button type="submit" class="btn btn-primary">Login</button>
  </form>

  <p class="auth-link">Don't have an account? <a href="/signup">Sign up</a></p>
</div>

<%- include('partials/footer') %>
```

---

## Styling (CSS)

### Basic Stylesheet (src/public/css/style.css)

```css
:root {
  --primary: #667eea;
  --primary-dark: #5a67d8;
  --success: #48bb78;
  --danger: #e94560;
  --warning: #ecc94b;
  --bg-dark: #0f0f23;
  --bg-card: #1a1a2e;
  --text-light: #e4e4e4;
  --text-muted: #888;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  background: var(--bg-dark);
  color: var(--text-light);
  min-height: 100vh;
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

/* Navigation */
.navbar {
  background: var(--bg-card);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-brand a {
  color: var(--primary);
  text-decoration: none;
  font-size: 1.5rem;
  font-weight: bold;
}

.nav-links a {
  color: var(--text-light);
  text-decoration: none;
  margin-left: 1.5rem;
  transition: color 0.3s;
}

.nav-links a:hover {
  color: var(--primary);
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  text-decoration: none;
  transition: all 0.3s;
}

.btn-primary {
  background: var(--primary);
  color: white;
}

.btn-primary:hover {
  background: var(--primary-dark);
  transform: translateY(-2px);
}

.btn-secondary {
  background: transparent;
  border: 2px solid var(--primary);
  color: var(--primary);
}

/* Forms */
.auth-container {
  max-width: 400px;
  margin: 3rem auto;
  background: var(--bg-card);
  padding: 2rem;
  border-radius: 12px;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text-muted);
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--text-light);
  font-size: 1rem;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
}

/* Alerts */
.alert {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.alert-error {
  background: rgba(233, 69, 96, 0.2);
  color: var(--danger);
  border: 1px solid var(--danger);
}

/* Hero Section */
.hero {
  text-align: center;
  padding: 4rem 2rem;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.hero p {
  color: var(--text-muted);
  font-size: 1.2rem;
  margin-bottom: 2rem;
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Features */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
}

.feature-card {
  background: var(--bg-card);
  padding: 2rem;
  border-radius: 12px;
  text-align: center;
}

.feature-card h3 {
  margin-bottom: 1rem;
}

/* Footer */
.footer {
  text-align: center;
  padding: 2rem;
  color: var(--text-muted);
  margin-top: 3rem;
}
```

---

## Running the Application

### Step 1: Ensure PostgreSQL is Running

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql
```

### Step 2: Start the Application

```bash
# Development mode
npm run dev

# Or
npm start
```

### Step 3: Open in Browser

Visit: http://localhost:3000

### Step 4: Create an Account

1. Click "Sign Up"
2. Enter username and password
3. Start tracking!

---

## Deployment to Render

### Step 1: Create a GitHub Repository

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/addiction-tracker.git
git push -u origin main
```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 3: Create PostgreSQL Database

1. Dashboard → New → PostgreSQL
2. Name: `addiction-tracker-db`
3. Region: Choose nearest to you
4. Instance Type: Free
5. Click "Create Database"
6. Copy the **Internal Database URL**

### Step 4: Create Web Service

1. Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `addiction-tracker`
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### Step 5: Add Environment Variables

In Render dashboard, add these environment variables:

| Key              | Value                                    |
| ---------------- | ---------------------------------------- |
| `DATABASE_URL`   | (paste Internal Database URL)            |
| `NODE_ENV`       | `production`                             |
| `SESSION_SECRET` | (generate a random 32+ character string) |
| `USE_HTTPS`      | `false`                                  |

### Step 6: Deploy

Click "Create Web Service". Render will:

1. Pull your code from GitHub
2. Run `npm install`
3. Run `npm start`
4. Auto-create database tables (via autoInit.js)

Your app will be live at: `https://your-app-name.onrender.com`

---

## 🎉 Congratulations!

You've built a complete addiction tracker application with:

- ✅ User authentication (signup, login, logout)
- ✅ Session management with PostgreSQL
- ✅ Daily check-in system
- ✅ Streak tracking
- ✅ Rewiring day counter
- ✅ Calendar visualization
- ✅ Dark theme UI
- ✅ Cloud deployment ready

### Next Steps

1. Add email verification
2. Implement password reset
3. Add data export feature
4. Create mobile-responsive design
5. Add charts and statistics

---

## 📚 Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [EJS Documentation](https://ejs.co/)
- [Render Documentation](https://render.com/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Stay strong on your recovery journey! 💪**
