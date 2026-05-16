const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();

// ─────────────────────────────
// MIDDLEWARE
// ─────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// SESSION
app.use(session({
  secret: process.env.SESSION_SECRET || 'ecommerce-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

// ─────────────────────────────
// VIEW ENGINE
// ─────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─────────────────────────────
// MONGODB CONNECTION
// ─────────────────────────────
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce')
  .then(() => console.log('✅ MongoDB Connected!'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// ─────────────────────────────
// ROUTES
// ─────────────────────────────
const authRouter  = require('./routes/auth');
const adminRouter = require('./routes/admin');
const indexRouter = require('./routes/index');

app.use('/', authRouter);   // login, register, logout
app.use('/', adminRouter);  // admin panel
app.use('/', indexRouter);  // home, products, cart

// ─────────────────────────────
// 404 HANDLER
// ─────────────────────────────
app.use((req, res) => {
  res.status(404).send('Page not found. <a href="/">Go Home</a>');
});

// ─────────────────────────────
// ERROR HANDLER
// ─────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong! <a href="/">Go Home</a>');
});

// ─────────────────────────────
// START SERVER
// ─────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running: http://localhost:${PORT}`);
});