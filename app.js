require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');
const { getMockData } = require('./services/dataService');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroscope';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected to ZEROSCOPE database'))
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.warn('Continuing without MongoDB connection for diagnostics.');
  });

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

// ─── View Engine ──────────────────────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(morgan('dev'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'zeroscope_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());

// ─── Global Locals ────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.walletAddress = req.session.walletAddress || null;
  res.locals.userId = req.session.userId || null;
  res.locals.username = req.session.username || null;
  res.locals.userBadges = req.session.userBadges || [];
  res.locals.notifications = req.session.notifications || [];
  res.locals.currentPath = req.path;
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
const dashboardRoutes = require('./routes/dashboard');
const bookmarkRoutes  = require('./routes/bookmarks');
const walletRoutes    = require('./routes/wallet');
const apiRoutes       = require('./routes/api');
const notifRoutes     = require('./routes/notifications');
const profileRoutes   = require('./routes/profile');
const authRoutes      = require('./routes/auth');

app.use('/', dashboardRoutes);
app.use('/bookmarks', bookmarkRoutes);
app.use('/wallet', walletRoutes);
app.use('/api', apiRoutes);
app.use('/notifications', notifRoutes);
app.use('/profile', profileRoutes);
app.use('/auth', authRoutes);

// ─── Scheduled Jobs ───────────────────────────────────────────────────────────
const { checkDeadlines } = require('./services/notificationService');
// Check every 30 minutes for upcoming deadlines
cron.schedule('*/30 * * * *', async () => {
  console.log('🔔 Checking opportunity deadlines...');
  await checkDeadlines();
});

// Health-check endpoint for quick diagnostics (placed before 404 handler)
app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    const sample = (getMockData && typeof getMockData === 'function') ? getMockData() : [];
    res.json({ ok: true, dbState, sampleCount: Array.isArray(sample) ? sample.length : 0 });
  } catch (err) {
    console.error('Health check error:', err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found — ZEROSCOPE',
    code: 404,
    message: 'The page you are looking for does not exist.',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Enhanced logging for debugging: include request path and session info
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
    userId: req.session && req.session.userId ? req.session.userId : null,
    method: req.method,
  });

  res.status(err.status || 500).render('error', {
    title: 'Server Error — ZEROSCOPE',
    code: err.status || 500,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
  });
});

// Health-check endpoint for quick diagnostics
app.get('/health', async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState; // 0 disconnected, 1 connected, 2 connecting, 3 disconnecting
    const sample = (getMockData && typeof getMockData === 'function') ? getMockData() : [];
    res.json({ ok: true, dbState, sampleCount: Array.isArray(sample) ? sample.length : 0 });
  } catch (err) {
    console.error('Health check error:', err && err.stack ? err.stack : err);
    res.status(500).json({ ok: false, error: err.message || String(err) });
  }
});

// Catch unhandled promise rejections and uncaught exceptions to log for diagnostics
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason && reason.stack ? reason.stack : reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
  // Optionally exit process in production: process.exit(1);
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   ZEROSCOPE is live               ║
  ║   http://localhost:${PORT}              ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
