const axios = require('axios');

const SOURCES = {
  ZERO_AUTHORITY_API: process.env.ZERO_AUTHORITY_API || 'https://api.zeroauthoritydao.com',
  ZERO_AUTHORITY_WEB: 'https://zeroauthoritydao.com',
  GITCOIN: 'https://gitcoin.co/api/v1',
};

function normalise(raw, source, category = 'bounty') {
  return {
    id: String(raw.id || raw._id || raw.uuid || Math.random().toString(36).slice(2)),
    title: raw.title || raw.name || 'Untitled Opportunity',
    description: raw.description || raw.summary || raw.body || '',
    category,
    source,
    sourceUrl: raw.url || raw.link || raw.externalLink || '',
    reward: raw.reward || raw.bounty || raw.amount || raw.prize || 'TBD',
    rewardToken: raw.rewardToken || raw.currency || raw.token || 'USD',
    deadline: raw.deadline || raw.expiresAt || raw.endDate || raw.end_date || null,
    tags: Array.isArray(raw.tags) ? raw.tags : (raw.skills ? raw.skills.map(s => s.name || s) : []),
    difficulty: raw.difficulty || raw.level || 'intermediate',
    applicants: raw.applicants || raw.submissions || raw.claimants || 0,
    isHot: raw.isHot || raw.featured || raw.trending || false,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    raw,
  };
}

async function fetchZeroAuthority() {
  try {
    const BASE = SOURCES.ZERO_AUTHORITY_API;
    const [bountiesRes, grantsRes, eventsRes] = await Promise.allSettled([
      axios.get(`${BASE}/bounties`, { timeout: 8000 }),
      axios.get(`${BASE}/grants`,   { timeout: 8000 }),
      axios.get(`${BASE}/events`,   { timeout: 8000 }),
    ]);
    const bounties = bountiesRes.status === 'fulfilled'
      ? (bountiesRes.value.data?.bounties || bountiesRes.value.data?.data || bountiesRes.value.data || [])
          .map(b => normalise(b, 'Zero Authority DAO', 'bounty')) : [];
    const grants = grantsRes.status === 'fulfilled'
      ? (grantsRes.value.data?.grants || grantsRes.value.data?.data || grantsRes.value.data || [])
          .map(g => normalise(g, 'Zero Authority DAO', 'grant')) : [];
    const events = eventsRes.status === 'fulfilled'
      ? (eventsRes.value.data?.events || eventsRes.value.data?.data || eventsRes.value.data || [])
          .map(e => normalise(e, 'Zero Authority DAO', 'event')) : [];
    return [...bounties, ...grants, ...events];
  } catch (err) {
    console.warn('⚠️  Zero Authority fetch failed:', err.message);
    return [];
  }
}

async function fetchGitcoinGrants() {
  try {
    const res = await axios.get(`${SOURCES.GITCOIN}/grants/`, {
      params: { limit: 20, active: true, grant_type: 'grant' },
      timeout: 8000,
    });
    const items = res.data?.grants || res.data?.objects || [];
    return items.map(g => normalise({
      id: g.id, title: g.title, description: g.description,
      url: g.url || `https://gitcoin.co/grants/${g.id}`,
      reward: g.amount_received_in_round ? `$${Number(g.amount_received_in_round).toFixed(0)}` : 'Open',
      rewardToken: 'USD', tags: g.tags || [], deadline: g.last_update,
    }, 'Gitcoin', 'grant'));
  } catch (err) {
    console.warn('⚠️  Gitcoin fetch failed:', err.message);
    return [];
  }
}

function getMockData() {
  const now = new Date();
  const makeDeadline = (days) => new Date(now.getTime() + days * 86400000).toISOString();

  return [
    // ── REAL LIVE BOUNTIES from zeroauthoritydao.com/bounty ──
    {
      id: 'za-b1', title: 'ZA x 3HUNNA CLIPPING BOUNTY',
      description: 'Create clips and highlight content for 3HUNNA on the Stacks Network. Multiple winners selected. Marketing focused bounty open to content creators.',
      category: 'bounty', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/bounty',
      reward: 'TBD', rewardToken: 'STX',
      deadline: makeDeadline(7), tags: ['Marketing', 'Content', 'Clipping', 'Stacks'],
      difficulty: 'beginner', applicants: 18, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-b2', title: 'USDA Alpha Arena',
      description: 'Participate in the USDA Alpha Arena bounty on the Stacks Network. Multiple winners. General category bounty posted by DIKO Creators.',
      category: 'bounty', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/bounty',
      reward: 'TBD', rewardToken: 'USDA',
      deadline: makeDeadline(14), tags: ['DeFi', 'USDA', 'Stacks', 'General'],
      difficulty: 'intermediate', applicants: 24, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-b3', title: 'THE $FLAT FRENZY BOUNTY',
      description: 'Join the $FLAT Frenzy bounty on Stacks Network. Multiple winners. General category — show your creativity and passion for the Flat Earth project.',
      category: 'bounty', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/bounty',
      reward: 'TBD', rewardToken: 'FLAT',
      deadline: makeDeadline(4), tags: ['General', 'Stacks', 'Community'],
      difficulty: 'beginner', applicants: 31, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-b4', title: 'The Top Dawg Award',
      description: 'Single winner bounty by Dawgcoin on the Stacks Network. Prove you are the top dawg in this general category competition.',
      category: 'bounty', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/bounty',
      reward: 'TBD', rewardToken: 'DAWG',
      deadline: makeDeadline(13), tags: ['General', 'Stacks', 'Single Winner'],
      difficulty: 'beginner', applicants: 9, isHot: false, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-b5', title: "Ruffs-to-Riches — Part Two",
      description: "Multiple winners bounty by Dawgcoin. Continue the Ruffs-to-Riches story on Stacks. Show your content creation skills.",
      category: 'bounty', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/bounty',
      reward: 'TBD', rewardToken: 'DAWG',
      deadline: makeDeadline(18), tags: ['Content', 'General', 'Stacks'],
      difficulty: 'beginner', applicants: 14, isHot: false, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-b6', title: 'Megapont Lets Go Ape',
      description: 'Single winner meme bounty by Creators Campaign. Create the best meme for the Megapont community on Stacks.',
      category: 'bounty', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/bounty',
      reward: 'TBD', rewardToken: 'STX',
      deadline: makeDeadline(4), tags: ['Meme', 'NFT', 'Stacks', 'Single Winner'],
      difficulty: 'beginner', applicants: 22, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-b7', title: "Ruffs-to-Riches — Part One",
      description: "Multiple winners bounty by Dawgcoin. Kick off the Ruffs-to-Riches series on Stacks Network with your best content.",
      category: 'bounty', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/bounty',
      reward: 'TBD', rewardToken: 'DAWG',
      deadline: makeDeadline(13), tags: ['Content', 'General', 'Stacks'],
      difficulty: 'beginner', applicants: 19, isHot: false, createdAt: new Date().toISOString(), raw: {}
    },

    // ── REAL DEGRANTS from zeroauthoritydao.com/funding/degrants ──
    {
      id: 'za-g1', title: 'DeGrants — Developers & Builders Track',
      description: 'Build tools, apps, and infrastructure that make Stacks better for everyone. Submit your proposal to receive funding through the Zero Authority DeGrants program.',
      category: 'grant', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/funding/degrants',
      reward: 'Varies', rewardToken: 'STX',
      deadline: null, tags: ['Development', 'Infrastructure', 'Stacks', 'Open Source'],
      difficulty: 'intermediate', applicants: 44, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-g2', title: 'DeGrants — DeFi Track',
      description: 'Create financial products and services that give people more control over their money on the Stacks Network. Apply for DeGrants funding.',
      category: 'grant', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/funding/projects?track=defi',
      reward: 'Varies', rewardToken: 'STX',
      deadline: null, tags: ['DeFi', 'Finance', 'Stacks', 'Bitcoin'],
      difficulty: 'advanced', applicants: 28, isHot: false, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-g3', title: 'DeGrants — NFTs Track',
      description: 'Launch digital art, collectibles, and creative projects that connect communities on Stacks. Apply for DeGrants NFT track funding.',
      category: 'grant', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/funding/projects?track=nfts',
      reward: 'Varies', rewardToken: 'STX',
      deadline: null, tags: ['NFT', 'Art', 'Creative', 'Stacks'],
      difficulty: 'intermediate', applicants: 36, isHot: false, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-g4', title: 'DeGrants — Community & Governance Track',
      description: 'Start initiatives that grow the Stacks community and improve how decisions get made. Community builders and governance contributors welcome.',
      category: 'grant', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/funding/projects?track=community-and-governance',
      reward: 'Varies', rewardToken: 'STX',
      deadline: null, tags: ['Community', 'Governance', 'DAO', 'Stacks'],
      difficulty: 'beginner', applicants: 21, isHot: false, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-g5', title: 'DeGrants — BNS Track',
      description: 'Develop naming services and identity solutions that make Web3 easier to use on the Bitcoin Name System.',
      category: 'grant', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/funding/projects?track=bns',
      reward: 'Varies', rewardToken: 'STX',
      deadline: null, tags: ['BNS', 'Identity', 'Bitcoin', 'Stacks'],
      difficulty: 'advanced', applicants: 12, isHot: false, createdAt: new Date().toISOString(), raw: {}
    },

    // ── JOBS ──
    {
      id: 'za-j1', title: 'Web3 Creator / Content Producer',
      description: 'Zero Authority DAO is looking for skilled content creators to produce clips, articles, and community content across the Stacks ecosystem.',
      category: 'job', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/creators',
      reward: 'TBD', rewardToken: 'STX',
      deadline: null, tags: ['Content', 'Marketing', 'Remote', 'Web3'],
      difficulty: 'beginner', applicants: 40, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-j2', title: 'Stacks Smart Contract Developer',
      description: 'Build Clarity smart contracts for Zero Authority DAO protocols. Experience with Stacks and Bitcoin L2 required.',
      category: 'job', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/creators',
      reward: 'TBD', rewardToken: 'STX',
      deadline: null, tags: ['Clarity', 'Stacks', 'Smart Contracts', 'Bitcoin'],
      difficulty: 'expert', applicants: 8, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },

    // ── EVENTS ──
    {
      id: 'za-e1', title: 'Zero Authority DAO Community Governance Call',
      description: 'Monthly governance call for the Zero Authority DAO community. Review active SIP proposals, discuss treasury decisions, and vote on key ecosystem upgrades.',
      category: 'event', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/sip/proposals',
      reward: 'Voting Power', rewardToken: 'STX',
      deadline: makeDeadline(5), tags: ['Governance', 'DAO', 'SIP', 'Community'],
      difficulty: 'beginner', applicants: 230, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-e2', title: 'Stacks Quests — Earn by Learning',
      description: 'Complete quests on Zero Authority to earn rewards while learning about the Stacks ecosystem, Bitcoin L2, and Web3 fundamentals.',
      category: 'event', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/quests',
      reward: 'STX Rewards', rewardToken: 'STX',
      deadline: null, tags: ['Learning', 'Quests', 'Stacks', 'Beginner'],
      difficulty: 'beginner', applicants: 520, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
    {
      id: 'za-e3', title: 'Zero Authority MCP Integration Hackathon',
      description: 'Build integrations using the Zero Authority MCP (Model Context Protocol). Use the API to create AI-powered tools for the Stacks ecosystem.',
      category: 'event', source: 'Zero Authority DAO',
      sourceUrl: 'https://zeroauthoritydao.com/guides/mcp',
      reward: 'TBD', rewardToken: 'STX',
      deadline: makeDeadline(21), tags: ['MCP', 'AI', 'API', 'Hackathon', 'Stacks'],
      difficulty: 'advanced', applicants: 67, isHot: true, createdAt: new Date().toISOString(), raw: {}
    },
  ];
}

async function fetchAllOpportunities() {
  const [zaData, gitcoinData] = await Promise.allSettled([
    fetchZeroAuthority(),
    fetchGitcoinGrants(),
  ]);

  const live = [
    ...(zaData.status === 'fulfilled' ? zaData.value : []),
    ...(gitcoinData.status === 'fulfilled' ? gitcoinData.value : []),
  ];

  const all = live.length > 0 ? live : getMockData();

  return all.map(op => ({
    ...op,
    isHot: op.isHot || op.applicants > 20,
  }));
}

module.exports = { fetchAllOpportunities, getMockData };
