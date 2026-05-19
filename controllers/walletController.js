const UserProfile = require('../models/UserProfile');

// POST /wallet/connect
exports.connectWallet = async (req, res) => {
  try {
    const { address, walletType } = req.body;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address) && address.length < 30) {
      return res.status(400).json({ success: false, message: 'Invalid wallet address' });
    }

    req.session.walletAddress = address;
    req.session.walletType = walletType || 'unknown';

    // Upsert user profile
    const profile = await UserProfile.findOneAndUpdate(
      { walletAddress: address },
      {
        walletType: walletType || 'unknown',
        lastActive: new Date(),
        $setOnInsert: { joinedAt: new Date() },
      },
      { new: true, upsert: true }
    );

    // Assign initial badges if new user
    if (profile.badges.length === 0 && profile.reputationScore === 0) {
      profile.badges.push({
        id: 'newcomer',
        name: 'Newcomer',
        description: 'Just joined ZEROSCOPE',
        icon: '🌱',
      });
      await profile.save();
    }

    res.json({
      success: true,
      address,
      profile: {
        reputationScore: profile.reputationScore,
        tier: profile.tier,
        badges: profile.badges,
        bookmarkCount: profile.bookmarkCount,
      }
    });
  } catch (err) {
    console.error('Wallet connect error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /wallet/disconnect
exports.disconnectWallet = async (req, res) => {
  try {
    if (req.session.walletAddress) {
      await UserProfile.findOneAndUpdate(
        { walletAddress: req.session.walletAddress },
        { lastActive: new Date() }
      );
    }
    req.session.walletAddress = null;
    req.session.walletType = null;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /wallet/profile
exports.getProfile = async (req, res) => {
  try {
    const walletAddress = req.session.walletAddress;
    if (!walletAddress) return res.json({ success: false, message: 'Not connected' });

    const profile = await UserProfile.findOne({ walletAddress });
    if (!profile) return res.json({ success: false, message: 'Profile not found' });

    res.json({
      success: true,
      profile: {
        walletAddress: profile.walletAddress,
        reputationScore: profile.reputationScore,
        tier: profile.tier,
        badges: profile.badges,
        bookmarkCount: profile.bookmarkCount,
        wonBounties: profile.wonBounties,
        joinedAt: profile.joinedAt,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
