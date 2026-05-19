const Notification = require('../models/Notification');
const Bookmark = require('../models/Bookmark');

async function checkDeadlines() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in72h = new Date(now.getTime() + 72 * 60 * 60 * 1000);

    // Find bookmarks expiring within 72 hours that haven't been notified
    const urgentBookmarks = await Bookmark.find({
      deadline: { $gte: now, $lte: in72h },
      status: 'active',
    });

    for (const bookmark of urgentBookmarks) {
      const hoursLeft = Math.ceil((new Date(bookmark.deadline) - now) / (1000 * 60 * 60));
      const isVeryCritical = new Date(bookmark.deadline) <= in24h;

      // Check if we already sent this notification in the last 12 hours
      const recentNotif = await Notification.findOne({
        walletAddress: bookmark.walletAddress,
        opportunityId: bookmark.opportunityId,
        type: isVeryCritical ? 'deadline_critical' : 'deadline_warning',
        createdAt: { $gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) },
      });

      if (!recentNotif) {
        await Notification.create({
          walletAddress: bookmark.walletAddress,
          type: isVeryCritical ? 'deadline_critical' : 'deadline_warning',
          title: isVeryCritical ? '🚨 Deadline in < 24 hours!' : '⏰ Deadline approaching',
          message: `"${bookmark.title}" ${isVeryCritical ? 'ends in less than 24 hours' : `ends in ~${hoursLeft} hours`}. Don't miss out!`,
          opportunityId: bookmark.opportunityId,
          opportunityTitle: bookmark.title,
          link: `/bookmarks`,
        });
      }
    }

    console.log(`✅ Deadline check complete. Processed ${urgentBookmarks.length} items.`);
  } catch (err) {
    console.error('❌ Notification service error:', err.message);
  }
}

async function createNewBountyNotification(opportunity) {
  try {
    await Notification.create({
      walletAddress: 'global',
      type: opportunity.category === 'grant' ? 'new_grant' : opportunity.category === 'job' ? 'new_job' : 'new_bounty',
      title: `🆕 New ${opportunity.category}: ${opportunity.title.slice(0, 50)}`,
      message: `A new ${opportunity.category} just dropped from ${opportunity.source}. Reward: ${opportunity.reward} ${opportunity.rewardToken}.`,
      opportunityId: opportunity.id,
      opportunityTitle: opportunity.title,
      link: `/`,
    });
  } catch (err) {
    console.error('❌ Could not create bounty notification:', err.message);
  }
}

module.exports = { checkDeadlines, createNewBountyNotification };
