require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const cookieParser = require('cookie-parser');
const { pool } = require('./config/db');
const { requireLogin, setUserData } = require('./middleware/auth');
const Entry = require('./models/Entry');
const User = require('./models/User');
const StreakHistory = require('./models/StreakHistory');
const ClockHistory = require('./models/ClockHistory');
const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const calendarRoutes = require('./routes/calendar');
const summaryRoutes = require('./routes/summary');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const clockRoutes = require('./routes/clock');
const { getStreakSummary } = require('./utils/streakCalculator');
const { getTodayString, DEFAULT_TIMEZONE } = require('./utils/dateUtils');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Trust proxy for Render/Heroku (required for secure cookies behind proxy)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Timezone middleware - read timezone from cookie on every request
app.use((req, res, next) => {
  req.timezone = req.cookies.timezone || DEFAULT_TIMEZONE;
  res.locals.timezone = req.timezone;
  next();
});

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
    secure: process.env.NODE_ENV === 'production' && process.env.USE_HTTPS === 'true',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
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

// Clock routes (protected)
app.use('/', clockRoutes);

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

// Set timezone from client
app.post('/api/timezone', (req, res) => {
  const { timezone } = req.body;
  if (timezone) {
    req.session.timezone = timezone;
    req.session.save();
    res.json({ success: true, timezone });
  } else {
    res.status(400).json({ success: false, error: 'Timezone required' });
  }
});

// History page (protected)
app.get('/history', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log('History page - userId:', userId);
    const streakHistory = await StreakHistory.findByUser(userId);
    console.log('History page - streakHistory:', streakHistory);
    
    res.render('history', {
      title: 'Record History',
      streakHistory
    });
  } catch (error) {
    console.error('History page error:', error);
    res.render('history', {
      title: 'Record History',
      streakHistory: []
    });
  }
});

// Dashboard (protected)
app.get('/dashboard', requireLogin, async (req, res) => {
  try {
    console.log('Dashboard route - timezone:', req.timezone);
    const userId = req.session.userId;
    const userName = req.session.userName;
    const userTimezone = req.timezone;
    
    if (!userId) {
      console.log('No userId in session, redirecting to login');
      return res.redirect('/login');
    }
    const streakSummary = await getStreakSummary(userId, userTimezone);

    // Get today's date in user's timezone
    const today = getTodayString(userTimezone);
    
    // Check if today has been logged
    const todayEntry = await Entry.findByUserAndDate(userId, today);

    // Fetch all progress entries for this user
    const result = await pool.query(
      'SELECT id, date, had_leakage, note FROM entries WHERE user_id = $1 ORDER BY date DESC',
      [userId]
    );
    const progressEntries = result.rows.map(e => ({
      ...e,
      date: new Date(e.date)
    }));

    // Get streak history
    const streakHistory = await StreakHistory.findByUser(userId);

    // Check for deleted entry feedback message
    let deleteMessage = null;
    if (req.query.deleted && req.query.date) {
      deleteMessage = `Deleted ${req.query.deleted} entry for ${req.query.date}. Day count updated.`;
    }

    // Get clock start time for NoFap counter
    const clockStartTime = await User.getClockStart(userId);

    res.render('dashboard', {
      title: 'Dashboard',
      streakSummary,
      userName,
      progressEntries,
      streakHistory,
      todayEntry,
      today,
      deleteMessage,
      clockStartTime
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('dashboard', {
      title: 'Dashboard',
      streakSummary: {
        currentStreak: 0,
        totalDays: 0,
        cleanDays: 0,
        slipDays: 0,
        successRate: 0
      },
      userName: req.session.userName,
      progressEntries: [],
      streakHistory: [],
      todayEntry: null,
      today: getTodayString(req.timezone),
      clockStartTime: null
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
