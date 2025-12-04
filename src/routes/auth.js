const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');
const { requireLogout, requireLogin } = require('../middleware/auth');

// Sign up page (GET)
router.get('/signup', requireLogout, (req, res) => {
  res.render('signup', { 
    title: 'Sign Up',
    error: null 
  });
});

// Sign up (POST)
router.post('/signup', requireLogout, async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    // Validation
    if (!username || !password) {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Username and password are required'
      });
    }

    if (password !== confirmPassword) {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Passwords do not match'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.render('signup', {
        title: 'Sign Up',
        error: 'Username already taken'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user (no email needed)
    const newUser = await User.create(null, username, hashedPassword);

    // Set session
    req.session.userId = newUser.id;
    req.session.userEmail = newUser.username;

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('signup', {
      title: 'Sign Up',
      error: 'An error occurred during registration'
    });
  }
});

// Login page (GET)
router.get('/login', requireLogout, (req, res) => {
  res.render('login', { 
    title: 'Login',
    error: null 
  });
});

// Login (POST)
router.post('/login', requireLogout, async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', { username });

    // Validation
    if (!username || !password) {
      return res.render('login', {
        title: 'Login',
        error: 'Username and password are required'
      });
    }

    // Find user by username
    const user = await User.findByUsername(username);
    console.log('User found:', user ? 'yes' : 'no');
    
    if (!user) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid username or password'
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.userEmail = user.email;
    req.session.isAdmin = user.is_admin || false;
    console.log('Session set for user:', user.id, 'isAdmin:', req.session.isAdmin);

    // Save session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('login', {
          title: 'Login',
          error: 'An error occurred during login'
        });
      }
      console.log('Session saved successfully, redirecting to dashboard');
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      title: 'Login',
      error: 'An error occurred during login'
    });
  }
});

// Logout (POST)
router.post('/logout', requireLogin, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/dashboard');
    }
    res.redirect('/');
  });
});

module.exports = router;
