const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const router = express.Router();
const User = require('../models/User');
const { requireLogout, requireLogin } = require('../middleware/auth');

// Sign up page (GET)
router.get('/signup', requireLogout, (req, res) => {
  res.render('signup', {
    title: 'Đăng ký',
    formAction: '/signup',
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
        title: 'Đăng ký',
        formAction: '/signup',
        error: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }

    if (password !== confirmPassword) {
      return res.render('signup', {
        title: 'Đăng ký',
        formAction: '/signup',
        error: 'Mật khẩu không khớp'
      });
    }

    // Check if username already exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.render('signup', {
        title: 'Đăng ký',
        formAction: '/signup',
        error: 'Tên đăng nhập đã được sử dụng'
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
      title: 'Đăng ký',
      formAction: '/signup',
      error: 'Đã xảy ra lỗi khi đăng ký'
    });
  }
});

// Login page (GET)
router.get('/login', requireLogout, (req, res) => {
  res.render('login', {
    title: 'Đăng nhập',
    formAction: '/login',
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
        title: 'Đăng nhập',
        formAction: '/login',
        error: 'Vui lòng nhập tên đăng nhập và mật khẩu'
      });
    }

    // Find user by username
    const user = await User.findByUsername(username);
    console.log('User found:', user ? 'yes' : 'no');

    if (!user) {
      return res.render('login', {
        title: 'Đăng nhập',
        formAction: '/login',
        error: 'Sai tên đăng nhập hoặc mật khẩu'
      });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      return res.render('login', {
        title: 'Đăng nhập',
        formAction: '/login',
        error: 'Sai tên đăng nhập hoặc mật khẩu'
      });
    }

    // Set session
    req.session.userId = user.id;
    req.session.userName = user.username;
    req.session.isAdmin = user.is_admin || false;
    console.log('Session set for user:', user.id, 'username:', user.username, 'isAdmin:', req.session.isAdmin);

    // Save session before redirecting
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.render('login', {
          title: 'Đăng nhập',
          formAction: '/login',
          error: 'Đã xảy ra lỗi khi đăng nhập'
        });
      }
      console.log('Session saved successfully, redirecting to dashboard');
      res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Login error:', error);
    res.render('login', {
      title: 'Đăng nhập',
      formAction: '/login',
      error: 'Đã xảy ra lỗi khi đăng nhập'
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

// Forgot Password page (GET)
router.get('/forgot-password', requireLogout, (req, res) => {
  res.render('forgot-password', {
    title: 'Quên mật khẩu',
    error: null,
    message: null,
    resetToken: null
  });
});

// Forgot Password (POST) - Check username and generate token
router.post('/forgot-password', requireLogout, async (req, res) => {
  try {
    const { username } = req.body;

    // Validate username
    if (!username) {
      return res.render('forgot-password', {
        title: 'Quên mật khẩu',
        error: 'Vui lòng nhập tên đăng nhập',
        message: null,
        resetToken: null
      });
    }

    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      return res.render('forgot-password', {
        title: 'Quên mật khẩu',
        error: 'Không tìm thấy tài khoản với tên đăng nhập này',
        message: null,
        resetToken: null
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token and expiry to user
    await User.updateResetToken(user.id, resetToken, resetTokenExpiry);

    // Show the reset form with the token
    res.render('forgot-password', {
      title: 'Quên mật khẩu',
      error: null,
      message: 'Đã xác minh tên đăng nhập! Hãy nhập mật khẩu mới bên dưới.',
      resetToken: resetToken
    });
  } catch (error) {
    console.error('Forgot Password error:', error);
    res.render('forgot-password', {
      title: 'Quên mật khẩu',
      error: 'Đã xảy ra lỗi khi xử lý yêu cầu.',
      message: null,
      resetToken: null
    });
  }
});

// Reset Password (POST) - Set new password
router.post('/reset-password', requireLogout, async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    // Validate inputs
    if (!token || !password || !confirmPassword) {
      return res.render('forgot-password', {
        title: 'Quên mật khẩu',
        error: 'Vui lòng điền đầy đủ các trường',
        message: null,
        resetToken: token
      });
    }

    if (password !== confirmPassword) {
      return res.render('forgot-password', {
        title: 'Quên mật khẩu',
        error: 'Mật khẩu không khớp',
        message: 'Hãy nhập mật khẩu mới bên dưới.',
        resetToken: token
      });
    }

    // Find user by reset token
    const user = await User.findByResetToken(token);
    if (!user) {
      return res.render('forgot-password', {
        title: 'Quên mật khẩu',
        error: 'Mã đặt lại không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.',
        message: null,
        resetToken: null
      });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.updatePassword(user.id, hashedPassword);

    // Redirect to login with success message
    res.render('login', {
      title: 'Đăng nhập',
      formAction: '/login',
      error: null,
      success: 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới.'
    });
  } catch (error) {
    console.error('Reset Password error:', error);
    res.render('forgot-password', {
      title: 'Quên mật khẩu',
      error: 'Đã xảy ra lỗi khi đặt lại mật khẩu.',
      message: null,
      resetToken: null
    });
  }
});

module.exports = router;
