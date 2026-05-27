const axios = require('axios');

// ── Fetch Superteam Earn listings (real API) ───────────────────────────────
async function fetchSuperteam() {
  try {
    const res = await axios.get('https://superteam.fun/api/agents/listings/live?take=20', {
      headers: {
        'Authorization': `Bearer ${process.env.SUPERTEAM_API_KEY}`,
        'Accept': 'application/json',
      },
      timeout: 10000,
    });

    const items = res.data?.listings || res.data?.data || res.data || [];
    console.log(`✅ Superteam API: ${items.length} listings fetched`);

    return items.map(item => ({
      id: `st-${item.id || item.slug}`,
      title: item.title || item.name,
      description: item.description || item.shortDescription || '',
      category: item.type === 'job' ? 'job' : item.type === 'grant' ? 'grant' : 'bounty',
      source: 'Superteam Earn',
      sourceUrl: `https://earn.superteam.fun/listing/${item.slug || item.id}`,
      reward: item.rewardAmount ? `$${Number(item.rewardAmount).toLocaleString()}` : 'TBD',
      rewardToken: item.token || 'USDC',
      deadline: item.deadline || null,
      tags: item.skills?.map(s => s.skill || s) || item.tags || [],
      difficulty: item.difficulty || 'intermediate',
      applicants: item.totalSubmissions || item.applicants || 0,
      isHot: item.isFeatured || (item.totalSubmissions || 0) > 15 || false,
      createdAt: item.createdAt || new Date().toISOString(),
      raw: {},
    }));
  } catch (err) {
    console.warn('⚠️  Superteam API failed:', err.message);
    return [];
  }
}

// ── Fetch Web3.career jobs ─────────────────────────────────────────────────

// ── Fetch Zero Authority DAO (public API, no key needed) ───────────────────
async function fetchZeroAuthority() {
  const BASE = 'https://zeroauthoritydao.com/api';

  // Helper to extract Decimal.js style amounts: {s:1, e:3, d:[3000]}
  function extractAmount(val) {
    if (!val || val === null) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') return parseFloat(val) || null;
    if (typeof val === 'object' && val.d) {
      // Decimal.js format: s=sign, e=exponent, d=digits array
      return val.d[0] || null;
    }
    return null;
  }

  const results = [];

  // ── BOUNTIES ──────────────────────────────────────────────────────────────
  try {
    const res = await axios.get(`${BASE}/bounties`, { timeout: 8000, headers: { Accept: 'application/json' } });
    const items = res.data?.data || res.data || [];
    console.log(`✅ ZA bounties: ${items.length} items`);
    items.forEach(item => {
      if (item.isExpired) return;
      const title = String(item.name || '').trim();
      if (!title || title.length < 4) return;
      const deadline = item.endDate ? new Date(item.endDate).toISOString() : null;
      if (deadline && new Date(deadline) < new Date()) return;
      const reward = item.totalPayment || extractAmount(item.reward) || null;
      const token  = item.token?.symbol || 'STX';
      const tags   = item.category?.name ? [item.category.name] : [];
      const desc   = String(item.details || '').replace(/\r\n/g, ' ').replace(/\n/g, ' ').slice(0, 500);

      results.push({
        id: `za-${item.id}`,
        title,
        description: desc,
        category: 'bounty',
        source: 'Zero Authority DAO',
        sourceUrl: `https://zeroauthoritydao.com/bounty/${item.id}`,
        reward: reward ? String(reward) : 'TBD',
        rewardToken: token,
        deadline,
        tags,
        difficulty: 'intermediate',
        applicants: item.submissionsCount || 0,
        isHot: (item.submissionsCount || 0) > 5 || item.hasActiveSubmissions || false,
        createdAt: item.createdAt || new Date().toISOString(),
        raw: {},
      });
    });
  } catch(e) { console.warn('⚠️  ZA bounties failed:', e.message); }

  // ── GRANTS ────────────────────────────────────────────────────────────────
  try {
    const res = await axios.get(`${BASE}/grants`, { timeout: 8000, headers: { Accept: 'application/json' } });
    const items = res.data?.data || res.data || [];
    console.log(`✅ ZA grants: ${items.length} items`);
    items.forEach(item => {
      const title = String(item.projectName || '').trim();
      if (!title || title.length < 3) return;
      // Only show active/in-progress grants
      if (['Rejected', 'Withdrawn'].includes(item.status)) return;
      const awarded = extractAmount(item.awardedAmount);
      const requested = extractAmount(item.requestedAmount);
      const amount = awarded || requested || null;
      const tags = [item.subcategory, item.category].filter(Boolean);
      const completion = item.completionPercentage ? `${item.completionPercentage}% complete` : '';
      results.push({
        id: `za-grant-${item.id}`,
        title,
        description: String(item.projectDescription || '').slice(0, 500),
        category: 'grant',
        source: 'Zero Authority DAO',
        sourceUrl: `https://zeroauthoritydao.com/funding/degrants`,
        reward: amount ? String(amount) : 'TBD',
        rewardToken: 'STX',
        deadline: null,
        tags,
        difficulty: 'advanced',
        applicants: item.totalMilestones || 0,
        isHot: item.status === 'InProgress' && (item.completionPercentage || 0) < 100,
        createdAt: item.createdAt || new Date().toISOString(),
        raw: {},
      });
    });
  } catch(e) { console.warn('⚠️  ZA grants failed:', e.message); }

  // ── EVENTS ────────────────────────────────────────────────────────────────
  try {
    const res = await axios.get(`${BASE}/events`, { timeout: 8000, headers: { Accept: 'application/json' } });
    const items = res.data?.data || res.data || [];
    console.log(`✅ ZA events: ${items.length} items`);
    items.forEach(item => {
      const title = String(item.name || item.title || '').trim();
      if (!title) return;
      results.push({
        id: `za-event-${item.id}`,
        title,
        description: String(item.description || item.details || '').slice(0, 500),
        category: 'event',
        source: 'Zero Authority DAO',
        sourceUrl: item.url || `https://zeroauthoritydao.com/events`,
        reward: item.reward || 'TBD',
        rewardToken: 'STX',
        deadline: item.endDate ? new Date(item.endDate).toISOString() : null,
        tags: item.category?.name ? [item.category.name] : [],
        difficulty: 'beginner',
        applicants: 0,
        isHot: false,
        createdAt: item.createdAt || new Date().toISOString(),
        raw: {},
      });
    });
  } catch(e) { console.warn('⚠️  ZA events failed:', e.message); }

  return results;
}

// ── Mock data (real links, used as fallback) ───────────────────────────────
function getMockData() {
  const d = (days) => new Date(Date.now() + days * 86400000).toISOString();
  return [
    // Zero Authority data — all from live API (bounties, grants, events)
    // Superteam Earn
        // Superteam Earn — verified live listings (May 2026)
    { id:'st-f1', title:'Create X Content to Introduce Moony',                    description:'Moony Foundation seeking creators to produce X (Twitter) content introducing the Moony project. Design & Content skills. $300 USDC total prizes — multiple winners.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/moony/',                                                                reward:'$300',  rewardToken:'USDC', deadline:d(7),  tags:['Content','Twitter','Design','Solana'],      difficulty:'beginner',     applicants:93, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f2', title:'HelpBnk x Superteam | Business Challenge',               description:'Superteam UK & HelpBnk challenge you to propose Web3 + banking business solutions. $10,000 USDG total across 10 winners. Content, Growth, Dev all welcome.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/helpbnk-superteam-business-challenge-march-2026/',                    reward:'$10,000', rewardToken:'USDG', deadline:d(3),  tags:['Business','Content','Growth','Finance'],    difficulty:'intermediate', applicants:74, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f3', title:'Write About Trepa — $1,500 Documentation Bounty',        description:'Trepa seeking writers to create docs, tutorials or explainers. $1,500 USDC bounty. Strong writing and Web3 knowledge required.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/write-about-trepa-1500-usdc/',                                                                      reward:'$1,500', rewardToken:'USDC', deadline:d(6),  tags:['Writing','Documentation','Content','Web3'], difficulty:'intermediate', applicants:38, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f4', title:'Solana Consumer Day — Best Consumer Insights Thread',     description:'Superteam Black asking for the best consumer insights Twitter thread about the Solana ecosystem. Multiple winners. Open globally.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/solana-consumer-day-best-consumer-insights-thread',                                             reward:'TBD',    rewardToken:'USDC', deadline:d(5),  tags:['Content','Twitter','Solana','Research'],    difficulty:'beginner',     applicants:41, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f5', title:'Promote Solana Summit Kazakhstan — Content & Community',  description:'Superteam Kazakhstan looking for creators to promote the Solana Summit Kazakhstan event through content and community engagement.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/promote-solana-summit-kazakhstan-content-and-community-bounty/',                              reward:'TBD',    rewardToken:'USDC', deadline:d(2),  tags:['Marketing','Community','Solana','Events'],  difficulty:'beginner',     applicants:29, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f6', title:'Loofta Pay x MagicBlock — Creator & Content Bounty',     description:'Superteam Ireland bounty for creators to produce content for Loofta Pay and MagicBlock. Multiple formats accepted — threads, videos, articles.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/loofta-pay-x-magicblock-creator-and-content-bounty/',                              reward:'TBD',    rewardToken:'USDC', deadline:d(8),  tags:['Content','Marketing','Solana','Payments'],  difficulty:'beginner',     applicants:22, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f7', title:'Kazakhstan Solana Projects Spotlight — Content Bounty',   description:'Superteam Kazakhstan wants content spotlighting Solana projects building in Kazakhstan. Writers, designers, and video creators welcome.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/kazakhstan-solana-projects-spotlight-content-bounty/',                                   reward:'TBD',    rewardToken:'USDC', deadline:d(10), tags:['Content','Spotlight','Solana','Community'],  difficulty:'beginner',     applicants:18, isHot:false, createdAt:new Date().toISOString(), raw:{} },



    // Web3 Foundation Grants
    { id:'w3f-g1', title:'Web3 Foundation Open Grants Program', description:'Web3 Foundation funds open-source projects benefiting the Polkadot and Substrate ecosystem. Grants range from $10k to $100k+. Apply via GitHub.', category:'grant', source:'Web3 Foundation', sourceUrl:'https://grants.web3.foundation/applications', reward:'$10k–$100k+', rewardToken:'USD', deadline:null, tags:['Polkadot','Substrate','Open Source','Infrastructure'], difficulty:'advanced', applicants:0, isHot:false, createdAt:new Date().toISOString(), raw:{} },
  ];
}

// ── Main export ─────────────────────────────────────────────────────────────
async function fetchAllOpportunities() {
  const [zaRes, stRes] = await Promise.allSettled([
    fetchZeroAuthority(),
    fetchSuperteam(),
  ]);

  const live = [
    ...(zaRes.status === 'fulfilled' ? zaRes.value : []),
    ...(stRes.status === 'fulfilled' ? stRes.value : []),
  ].filter(op => op.title && op.title.trim() && op.title !== 'undefined');

  const mock = getMockData();

  // Filter out junk live ZA entries first
  const junkPatterns = /^(test|developer|community|design|marketing|development|bootspring|protocol updates|protocol infrastructure|graphic design|community\s*)$/i;
  const cleanLive = live.filter(op => {
    if (op.source !== 'Zero Authority DAO') return true;
    const t = op.title.trim();
    if (junkPatterns.test(t)) return false;
    if (t.length < 5) return false;
    if (!op.description && (!op.tags || op.tags.length === 0) && op.reward === 'TBD') return false;
    return true;
  });

  // Merge live + mock, deduplicating by title
  // For duplicates: prefer whichever has more data (reward, description, tags)
  const score = (op) => (op.reward !== 'TBD' ? 10 : 0) + (op.description && op.description.length > 30 ? 5 : 0) + (op.tags?.length > 0 ? 3 : 0) + (op.sourceUrl?.includes('/bounty/') ? 2 : 0);

  const seen = new Map(); // normalised title → best entry so far
  [...cleanLive, ...mock].forEach(op => {
    const key = op.title.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!seen.has(key)) {
      seen.set(key, op);
    } else {
      // Keep whichever has a better score
      if (score(op) > score(seen.get(key))) {
        seen.set(key, op);
      }
    }
  });

  const all = [...seen.values()].filter(op => {
    // Filter expired — check deadline date
    if (op.deadline && new Date(op.deadline) < new Date()) return false;
    return true;
  });

  return all.map(op => ({ ...op, isHot: op.isHot || (op.applicants || 0) > 20 }));
}

module.exports = { fetchAllOpportunities, getMockData };
