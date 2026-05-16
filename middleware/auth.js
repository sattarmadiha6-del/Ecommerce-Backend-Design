const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// ── Normal user logged in check ──────────────
function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

// ── Admin only check ─────────────────────────
function isAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'admin') {
    return next();
  }
  res.status(403).send(`
    <div style="font-family:sans-serif;text-align:center;padding:60px;">
      <h2>❌ Access Denied</h2>
      <p>You need admin privileges to access this page.</p>
      <a href="/" style="color:#1a73e8;">Go Home</a>
    </div>
  `);
}

module.exports = { isLoggedIn, isAdmin };