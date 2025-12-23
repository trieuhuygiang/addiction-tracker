const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const User = require('../models/User');
const { query } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');
const { autoTrackClean } = require('../utils/scheduler');

// Admin Dashboard - List all users
router.get('/admin', requireAdmin, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, email, username, is_admin, created_at FROM users ORDER BY created_at DESC'
    );
    const users = result.rows;

    // Get entry counts for each user
    const userStats = await Promise.all(users.map(async (user) => {
      const entryResult = await query(
        'SELECT COUNT(*) as entry_count FROM entries WHERE user_id = $1',
        [user.id]
      );
      return {
        ...user,
        entry_count: parseInt(entryResult.rows[0].entry_count)
      };
    }));

    res.render('admin', {
      title: 'Quản trị',
      users: userStats,
      success: req.query.success ? decodeURIComponent(req.query.success) : null,
      error: req.query.error ? decodeURIComponent(req.query.error) : null
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.render('admin', {
      title: 'Quản trị',
      users: [],
      success: null,
      error: 'Không thể tải danh sách người dùng'
    });
  }
});

// Create new user (admin only)
router.post('/admin/users/create', requireAdmin, async (req, res) => {
  try {
    const { email, username, password, confirmPassword, isAdmin } = req.body;

    // Validation
    if (!email || !password) {
      return res.redirect('/admin?error=' + encodeURIComponent('Email và mật khẩu là bắt buộc'));
    }

    if (password !== confirmPassword) {
      return res.redirect('/admin?error=' + encodeURIComponent('Mật khẩu xác nhận không khớp'));
    }

    if (password.length < 6) {
      return res.redirect('/admin?error=' + encodeURIComponent('Mật khẩu phải có ít nhất 6 ký tự'));
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.redirect('/admin?error=' + encodeURIComponent('Email đã được đăng ký'));
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with admin flag
    await query(
      'INSERT INTO users (email, username, password_hash, is_admin) VALUES ($1, $2, $3, $4)',
      [email, username || null, hashedPassword, isAdmin === 'on']
    );

    res.redirect('/admin?success=' + encodeURIComponent('Tạo người dùng thành công'));
  } catch (error) {
    console.error('Error creating user:', error);
    res.redirect('/admin?error=' + encodeURIComponent('Không thể tạo người dùng'));
  }
});

// Update user (admin only)
router.post('/admin/users/update', requireAdmin, async (req, res) => {
  try {
    const { userId, username, password, isAdmin } = req.body;

    if (!userId) {
      return res.redirect('/admin?error=' + encodeURIComponent('Thiếu ID người dùng'));
    }

    // Build update query
    let updateQuery = 'UPDATE users SET username = $1, is_admin = $2';
    let params = [username || null, isAdmin === 'on'];

    // If password is provided, hash it
    if (password && password.trim()) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password_hash = $3 WHERE id = $4';
      params.push(hashedPassword, userId);
    } else {
      updateQuery += ' WHERE id = $3';
      params.push(userId);
    }

    await query(updateQuery, params);

    res.redirect('/admin?success=' + encodeURIComponent('Cập nhật người dùng thành công'));
  } catch (error) {
    console.error('Error updating user:', error);
    res.redirect('/admin?error=' + encodeURIComponent('Không thể cập nhật người dùng'));
  }
});

// Delete user (admin only)
router.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting own account
    if (userId == req.session.userId) {
      return res.redirect('/admin?error=' + encodeURIComponent('Không thể xoá chính tài khoản của bạn'));
    }

    await User.delete(userId);

    res.redirect('/admin?success=' + encodeURIComponent('Xoá người dùng thành công'));
  } catch (error) {
    console.error('Error deleting user:', error);
    res.redirect('/admin?error=' + encodeURIComponent('Không thể xoá người dùng'));
  }
});

// Toggle admin status
router.post('/admin/users/:id/toggle-admin', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent toggling own admin status
    if (userId == req.session.userId) {
      return res.redirect('/admin?error=' + encodeURIComponent('Không thể tự thay đổi quyền quản trị của bạn'));
    }

    // Get current admin status
    const result = await query('SELECT is_admin FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.redirect('/admin?error=' + encodeURIComponent('Không tìm thấy người dùng'));
    }

    const currentStatus = result.rows[0].is_admin;
    await query('UPDATE users SET is_admin = $1 WHERE id = $2', [!currentStatus, userId]);

    res.redirect('/admin?success=' + encodeURIComponent('Đã cập nhật quyền quản trị'));
  } catch (error) {
    console.error('Error toggling admin:', error);
    res.redirect('/admin?error=' + encodeURIComponent('Không thể cập nhật quyền quản trị'));
  }
});

// Manual auto-track trigger (admin only)
router.post('/admin/auto-track', requireAdmin, async (req, res) => {
  try {
    const { date } = req.body;
    const result = await autoTrackClean(date || null);
    res.redirect('/admin?success=' + encodeURIComponent(`Auto-track: đã đánh dấu ${result.tracked} người dùng là Thanh tịnh`));
  } catch (error) {
    console.error('Error running auto-track:', error);
    res.redirect('/admin?error=' + encodeURIComponent('Không thể chạy auto-track'));
  }
});

module.exports = router;
