const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /auth/register
router.get('/register', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/register', {
    title: 'Create Account — ZEROSCOPE',
    error: req.flash('error'),
    success: req.flash('success'),
    unreadCount: 0,
  });
});

// POST /auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password) {
    req.flash('error', 'All fields are required.');
    return res.redirect('/auth/register');
  }
  if (password !== confirmPassword) {
    req.flash('error', 'Passwords do not match.');
    return res.redirect('/auth/register');
  }
  if (password.length < 6) {
    req.flash('error', 'Password must be at least 6 characters.');
    return res.redirect('/auth/register');
  }

  try {
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      req.flash('error', existing.email === email ? 'Email already registered.' : 'Username already taken.');
      return res.redirect('/auth/register');
    }

    const user = await User.create({ username, email, password });
    req.session.userId   = user._id.toString();
    req.session.username = user.username;
    req.session.userEmail = user.email;
    req.flash('success', `Welcome to ZEROSCOPE, ${user.username}!`);
    res.redirect('/');
  } catch (err) {
    req.flash('error', 'Registration failed. Try again.');
    res.redirect('/auth/register');
  }
});

// GET /auth/login
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/login', {
    title: 'Sign In — ZEROSCOPE',
    error: req.flash('error'),
    success: req.flash('success'),
    unreadCount: 0,
  });
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    req.flash('error', 'Email and password are required.');
    return res.redirect('/auth/login');
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !(await user.comparePassword(password))) {
      req.flash('error', 'Invalid email or password.');
      return res.redirect('/auth/login');
    }

    req.session.userId    = user._id.toString();
    req.session.username  = user.username;
    req.session.userEmail = user.email;
    req.flash('success', `Welcome back, ${user.username}!`);
    res.redirect('/');
  } catch (err) {
    req.flash('error', 'Login failed. Try again.');
    res.redirect('/auth/login');
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/auth/login'));
});

module.exports = router;
