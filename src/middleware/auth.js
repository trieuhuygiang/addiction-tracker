// Middleware to check if user is logged in
const requireLogin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Middleware to check if user is not logged in
const requireLogout = (req, res, next) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  if (!req.session.isAdmin) {
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this page.'
    });
  }
  next();
};

// Middleware to set user data in locals for views
const setUserData = (req, res, next) => {
  if (req.session.userId) {
    res.locals.isAuthenticated = true;
    res.locals.userId = req.session.userId;
    res.locals.userEmail = req.session.userEmail;
    res.locals.isAdmin = req.session.isAdmin || false;
  } else {
    res.locals.isAuthenticated = false;
    res.locals.isAdmin = false;
  }
  // Make timezone available to views
  res.locals.timezone = req.session.timezone || 'UTC';
  next();
};

module.exports = {
  requireLogin,
  requireLogout,
  requireAdmin,
  setUserData,
};
