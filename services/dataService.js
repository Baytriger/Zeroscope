const axios = require('axios');

// ── Fetch Superteam Earn listings (bounties + jobs) ────────────────────────
async function fetchSuperteam() {
  try {
    const res = await axios.get('https://earn.superteam.fun/api/listings', {
      params: { take: 20, status: 'open' },
      timeout: 8000,
      headers: { 'Accept': 'application/json' },
    });
    const items = res.data?.bounties || res.data?.data || res.data || [];
    return items.map(item => ({
      id: `st-${item.id || item.slug}`,
      title: item.title || item.name,
      description: item.description || item.shortDescription || '',
      category: item.type === 'job' ? 'job' : 'bounty',
      source: 'Superteam Earn',
      sourceUrl: `https://earn.superteam.fun/listings/${item.slug || item.id}`,
      reward: item.rewardAmount ? `$${Number(item.rewardAmount).toLocaleString()}` : 'TBD',
      rewardToken: item.token || 'USDC',
      deadline: item.deadline || null,
      tags: item.skills?.map(s => s.skill || s) || item.tags || [],
      difficulty: item.difficulty || 'intermediate',
      applicants: item.totalSubmissions || item.applicants || 0,
      isHot: (item.totalSubmissions || 0) > 15 || item.isFeatured || false,
      createdAt: item.createdAt || new Date().toISOString(),
      raw: {},
    }));
  } catch (err) {
    console.warn('⚠️  Superteam fetch failed:', err.message);
    return [];
  }
}

// ── Fetch Web3.career jobs ─────────────────────────────────────────────────
async function fetchWeb3Career() {
  try {
    const res = await axios.get('https://web3.career/api/v1', {
      params: { job: 1, page: 1 },
      timeout: 8000,
      headers: { 'Accept': 'application/json' },
    });
    const items = res.data?.jobs || res.data || [];
    return items.slice(0, 15).map((job, i) => ({
      id: `w3c-${job.id || i}`,
      title: job.title || job.job_title,
      description: job.description || job.short_description || `${job.role || ''} role at ${job.company_name || 'a Web3 company'}`,
      category: 'job',
      source: 'Web3.career',
      sourceUrl: job.url || job.apply_url || `https://web3.career/${job.slug || job.id}`,
      reward: job.salary_range || job.salary || 'Competitive',
      rewardToken: 'USD',
      deadline: null,
      tags: [job.role, job.location, ...(job.tags || [])].filter(Boolean),
      difficulty: 'intermediate',
      applicants: 0,
      isHot: job.featured || false,
      createdAt: job.created_at || new Date().toISOString(),
      raw: {},
    }));
  } catch (err) {
    console.warn('⚠️  Web3.career fetch failed:', err.message);
    return [];
  }
}

// ── Fetch Zero Authority DAO (real API) ────────────────────────────────────
async function fetchZeroAuthority() {
  try {
    const BASE = process.env.ZERO_AUTHORITY_API || 'https://api.zeroauthoritydao.com';
    const [b, g, e] = await Promise.allSettled([
      axios.get(`${BASE}/bounties`, { timeout: 8000 }),
      axios.get(`${BASE}/grants`,   { timeout: 8000 }),
      axios.get(`${BASE}/events`,   { timeout: 8000 }),
    ]);
    const parse = (res, cat) => res.status === 'fulfilled'
      ? (res.value.data?.data || res.value.data || []).map(item => ({
          id: `za-api-${item.id || item._id}`,
          title: item.title || item.name,
          description: item.description || '',
          category: cat,
          source: 'Zero Authority DAO',
          sourceUrl: item.url || item.link || `https://zeroauthoritydao.com/${cat === 'grant' ? 'funding/degrants' : cat}`,
          reward: item.reward || item.amount || 'TBD',
          rewardToken: item.rewardToken || item.currency || 'STX',
          deadline: item.deadline || item.endDate || null,
          tags: item.tags || item.skills || [],
          difficulty: item.difficulty || 'intermediate',
          applicants: item.applicants || 0,
          isHot: item.featured || false,
          createdAt: item.createdAt || new Date().toISOString(),
          raw: {},
        })) : [];
    return [...parse(b, 'bounty'), ...parse(g, 'grant'), ...parse(e, 'event')];
  } catch (err) {
    console.warn('⚠️  Zero Authority API failed:', err.message);
    return [];
  }
}

// ── Mock data (real links, used as fallback) ───────────────────────────────
function getMockData() {
  const d = (days) => new Date(Date.now() + days * 86400000).toISOString();
  return [
    // Zero Authority Bounties
    { id:'za-b1', title:'ZA x 3HUNNA CLIPPING BOUNTY', description:'Create clips and highlight content for 3HUNNA on the Stacks Network. Multiple winners. Marketing focused.', category:'bounty', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/bounty', reward:'TBD', rewardToken:'STX', deadline:d(7),  tags:['Marketing','Content','Clipping','Stacks'], difficulty:'beginner',     applicants:18, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'za-b2', title:'USDA Alpha Arena',              description:'Participate in the USDA Alpha Arena on the Stacks Network. Multiple winners. General category by DIKO Creators.', category:'bounty', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/bounty', reward:'TBD', rewardToken:'USDA',deadline:d(14), tags:['DeFi','USDA','Stacks'],              difficulty:'intermediate', applicants:24, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'za-b3', title:'THE $FLAT FRENZY BOUNTY',      description:'Join the $FLAT Frenzy bounty on Stacks. Multiple winners. Show creativity and passion for the Flat Earth project.', category:'bounty', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/bounty', reward:'TBD', rewardToken:'FLAT',deadline:d(4),  tags:['General','Stacks','Community'],      difficulty:'beginner',     applicants:31, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'za-b4', title:'The Top Dawg Award',            description:'Single winner bounty by Dawgcoin on Stacks. Prove you are the top dawg.', category:'bounty', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/bounty', reward:'TBD', rewardToken:'DAWG',deadline:d(13), tags:['General','Stacks'],                  difficulty:'beginner',     applicants:9,  isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'za-b5', title:"Ruffs-to-Riches — Part Two",   description:'Multiple winners by Dawgcoin. Continue the Ruffs-to-Riches story on Stacks.', category:'bounty', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/bounty', reward:'TBD', rewardToken:'DAWG',deadline:d(18), tags:['Content','General','Stacks'],        difficulty:'beginner',     applicants:14, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'za-b6', title:'Megapont Lets Go Ape',          description:'Single winner meme bounty by Creators Campaign. Best meme for the Megapont community on Stacks.', category:'bounty', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/bounty', reward:'TBD', rewardToken:'STX', deadline:d(4),  tags:['Meme','NFT','Stacks'],              difficulty:'beginner',     applicants:22, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'za-b7', title:"Ruffs-to-Riches — Part One",   description:'Multiple winners by Dawgcoin. Kick off the series on Stacks with your best content.', category:'bounty', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/bounty', reward:'TBD', rewardToken:'DAWG',deadline:d(13), tags:['Content','General','Stacks'],        difficulty:'beginner',     applicants:19, isHot:false, createdAt:new Date().toISOString(), raw:{} },

    // Zero Authority DeGrants
    { id:'za-g1', title:'DeGrants — Developers & Builders', description:'Build tools, apps, and infrastructure that make Stacks better for everyone. Submit a proposal for funding.', category:'grant', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/funding/degrants', reward:'Varies', rewardToken:'STX', deadline:null, tags:['Development','Infrastructure','Stacks'], difficulty:'intermediate', applicants:44, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'za-g2', title:'DeGrants — DeFi Track',            description:'Create financial products that give people more control over their money on Stacks.',                          category:'grant', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/funding/projects?track=defi', reward:'Varies', rewardToken:'STX', deadline:null, tags:['DeFi','Finance','Stacks'],            difficulty:'advanced',     applicants:28, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'za-g3', title:'DeGrants — NFTs Track',             description:'Launch digital art, collectibles, and creative projects that connect communities on Stacks.',               category:'grant', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/funding/projects?track=nfts', reward:'Varies', rewardToken:'STX', deadline:null, tags:['NFT','Art','Creative','Stacks'],       difficulty:'intermediate', applicants:36, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'za-g4', title:'DeGrants — Community & Governance', description:'Grow the Stacks community and improve governance. Community builders and DAO contributors welcome.',         category:'grant', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/funding/projects?track=community-and-governance', reward:'Varies', rewardToken:'STX', deadline:null, tags:['Community','Governance','DAO'],      difficulty:'beginner',     applicants:21, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'za-g5', title:'DeGrants — BNS Track',              description:'Develop naming services and identity solutions for the Bitcoin Name System on Stacks.',                      category:'grant', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/funding/projects?track=bns', reward:'Varies', rewardToken:'STX', deadline:null, tags:['BNS','Identity','Bitcoin'],           difficulty:'advanced',     applicants:12, isHot:false, createdAt:new Date().toISOString(), raw:{} },

    // Zero Authority Jobs
    { id:'za-j1', title:'Web3 Creator / Content Producer',  description:'Zero Authority DAO looking for content creators to produce clips, articles, and community content across the Stacks ecosystem.', category:'job', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/creators', reward:'TBD', rewardToken:'STX', deadline:null, tags:['Content','Marketing','Remote','Web3'], difficulty:'beginner',  applicants:40, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'za-j2', title:'Stacks Smart Contract Developer',   description:'Build Clarity smart contracts for Zero Authority DAO protocols. Experience with Stacks and Bitcoin L2 required.', category:'job', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/creators', reward:'TBD', rewardToken:'STX', deadline:null, tags:['Clarity','Stacks','Smart Contracts'],  difficulty:'expert',    applicants:8,  isHot:true,  createdAt:new Date().toISOString(), raw:{} },

    // Zero Authority Events
    { id:'za-e1', title:'DAO Governance Call',              description:'Monthly governance call. Review active SIP proposals, discuss treasury decisions, and vote on ecosystem upgrades.', category:'event', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/sip/proposals', reward:'Voting Power', rewardToken:'STX', deadline:d(5),  tags:['Governance','DAO','SIP'],     difficulty:'beginner', applicants:230, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'za-e2', title:'Stacks Quests — Earn by Learning', description:'Complete quests to earn rewards while learning about Stacks, Bitcoin L2, and Web3 fundamentals.',               category:'event', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/quests',        reward:'STX Rewards',  rewardToken:'STX', deadline:null,  tags:['Learning','Quests','Beginner'], difficulty:'beginner', applicants:520, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'za-e3', title:'MCP Integration Hackathon',        description:'Build integrations using the Zero Authority MCP. Create AI-powered tools for the Stacks ecosystem.',             category:'event', source:'Zero Authority DAO', sourceUrl:'https://zeroauthoritydao.com/guides/mcp',   reward:'TBD',          rewardToken:'STX', deadline:d(21), tags:['MCP','AI','Hackathon'],         difficulty:'advanced', applicants:67,  isHot:true,  createdAt:new Date().toISOString(), raw:{} },

    // Superteam Earn Bounties (fallback)
    { id:'st-f1', title:'Write a Technical Deep-Dive on Solana DeFi', description:'Research and write a comprehensive technical article covering a Solana DeFi protocol. Must be 2000+ words with code examples.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://earn.superteam.fun/bounties/', reward:'$500', rewardToken:'USDC', deadline:d(10), tags:['Content','Writing','Solana','DeFi'], difficulty:'intermediate', applicants:32, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f2', title:'Design a DeFi Dashboard UI Kit',               description:'Create a comprehensive Figma UI kit for DeFi dashboards. Must include components, tokens, and documentation.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://earn.superteam.fun/bounties/', reward:'$800', rewardToken:'USDC', deadline:d(8),  tags:['Design','Figma','DeFi','UI/UX'],    difficulty:'intermediate', applicants:21, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f3', title:'Build a Solana Wallet Tracker CLI',            description:'Build a command-line tool to track Solana wallet activity, token balances, and transaction history.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://earn.superteam.fun/bounties/', reward:'$1,200', rewardToken:'USDC', deadline:d(14), tags:['Development','Solana','CLI','TypeScript'], difficulty:'advanced', applicants:14, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f4', title:'Crypto Twitter Growth Strategy for Web3 Startup', description:'Develop a 90-day Twitter/X growth strategy for a Web3 startup including content calendar, engagement tactics, and KPIs.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://earn.superteam.fun/bounties/', reward:'$350', rewardToken:'USDC', deadline:d(6),  tags:['Marketing','Twitter','Social Media','Content'], difficulty:'beginner', applicants:45, isHot:true, createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f5', title:'Video Tutorial: Intro to Anchor Framework',    description:'Create a beginner-friendly video tutorial (15-30 mins) explaining the Anchor framework for Solana development.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://earn.superteam.fun/bounties/', reward:'$600', rewardToken:'USDC', deadline:d(12), tags:['Video','Education','Solana','Anchor'], difficulty:'intermediate', applicants:18, isHot:false, createdAt:new Date().toISOString(), raw:{} },

    // Web3.career Jobs (fallback)
    { id:'w3c-f1', title:'Senior Solidity Developer',       description:'Leading DeFi protocol hiring experienced Solidity developer. Work on core protocol contracts, audits, and upgrades. Remote-first.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/solidity-jobs', reward:'$120k–$180k', rewardToken:'USD', deadline:null, tags:['Solidity','DeFi','Smart Contracts','Remote'], difficulty:'expert',        applicants:0, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f2', title:'Web3 Community Manager',          description:'Fast-growing NFT/gaming project seeks passionate community manager for Discord, Twitter, and Telegram. Remote position.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/community-jobs', reward:'$60k–$90k',   rewardToken:'USD', deadline:null, tags:['Community','Discord','Social Media','Remote'], difficulty:'beginner',     applicants:0, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f3', title:'Blockchain Product Manager',      description:'DeFi startup looking for a PM with Web3 experience to drive product roadmap and coordinate with engineering and design teams.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/product-jobs', reward:'$100k–$150k', rewardToken:'USD', deadline:null, tags:['Product','Management','DeFi','Remote'],        difficulty:'intermediate', applicants:0, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f4', title:'UI/UX Designer — DeFi Protocol',  description:'Design intuitive interfaces for complex DeFi products. Experience with Figma and understanding of Web3 UX patterns required.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/design-jobs', reward:'$80k–$120k',  rewardToken:'USD', deadline:null, tags:['Design','UI/UX','Figma','DeFi'],               difficulty:'intermediate', applicants:0, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f5', title:'DevRel Engineer — Layer 2 Protocol', description:'Developer Relations engineer to create tutorials, run workshops, and build developer community for a growing L2 protocol.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/developer-relations-jobs', reward:'$90k–$130k', rewardToken:'USD', deadline:null, tags:['DevRel','L2','Education','Remote'],          difficulty:'intermediate', applicants:0, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f6', title:'Web3 Content Writer / Copywriter', description:'Write blog posts, documentation, newsletters, and social content for Web3 projects. Crypto-native voice, research skills a must.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/content-jobs', reward:'$50k–$80k',   rewardToken:'USD', deadline:null, tags:['Writing','Content','Marketing','Remote'],      difficulty:'beginner',     applicants:0, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f7', title:'Rust Developer — Solana Programs', description:'Build high-performance on-chain programs using Rust for a Solana-native protocol. Deep Rust expertise required.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/rust-jobs', reward:'$140k–$200k', rewardToken:'USD', deadline:null, tags:['Rust','Solana','Smart Contracts','Remote'],   difficulty:'expert',        applicants:0, isHot:true,  createdAt:new Date().toISOString(), raw:{} },

    // Web3 Foundation Grants
    { id:'w3f-g1', title:'Web3 Foundation Grant — Open Source Tools', description:'Web3 Foundation funds open-source projects that benefit the Polkadot and Substrate ecosystem. Grants from $10k to $100k+.', category:'grant', source:'Web3 Foundation', sourceUrl:'https://grants.web3.foundation/applications', reward:'$10k–$100k+', rewardToken:'USD', deadline:null, tags:['Polkadot','Substrate','Open Source','Infrastructure'], difficulty:'advanced', applicants:0, isHot:false, createdAt:new Date().toISOString(), raw:{} },
  ];
}

// ── Main export ─────────────────────────────────────────────────────────────
async function fetchAllOpportunities() {
  const [zaRes, stRes, w3cRes] = await Promise.allSettled([
    fetchZeroAuthority(),
    fetchSuperteam(),
    fetchWeb3Career(),
  ]);

  const live = [
    ...(zaRes.status  === 'fulfilled' ? zaRes.value  : []),
    ...(stRes.status  === 'fulfilled' ? stRes.value  : []),
    ...(w3cRes.status === 'fulfilled' ? w3cRes.value : []),
  ];

  // If live APIs returned nothing useful, use mock data
  const all = live.length >= 5 ? live : getMockData();

  return all.map(op => ({ ...op, isHot: op.isHot || (op.applicants || 0) > 20 }));
}

module.exports = { fetchAllOpportunities, getMockData };
