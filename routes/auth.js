const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-here';

// ─────────────────────────────────────────────
// GET /login
// ─────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/');
  res.render('login', { title: 'Login', error: null, user: null });
});

// ─────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', {
        title: 'Login',
        error: 'Email and password are required',
        user:  null
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid email or password',
        user:  null
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', {
        title: 'Login',
        error: 'Invalid email or password',
        user:  null
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    req.session.userId = user._id;
    req.session.user   = {
      id:    user._id,
      name:  user.name,
      email: user.email,
      role:  user.role
    };
    req.session.token = token;

    if (user.role === 'admin') {
      res.redirect('/admin/products');
    } else {
      res.redirect('/');
    }

  } catch (err) {
    console.error(err);
    res.render('login', {
      title: 'Login',
      error: 'Server error, try again',
      user:  null
    });
  }
});

// ─────────────────────────────────────────────
// GET /register
// ─────────────────────────────────────────────
router.get('/register', (req, res) => {
  if (req.session && req.session.user) return res.redirect('/');
  res.render('register', { title: 'Register', error: null, user: null });
});

// ─────────────────────────────────────────────
// POST /register
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.render('register', {
        title: 'Register',
        error: 'All fields are required',
        user:  null
      });
    }

    if (password !== confirmPassword) {
      return res.render('register', {
        title: 'Register',
        error: 'Passwords do not match',
        user:  null
      });
    }

    if (password.length < 6) {
      return res.render('register', {
        title: 'Register',
        error: 'Password must be at least 6 characters',
        user:  null
      });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.render('register', {
        title: 'Register',
        error: 'Email already registered. Please login.',
        user:  null
      });
    }

    const newUser = await User.create({ name, email, password });

    req.session.userId = newUser._id;
    req.session.user   = {
      id:    newUser._id,
      name:  newUser.name,
      email: newUser.email,
      role:  newUser.role
    };

    res.redirect('/');

  } catch (err) {
    console.error(err);
    res.render('register', {
      title: 'Register',
      error: 'Server error, try again',
      user:  null
    });
  }
});

// ─────────────────────────────────────────────
// GET /logout
// ─────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// ─────────────────────────────────────────────
// GET /create-admin — SIRF EK BAAR RUN KARO
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// GET /create-admin — SIRF EK BAAR RUN KARO
// ─────────────────────────────────────────────
router.get('/create-admin', async (req, res) => {
  try {
    const existing = await User.findOne({ email: 'admin@brand.com' });

    if (existing) {
      return res.send(`
        <div style="font-family:sans-serif;padding:30px;text-align:center;">
          <h2>⚠️ Admin already exists!</h2><br/>
          <a href="/login" style="padding:10px 24px;background:#1a73e8;color:#fff;border-radius:4px;text-decoration:none;">
            Go to Login
          </a>
        </div>
      `);
    }

    await User.create({
      name: 'Admin',
      email: 'admin@brand.com',
      password: 'admin123',
      role: 'admin'
    });

    res.send(`
      <div style="font-family:sans-serif;padding:30px;text-align:center;">
        <h2>✅ Admin Created Successfully!</h2>
        <p>Email: admin@brand.com</p>
        <p>Password: admin123</p><br/>
        <a href="/login" style="padding:10px 24px;background:#1a73e8;color:#fff;border-radius:4px;text-decoration:none;">
          Login Now
        </a>
      </div>
    `);

  } catch (err) {
    console.error("ADMIN ERROR:", err);

    res.send(`
      <h2>❌ Error</h2>
      <p>${err.message}</p>
    `);
  }
});
// ─────────────────────────────────────────────
// GET /profile
// ─────────────────────────────────────────────
router.get('/profile', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }
  res.render('profile', {
    title: 'My Profile',
    user:  req.session.user
  });
});

module.exports = router;