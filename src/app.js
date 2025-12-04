require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { pool } = require('./config/db');
const { requireLogin, setUserData } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const calendarRoutes = require('./routes/calendar');
const summaryRoutes = require('./routes/summary');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const { getStreakSummary } = require('./utils/streakCalculator');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration with PostgreSQL store
app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    // Only set secure to true if explicitly using HTTPS
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// User data middleware
app.use(setUserData);

// Routes
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'Addiction Tracker'
  });
});

// Auth routes
app.use('/', authRoutes);

// Users routes (protected)
app.use('/', usersRoutes);

// Entries routes (protected)
app.use('/', entriesRoutes);

// Calendar routes (protected)
app.use('/', calendarRoutes);

// Summary routes (protected)
app.use('/', summaryRoutes);

// Admin routes (protected)
app.use('/', adminRoutes);

// Test session route
app.get('/test-session', (req, res) => {
  console.log('Test session route - Session data:', req.session);
  res.json({
    sessionId: req.sessionID,
    userId: req.session.userId,
    userEmail: req.session.userEmail,
    isAuthenticated: !!req.session.userId
  });
});

// Dashboard (protected)
app.get('/dashboard', requireLogin, async (req, res) => {
  try {
    console.log('Dashboard route session:', req.session);
    const userId = req.session.userId;
    const userName = req.session.userName;
    if (!userId) {
      console.log('No userId in session, redirecting to login');
      return res.redirect('/login');
    }
    const streakSummary = await getStreakSummary(userId);

    // Fetch all progress entries for this user
    const result = await pool.query(
      'SELECT date, had_leakage, note FROM entries WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );
    const progressEntries = result.rows.map(e => ({
      ...e,
      date: new Date(e.date)
    }));

    res.render('dashboard', {
      title: 'Dashboard',
      streakSummary,
      userName,
      progressEntries
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard', {
      title: 'Dashboard',
      streakSummary: {
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        cleanDays: 0,
        leakageDays: 0,
        successRate: 0
      },
      userName: req.session.userName,
      progressEntries: []
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Error',
    error: process.env.NODE_ENV === 'production' ? {} : err 
  });
});

module.exports = app;
