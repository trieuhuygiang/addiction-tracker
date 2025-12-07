const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');

// Admin middleware - check if user is admin (for now, just require login)
const requireAdmin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Get all users
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await User.query(
      'SELECT id, email, username, created_at FROM users ORDER BY created_at DESC'
    );
    const users = result.rows;

    res.render('users', {
      title: 'User Management',
      users,
      success: req.query.success ? decodeURIComponent(req.query.success) : null,
      error: req.query.error ? decodeURIComponent(req.query.error) : null
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('users', {
      title: 'User Management',
      users: [],
      error: 'Error loading users'
    });
  }
});

// Create new user
router.post('/users/create', requireAdmin, async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;

    // Validation
    if (!email || !password) {
      return res.redirect('/users?error=' + encodeURIComponent('Email and password are required'));
    }

    if (password !== confirmPassword) {
      return res.redirect('/users?error=' + encodeURIComponent('Passwords do not match'));
    }

    if (password.length < 6) {
      return res.redirect('/users?error=' + encodeURIComponent('Password must be at least 6 characters'));
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.redirect('/users?error=' + encodeURIComponent('Email already registered'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await User.create(email, username || null, hashedPassword);

    res.redirect('/users?success=' + encodeURIComponent('User created successfully'));
  } catch (error) {
    console.error('Error creating user:', error);
    res.redirect('/users?error=' + encodeURIComponent('Error creating user'));
  }
});

// Update user
router.post('/users/update', requireAdmin, async (req, res) => {
  try {
    const { userId, email, username, password } = req.body;

    if (!userId || !email) {
      return res.redirect('/users?error=' + encodeURIComponent('User ID and email are required'));
    }

    const updateData = { email, username: username || null };

    // If password is provided, hash it
    if (password && password.length >= 6) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    await User.update(userId, updateData);

    res.redirect('/users?success=' + encodeURIComponent('User updated successfully'));
  } catch (error) {
    console.error('Error updating user:', error);
    res.redirect('/users?error=' + encodeURIComponent('Error updating user'));
  }
});

// Delete user
router.post('/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting own account
    if (userId == req.session.userId) {
      return res.redirect('/users?error=' + encodeURIComponent('Cannot delete your own account'));
    }

    await User.delete(userId);

    res.redirect('/users?success=' + encodeURIComponent('User deleted successfully'));
  } catch (error) {
    console.error('Error deleting user:', error);
    res.redirect('/users?error=' + encodeURIComponent('Error deleting user'));
  }
});

// API: Get counter theme preference
router.get('/api/counter-theme', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const theme = await User.getCounterTheme(req.session.userId);
    res.json({ success: true, counterTheme: theme });
  } catch (error) {
    console.error('Error fetching counter theme:', error);
    res.status(500).json({ error: 'Error fetching counter theme' });
  }
});

// API: Update counter theme preference
router.post('/api/counter-theme', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { theme } = req.body;
    const validThemes = ['ancient', 'modern', 'neon', 'minimal', 'ocean', 'forest', 'fire'];
    if (!theme || !validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme' });
    }

    const savedTheme = await User.setCounterTheme(req.session.userId, theme);
    res.json({ success: true, counterTheme: savedTheme });
  } catch (error) {
    console.error('Error updating counter theme:', error);
    res.status(500).json({ error: 'Error updating counter theme' });
  }
});

module.exports = router;
