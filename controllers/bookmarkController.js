const Bookmark = require('../models/Bookmark');
const UserProfile = require('../models/UserProfile');
const Notification = require('../models/Notification');

// ─── GET /bookmarks ───────────────────────────────────────────────────────────
exports.getBookmarks = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Require login for bookmarks
    if (!userId) {
      req.flash('error', 'Please sign in to view your bookmarks.');
      return res.redirect('/auth/login');
    }
    
    const { status = 'all', category = 'all' } = req.query;

    let query = { userId };
    if (status !== 'all') query.status = status;
    if (category !== 'all') query.category = category;

    const bookmarks = await Bookmark.find(query).sort({ savedAt: -1 });
    const notifications = await Notification.find({
      userId: userId
    }).sort({ createdAt: -1 }).limit(20);
    const unreadCount = notifications.filter(n => !n.read).length;

    const analytics = {
      total: bookmarks.length,
      active: bookmarks.filter(b => b.status === 'active').length,
      applied: bookmarks.filter(b => b.status === 'applied').length,
      won: bookmarks.filter(b => b.status === 'won').length,
      expired: bookmarks.filter(b => b.status === 'expired' || (b.deadline && new Date(b.deadline) < new Date())).length,
      byCategory: {
        bounty: bookmarks.filter(b => b.category === 'bounty').length,
        grant:  bookmarks.filter(b => b.category === 'grant').length,
        job:    bookmarks.filter(b => b.category === 'job').length,
        event:  bookmarks.filter(b => b.category === 'event').length,
      }
    };

    res.render('bookmarks', {
      title: 'My Bookmarks — ZEROSCOPE',
      bookmarks,
      analytics,
      notifications,
      unreadCount,
      currentStatus: status,
      currentCategory: category,
    });
  } catch (err) {
    console.error('Bookmarks error:', err);
    res.status(500).render('error', { title: 'Error', code: 500, message: err.message });
  }
};

// ─── POST /bookmarks ──────────────────────────────────────────────────────────
exports.saveBookmark = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    // Require login
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please sign in first', requiresLogin: true });
    }
    
    const {
      opportunityId, title, description, category,
      source, sourceUrl, reward, rewardToken, deadline, tags, difficulty,
    } = req.body;

    const existing = await Bookmark.findOne({ opportunityId, userId });
    if (existing) {
      return res.status(200).json({ success: false, message: 'Already bookmarked', alreadySaved: true });
    }

    const bookmark = await Bookmark.create({
      opportunityId,
      userId,
      title,
      description: description || '',
      category: category || 'bounty',
      source: source || 'Unknown',
      sourceUrl: sourceUrl || '',
      reward: reward || 'TBD',
      rewardToken: rewardToken || 'USD',
      deadline: deadline ? new Date(deadline) : null,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      difficulty: difficulty || 'intermediate',
    });

    res.status(201).json({ success: true, message: 'Saved!', bookmarkId: bookmark._id });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(200).json({ success: false, message: 'Already bookmarked', alreadySaved: true });
    }
    console.error('Save bookmark error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── DELETE /bookmarks/:id ────────────────────────────────────────────────────
exports.deleteBookmark = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      req.flash('error', 'Please sign in first.');
      return res.redirect('/auth/login');
    }
    
    await Bookmark.findOneAndDelete({ _id: req.params.id, userId });
    req.flash('success', 'Bookmark removed.');
    res.redirect('/bookmarks');
  } catch (err) {
    console.error('Delete bookmark error:', err);
    req.flash('error', 'Could not remove bookmark.');
    res.redirect('/bookmarks');
  }
};

// ─── PATCH /bookmarks/:id/status ─────────────────────────────────────────────
exports.updateStatus = async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Please sign in first' });
    }
    
    const { status } = req.body;
    const bookmark = await Bookmark.findOneAndUpdate(
      { _id: req.params.id, userId },
      { status },
      { new: true }
    );

    if (status === 'won' && bookmark) {
      await Notification.create({
        userId,
        type: 'won',
        title: 'Congratulations',
        message: `You marked "${bookmark.title}" as Won! Your reputation has increased.`,
        opportunityId: bookmark.opportunityId,
        opportunityTitle: bookmark.title,
        link: '/bookmarks',
      });
    }

    res.json({ success: true, status: bookmark?.status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
