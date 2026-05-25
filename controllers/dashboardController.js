const { fetchAllOpportunities } = require('../services/dataService');
const { rankOpportunities }     = require('../services/scoringService');
const Bookmark      = require('../models/Bookmark');
const Notification  = require('../models/Notification');
const UserProfile   = require('../models/UserProfile');
const User          = require('../models/User');

// ─── GET / — Main Dashboard ───────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const walletAddress = req.session.walletAddress || null;
    const userId        = req.session.userId || null;
    const { category = 'all', search = '', sort = 'score' } = req.query;

    // Fetch all opportunities
    const allOpportunities = await fetchAllOpportunities();

    // Load logged-in user for personalization
    let loggedInUser = null;
    if (userId) {
      loggedInUser = await User.findById(userId).lean();
    }

    // ── Scoring ──────────────────────────────────────────────────────────────
    // Always score — guests get neutral scoring, logged-in users get personalized
    const scoredOpportunities = rankOpportunities(allOpportunities, loggedInUser);
    const isPersonalized = !!(loggedInUser && loggedInUser.skills && loggedInUser.skills.length > 0);

    // ── Filter by category ───────────────────────────────────────────────────
    let filtered = category === 'all'
      ? scoredOpportunities
      : scoredOpportunities.filter(op => op.category === category);

    // ── Filter by search ─────────────────────────────────────────────────────
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(op =>
        op.title.toLowerCase().includes(q) ||
        (op.description || '').toLowerCase().includes(q) ||
        (op.tags || []).some(t => t.toLowerCase().includes(q)) ||
        op.source.toLowerCase().includes(q)
      );
    }

    // ── Sort ─────────────────────────────────────────────────────────────────
    if (sort === 'reward') {
      filtered.sort((a, b) => parseFloat(b.reward) - parseFloat(a.reward) || 0);
    } else if (sort === 'deadline') {
      filtered.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });
    } else if (sort === 'popular') {
      filtered.sort((a, b) => (b.applicants || 0) - (a.applicants || 0));
    } else {
      // 'score' (default) — already sorted by scoring engine
      // keep current order
    }

    // ── Hot opportunities (top scored + isHot flag) ──────────────────────────
    const hotOps = scoredOpportunities
      .filter(o => o.isHot)
      .slice(0, 6);

    // ── Top recommended for logged-in users ──────────────────────────────────
    const recommended = isPersonalized
      ? scoredOpportunities.filter(o => o.score >= 60).slice(0, 6)
      : [];

    // ── Bookmarks ────────────────────────────────────────────────────────────
    const bookmarkQuery = walletAddress
      ? { walletAddress }
      : userId
        ? { userId }
        : { walletAddress: 'anonymous' };
    const savedBookmarks = await Bookmark.find(bookmarkQuery).sort({ savedAt: -1 });
    const bookmarkIds = new Set(savedBookmarks.map(b => b.opportunityId));

    // ── Notifications ────────────────────────────────────────────────────────
    const notifQuery = walletAddress
      ? { $or: [{ walletAddress }, { walletAddress: 'global' }] }
      : { walletAddress: 'global' };
    const notifications = await Notification.find(notifQuery).sort({ createdAt: -1 }).limit(20);
    const unreadCount   = notifications.filter(n => !n.read).length;

    // ── User profile (wallet-based) ───────────────────────────────────────────
    let userProfile = null;
    if (walletAddress) {
      userProfile = await UserProfile.findOne({ walletAddress });
    }

    // ── Analytics ────────────────────────────────────────────────────────────
    const bounties = allOpportunities.filter(o => o.category === 'bounty');
    const grants   = allOpportunities.filter(o => o.category === 'grant');
    const jobs     = allOpportunities.filter(o => o.category === 'job');
    const events   = allOpportunities.filter(o => o.category === 'event');

    const analytics = {
      totalOpportunities: allOpportunities.length,
      activeBounties:  bounties.length,
      activeGrants:    grants.length,
      activeJobs:      jobs.length,
      activeEvents:    events.length,
      totalBookmarks:  savedBookmarks.length,
      hotCount:        hotOps.length,
      totalRewardPool: allOpportunities
        .filter(o => !isNaN(parseFloat(o.reward)))
        .reduce((sum, o) => sum + parseFloat(o.reward), 0),
    };

    res.render('dashboard', {
      title: 'Opportunities — ZEROSCOPE',
      opportunities: filtered,
      hotOpportunities: hotOps,
      recommended,
      analytics,
      bookmarkIds: [...bookmarkIds],
      savedBookmarks,
      notifications,
      unreadCount,
      userProfile,
      loggedInUser,
      isPersonalized,
      currentCategory: category,
      currentSearch: search,
      currentSort: sort,
      categories: ['all', 'bounty', 'grant', 'job', 'event'],
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    next(err);
  }
};
