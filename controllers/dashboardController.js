const { fetchAllOpportunities } = require('../services/dataService');
const Bookmark = require('../models/Bookmark');
const Notification = require('../models/Notification');
const UserProfile = require('../models/UserProfile');

// ─── GET / — Main Dashboard ───────────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress || null;
    const { category = 'all', search = '', sort = 'newest' } = req.query;

    // Fetch all opportunities from all sources
    const allOpportunities = await fetchAllOpportunities();

    // Filter by category
    let filtered = category === 'all'
      ? allOpportunities
      : allOpportunities.filter(op => op.category === category);

    // Filter by search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(op =>
        op.title.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) ||
        op.tags.some(t => t.toLowerCase().includes(q)) ||
        op.source.toLowerCase().includes(q)
      );
    }

    // Sort
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
      // newest (default)
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Segment by category for analytics
    const bounties  = allOpportunities.filter(o => o.category === 'bounty');
    const grants    = allOpportunities.filter(o => o.category === 'grant');
    const jobs      = allOpportunities.filter(o => o.category === 'job');
    const events    = allOpportunities.filter(o => o.category === 'event');
    const hotOps    = allOpportunities.filter(o => o.isHot).slice(0, 6);

    // Bookmarks analytics
    const bookmarkQuery = walletAddress
      ? { walletAddress }
      : { walletAddress: 'anonymous' };
    const savedBookmarks = await Bookmark.find(bookmarkQuery).sort({ savedAt: -1 });
    const bookmarkIds = new Set(savedBookmarks.map(b => b.opportunityId));

    // Notifications
    const notifQuery = walletAddress
      ? { $or: [{ walletAddress }, { walletAddress: 'global' }] }
      : { walletAddress: 'global' };
    const notifications = await Notification.find(notifQuery)
      .sort({ createdAt: -1 })
      .limit(20);
    const unreadCount = notifications.filter(n => !n.read).length;

    // User profile
    let userProfile = null;
    if (walletAddress) {
      userProfile = await UserProfile.findOne({ walletAddress });
    }

    // Analytics summary
    const analytics = {
      totalOpportunities: allOpportunities.length,
      activeBounties: bounties.length,
      activeGrants: grants.length,
      activeJobs: jobs.length,
      activeEvents: events.length,
      totalBookmarks: savedBookmarks.length,
      hotCount: hotOps.length,
      totalRewardPool: allOpportunities
        .filter(o => !isNaN(parseFloat(o.reward)))
        .reduce((sum, o) => sum + parseFloat(o.reward), 0),
    };

    res.render('dashboard', {
      title: 'Dashboard — ZEROSCOPE',
      opportunities: filtered,
      hotOpportunities: hotOps,
      analytics,
      bookmarkIds: [...bookmarkIds],
      savedBookmarks,
      notifications,
      unreadCount,
      userProfile,
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
