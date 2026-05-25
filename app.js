require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const morgan = require('morgan');
const path = require('path');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/zeroscope';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected to ZEROSCOPE database'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

mongoose.connection.on('disconnected', () => console.warn('⚠️  MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('✅ MongoDB reconnected'));

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
  console.error('❌ Error:', err.stack);
  res.status(err.status || 500).render('error', {
    title: 'Server Error — ZEROSCOPE',
    code: err.status || 500,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : err.message,
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   🔭 ZEROSCOPE is live               ║
  ║   http://localhost:${PORT}              ║
  ╚══════════════════════════════════════╝
  `);
});

module.exports = app;
