const axios = require('axios');

// ──────────────────────────────────────────────────────────────────────────────
// ZEROSCOPE Multi-Source Data Aggregation Service
// Pulls bounties, grants, and jobs from multiple Web3 platforms
// ──────────────────────────────────────────────────────────────────────────────

const SOURCES = {
  ZERO_AUTHORITY: process.env.ZERO_AUTHORITY_API || 'https://api.zeroauthority.xyz',
  DEWORK: 'https://api.dework.xyz/graphql',
  LAYER3: 'https://layer3.xyz',
  GITCOIN: 'https://gitcoin.co/api/v1',
};

// ─── Helper: normalise any opportunity into a standard shape ──────────────────
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

// ─── Zero Authority DAO ───────────────────────────────────────────────────────
async function fetchZeroAuthority() {
  try {
    const BASE = SOURCES.ZERO_AUTHORITY;
    const [bountiesRes, grantsRes, eventsRes] = await Promise.allSettled([
      axios.get(`${BASE}/bounties`, { timeout: 8000 }),
      axios.get(`${BASE}/grants`,   { timeout: 8000 }),
      axios.get(`${BASE}/events`,   { timeout: 8000 }),
    ]);

    const bounties = bountiesRes.status === 'fulfilled'
      ? (bountiesRes.value.data?.bounties || bountiesRes.value.data?.data || bountiesRes.value.data || [])
          .map(b => normalise(b, 'Zero Authority DAO', 'bounty'))
      : [];

    const grants = grantsRes.status === 'fulfilled'
      ? (grantsRes.value.data?.grants || grantsRes.value.data?.data || grantsRes.value.data || [])
          .map(g => normalise(g, 'Zero Authority DAO', 'grant'))
      : [];

    const events = eventsRes.status === 'fulfilled'
      ? (eventsRes.value.data?.events || eventsRes.value.data?.data || eventsRes.value.data || [])
          .map(e => normalise(e, 'Zero Authority DAO', 'event'))
      : [];

    return [...bounties, ...grants, ...events];
  } catch (err) {
    console.warn('⚠️  Zero Authority fetch failed:', err.message);
    return [];
  }
}

// ─── Gitcoin Grants ───────────────────────────────────────────────────────────
async function fetchGitcoinGrants() {
  try {
    const res = await axios.get(`${SOURCES.GITCOIN}/grants/`, {
      params: { limit: 20, active: true, grant_type: 'grant' },
      timeout: 8000,
    });
    const items = res.data?.grants || res.data?.objects || [];
    return items.map(g => normalise({
      id: g.id,
      title: g.title,
      description: g.description,
      url: g.url || `https://gitcoin.co/grants/${g.id}`,
      reward: g.amount_received_in_round ? `$${Number(g.amount_received_in_round).toFixed(0)}` : 'Open',
      rewardToken: 'USD',
      tags: g.tags || [],
      deadline: g.last_update,
    }, 'Gitcoin', 'grant'));
  } catch (err) {
    console.warn('⚠️  Gitcoin fetch failed:', err.message);
    return [];
  }
}

// ─── Dework Bounties (GraphQL) ────────────────────────────────────────────────
async function fetchDeworkBounties() {
  const query = `
    query { 
      tasks(filter: { statuses: [TODO], rewardNotNull: true }, limit: 20) {
        id title description dueDate
        reward { amount currency { symbol } }
        tags { label }
        assigneeCount
      }
    }
  `;
  try {
    const res = await axios.post(SOURCES.DEWORK, { query }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 8000,
    });
    const tasks = res.data?.data?.tasks || [];
    return tasks.map(t => normalise({
      id: t.id,
      title: t.title,
      description: t.description,
      url: `https://app.dework.xyz/`,
      reward: t.reward?.amount || 'TBD',
      rewardToken: t.reward?.currency?.symbol || 'USD',
      tags: t.tags?.map(tag => tag.label) || [],
      deadline: t.dueDate,
    }, 'Dework', 'bounty'));
  } catch (err) {
    console.warn('⚠️  Dework fetch failed:', err.message);
    return [];
  }
}

// ─── Mock fallback data so the dashboard always has content ───────────────────
function getMockData() {
  const now = new Date();
  const makeDeadline = (days) => new Date(now.getTime() + days * 86400000).toISOString();

  return [
    // HOT BOUNTIES
    { id: 'mock-b1', title: 'Build a Zero Authority DAO Analytics Dashboard', description: 'Create a comprehensive analytics dashboard showcasing DAO activity, contributor stats, and treasury metrics using the Zero Authority API.', category: 'bounty', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz', reward: '2500', rewardToken: 'USDC', deadline: makeDeadline(3), tags: ['React', 'Analytics', 'Web3'], difficulty: 'advanced', applicants: 12, isHot: true, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-b2', title: 'Smart Contract Security Audit — ZeroVault Protocol', description: 'Perform a full security audit of the ZeroVault lending protocol contracts. Identify vulnerabilities, write a comprehensive report, and suggest remediations.', category: 'bounty', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz', reward: '5000', rewardToken: 'USDC', deadline: makeDeadline(7), tags: ['Solidity', 'Security', 'Audit'], difficulty: 'expert', applicants: 5, isHot: true, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-b3', title: 'Design Zero Authority Brand Identity System', description: 'Create a comprehensive brand identity system including logo variations, color palette, typography guidelines, and component library documentation.', category: 'bounty', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz', reward: '1800', rewardToken: 'USDC', deadline: makeDeadline(14), tags: ['Design', 'Branding', 'Figma'], difficulty: 'intermediate', applicants: 23, isHot: false, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-b4', title: 'Write Technical Documentation for ZeroSwap', description: 'Produce developer-facing documentation, API references, and integration guides for the ZeroSwap DEX aggregator.', category: 'bounty', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz', reward: '800', rewardToken: 'USDC', deadline: makeDeadline(10), tags: ['Writing', 'Documentation', 'DeFi'], difficulty: 'beginner', applicants: 31, isHot: false, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-b5', title: 'Develop Mobile Wallet Integration SDK', description: 'Build a cross-platform mobile SDK (React Native) for integrating Zero Authority DAO governance directly from mobile wallets.', category: 'bounty', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz', reward: '6000', rewardToken: 'USDC', deadline: makeDeadline(21), tags: ['React Native', 'Mobile', 'SDK'], difficulty: 'expert', applicants: 8, isHot: true, createdAt: new Date().toISOString(), raw: {} },

    // GRANTS
    { id: 'mock-g1', title: 'ZeroGrants: Open Source Tooling Round Q2 2025', description: 'Funding available for open-source tools that improve the Web3 developer experience. Applications open for teams building on Zero Authority infrastructure.', category: 'grant', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz/grants', reward: '25000', rewardToken: 'USDC', deadline: makeDeadline(30), tags: ['Open Source', 'Infrastructure', 'Developer Tools'], difficulty: 'intermediate', applicants: 44, isHot: true, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-g2', title: 'Gitcoin Climate Solutions Grant', description: 'Funding for Web3 projects addressing climate change through decentralized coordination, carbon credits, and sustainability infrastructure.', category: 'grant', source: 'Gitcoin', sourceUrl: 'https://gitcoin.co', reward: '10000', rewardToken: 'GTC', deadline: makeDeadline(45), tags: ['Climate', 'Impact', 'DeSci'], difficulty: 'intermediate', applicants: 67, isHot: false, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-g3', title: 'Web3 Africa Ecosystem Grant — Layer 1 & 2 Research', description: 'Grants for African developers and researchers contributing to blockchain infrastructure research. Priority given to scalability and accessibility work.', category: 'grant', source: 'Web3 Foundation', sourceUrl: 'https://web3.foundation', reward: '15000', rewardToken: 'DOT', deadline: makeDeadline(60), tags: ['Research', 'Africa', 'Infrastructure'], difficulty: 'advanced', applicants: 19, isHot: false, createdAt: new Date().toISOString(), raw: {} },

    // JOBS
    { id: 'mock-j1', title: 'Senior Solidity Engineer — Zero Authority Core Team', description: 'Join the Zero Authority DAO core engineering team. You\'ll architect and build the next generation of governance contracts, cross-chain bridges, and protocol upgrades.', category: 'job', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz/jobs', reward: '150000–200000', rewardToken: 'USD/year', deadline: null, tags: ['Solidity', 'EVM', 'Protocol', 'Full-time'], difficulty: 'expert', applicants: 14, isHot: true, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-j2', title: 'Web3 Product Designer (Remote)', description: 'Design intuitive, accessible interfaces for decentralized applications. Work closely with engineering and community to shape the future of DAO tooling.', category: 'job', source: 'Dework', sourceUrl: 'https://dework.xyz', reward: '80000–120000', rewardToken: 'USD/year', deadline: makeDeadline(30), tags: ['Design', 'UX', 'Remote', 'Full-time'], difficulty: 'intermediate', applicants: 56, isHot: false, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-j3', title: 'DevRel & Community Growth Lead', description: 'Drive developer adoption, create content, run workshops, and grow the Zero Authority developer community globally. Strong communicator with Web3 passion needed.', category: 'job', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz/jobs', reward: '90000–130000', rewardToken: 'USD/year', deadline: null, tags: ['DevRel', 'Community', 'Marketing', 'Remote'], difficulty: 'intermediate', applicants: 38, isHot: false, createdAt: new Date().toISOString(), raw: {} },

    // EVENTS
    { id: 'mock-e1', title: 'ETHGlobal Lagos 2025 — Hackathon', description: '48-hour hackathon in Lagos, Nigeria. Build innovative Web3 projects with $500K+ in prizes. Zero Authority DAO is a sponsor with dedicated bounty track.', category: 'event', source: 'ETHGlobal', sourceUrl: 'https://ethglobal.com', reward: '500000+', rewardToken: 'USD', deadline: makeDeadline(45), tags: ['Hackathon', 'Lagos', 'ETH', 'IRL'], difficulty: 'intermediate', applicants: 1200, isHot: true, createdAt: new Date().toISOString(), raw: {} },
    { id: 'mock-e2', title: 'Zero Authority DAO Community Call — Governance Vote', description: 'Monthly community call to discuss protocol upgrades, treasury allocations, and ecosystem partnerships. All ZA token holders can vote on 3 active proposals.', category: 'event', source: 'Zero Authority DAO', sourceUrl: 'https://zeroauthority.xyz', reward: 'Voting Power', rewardToken: 'XPZA', deadline: makeDeadline(5), tags: ['Governance', 'DAO', 'Community', 'Online'], difficulty: 'beginner', applicants: 230, isHot: false, createdAt: new Date().toISOString(), raw: {} },
  ];
}

// ─── Main aggregation entry point ─────────────────────────────────────────────
async function fetchAllOpportunities() {
  const [zaData, gitcoinData, deworkData] = await Promise.allSettled([
    fetchZeroAuthority(),
    fetchGitcoinGrants(),
    fetchDeworkBounties(),
  ]);

  const live = [
    ...(zaData.status === 'fulfilled' ? zaData.value : []),
    ...(gitcoinData.status === 'fulfilled' ? gitcoinData.value : []),
    ...(deworkData.status === 'fulfilled' ? deworkData.value : []),
  ];

  // If all APIs failed or returned empty, use rich mock data
  const all = live.length > 0 ? live : getMockData();

  // Tag "hot" items — high applicants or marked featured
  return all.map(op => ({
    ...op,
    isHot: op.isHot || op.applicants > 20,
  }));
}

module.exports = { fetchAllOpportunities, getMockData };
