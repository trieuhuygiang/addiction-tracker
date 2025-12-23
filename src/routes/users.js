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
      error: 'Không thể tải danh sách người dùng'
    });
  }
});

// Create new user
router.post('/users/create', requireAdmin, async (req, res) => {
  try {
    const { email, username, password, confirmPassword } = req.body;

    // Validation
    if (!email || !password) {
      return res.redirect('/users?error=' + encodeURIComponent('Email và mật khẩu là bắt buộc'));
    }

    if (password !== confirmPassword) {
      return res.redirect('/users?error=' + encodeURIComponent('Mật khẩu xác nhận không khớp'));
    }

    if (password.length < 6) {
      return res.redirect('/users?error=' + encodeURIComponent('Mật khẩu phải có ít nhất 6 ký tự'));
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.redirect('/users?error=' + encodeURIComponent('Email đã được đăng ký'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    await User.create(email, username || null, hashedPassword);

    res.redirect('/users?success=' + encodeURIComponent('Tạo người dùng thành công'));
  } catch (error) {
    console.error('Error creating user:', error);
    res.redirect('/users?error=' + encodeURIComponent('Không thể tạo người dùng'));
  }
});

// Update user
router.post('/users/update', requireAdmin, async (req, res) => {
  try {
    const { userId, email, username, password } = req.body;

    if (!userId || !email) {
      return res.redirect('/users?error=' + encodeURIComponent('Thiếu ID người dùng hoặc email'));
    }

    const updateData = { email, username: username || null };

    // If password is provided, hash it
    if (password && password.length >= 6) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    await User.update(userId, updateData);

    res.redirect('/users?success=' + encodeURIComponent('Cập nhật người dùng thành công'));
  } catch (error) {
    console.error('Error updating user:', error);
    res.redirect('/users?error=' + encodeURIComponent('Không thể cập nhật người dùng'));
  }
});

// Delete user
router.post('/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting own account
    if (userId == req.session.userId) {
      return res.redirect('/users?error=' + encodeURIComponent('Không thể xoá chính tài khoản của bạn'));
    }

    await User.delete(userId);

    res.redirect('/users?success=' + encodeURIComponent('Xoá người dùng thành công'));
  } catch (error) {
    console.error('Error deleting user:', error);
    res.redirect('/users?error=' + encodeURIComponent('Không thể xoá người dùng'));
  }
});

// API: Get counter theme preference
router.get('/api/counter-theme', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    const theme = await User.getCounterTheme(req.session.userId);
    res.json({ success: true, counterTheme: theme });
  } catch (error) {
    console.error('Error fetching counter theme:', error);
    res.status(500).json({ error: 'Không thể tải giao diện bộ đếm' });
  }
});

// API: Update counter theme preference
router.post('/api/counter-theme', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Chưa đăng nhập' });
    }

    const { theme } = req.body;
    const validThemes = ['ancient', 'modern', 'neon', 'minimal', 'ocean', 'forest', 'fire'];
    if (!theme || !validThemes.includes(theme)) {
      return res.status(400).json({ error: 'Giao diện không hợp lệ' });
    }

    const savedTheme = await User.setCounterTheme(req.session.userId, theme);
    res.json({ success: true, counterTheme: savedTheme });
  } catch (error) {
    console.error('Error updating counter theme:', error);
    res.status(500).json({ error: 'Không thể cập nhật giao diện bộ đếm' });
  }
});

module.exports = router;
