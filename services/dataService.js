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

// ── Fetch Zero Authority DAO (public API, no key needed) ───────────────────
async function fetchZeroAuthority() {
  const BASE = 'https://zeroauthoritydao.com/api';
  const endpoints = [
    { url: `${BASE}/bounties`, cat: 'bounty' },
    { url: `${BASE}/gigs`,     cat: 'bounty' },
    { url: `${BASE}/jobs`,     cat: 'job'    },
    { url: `${BASE}/events`,   cat: 'event'  },
  ];

  const results = [];
  await Promise.allSettled(endpoints.map(async (ep) => {
    try {
      const res = await axios.get(ep.url, { timeout: 8000, headers: { 'Accept': 'application/json' } });
      const items = res.data?.data || res.data?.bounties || res.data?.gigs || res.data?.jobs || res.data?.events || res.data || [];
      if (Array.isArray(items) && items.length > 0) {
        const sample = items[0];
        console.log(`✅ ZA API hit: ${ep.url} (${items.length} items)`);
        console.log(`ZA SAMPLE KEYS: ${Object.keys(sample).join(', ')}`);
        console.log(`ZA SAMPLE VALUES: reward=${JSON.stringify(sample.reward || sample.rewardAmount || sample.amount || sample.prize)}, token=${JSON.stringify(sample.rewardToken || sample.token || sample.currency || sample.tokenSymbol)}, deadline=${JSON.stringify(sample.deadline || sample.endDate || sample.expiresAt || sample.dueDate || sample.closingDate)}, tags=${JSON.stringify(sample.tags || sample.skills || sample.categories)}, applicants=${JSON.stringify(sample.applicants || sample.totalSubmissions || sample.submissions || sample.applicantCount)}, difficulty=${JSON.stringify(sample.difficulty || sample.level || sample.experienceLevel)}`);
        items.forEach(item => {
          // Skip blank/invalid entries
          const title = String(item.title || item.name || '').trim();
          if (!title || title === 'undefined' || title === 'null') return;
          // Safely extract reward — may be object, number, or string
          const rawReward = item.rewardAmount || item.reward || item.amount || item.prize;
          let reward = 'TBD';
          if (rawReward !== null && rawReward !== undefined) {
            if (typeof rawReward === 'object') {
              reward = rawReward.amount || rawReward.value || rawReward.total || String(rawReward.usd || rawReward.usdc || 'TBD');
            } else {
              reward = String(rawReward);
            }
          }

          // Safely extract rewardToken
          const rawToken = item.rewardToken || item.token || item.currency;
          let rewardToken = 'STX';
          if (rawToken) {
            rewardToken = typeof rawToken === 'object' ? (rawToken.symbol || rawToken.name || 'STX') : String(rawToken);
          }

          // Safely extract tags — may be array of strings or array of objects
          let tags = [];
          const rawTags = item.tags || item.skills || item.categories || [];
          if (Array.isArray(rawTags)) {
            tags = rawTags.map(t => {
              if (typeof t === 'string') return t;
              if (typeof t === 'object') return t.skill || t.name || t.label || t.tag || '';
              return '';
            }).filter(Boolean);
          }

          // Safely extract applicants
          const rawApplicants = item.totalSubmissions || item.submissions || item.applicants || item.applicantCount || 0;
          const applicants = typeof rawApplicants === 'object' ? (rawApplicants.count || rawApplicants.total || 0) : Number(rawApplicants) || 0;

          // Skip expired entries (deadline in the past)
          if (deadline && new Date(deadline) < new Date()) return;

          // Generate tags from title/description if API returns none
          if (tags.length === 0) {
            const text = (title + ' ' + String(item.description || '')).toLowerCase();
            const autoTags = [];
            if (/content|writing|article|blog|thread|clip/.test(text)) autoTags.push('Content');
            if (/design|graphic|visual|ui|ux/.test(text)) autoTags.push('Design');
            if (/dev|code|build|smart contract|solidity|rust/.test(text)) autoTags.push('Development');
            if (/market|growth|social|twitter|community/.test(text)) autoTags.push('Marketing');
            if (/video|animation|film|clip/.test(text)) autoTags.push('Video');
            if (/meme|funny|humor/.test(text)) autoTags.push('Meme');
            if (/governance|dao|vote|sip/.test(text)) autoTags.push('Governance');
            if (/bounty/.test(text)) autoTags.push('Bounty');
            if (autoTags.length === 0) autoTags.push('General');
            tags = autoTags;
          }

          // Safely extract sourceUrl — try slug-based URL first
          const rawSlug = item.slug || item.id || item._id;
          const baseUrl = ep.cat === 'job' ? 'https://zeroauthoritydao.com/jobs'
                        : ep.cat === 'grant' ? 'https://zeroauthoritydao.com/funding/degrants'
                        : 'https://zeroauthoritydao.com/bounty';
          const sourceUrl = (typeof item.url === 'string' && item.url.startsWith('http') ? item.url : null)
            || (typeof item.link === 'string' && item.link.startsWith('http') ? item.link : null)
            || (typeof item.externalUrl === 'string' && item.externalUrl.startsWith('http') ? item.externalUrl : null)
            || (rawSlug ? `${baseUrl}/${rawSlug}` : baseUrl);

          results.push({
            id: `za-${item.id || item._id || item.slug}`,
            title: String(item.title || item.name || 'Untitled'),
            description: String(item.description || item.summary || item.shortDescription || ''),
            category: ep.cat,
            source: 'Zero Authority DAO',
            sourceUrl,
            reward,
            rewardToken,
            deadline,
            tags,
            difficulty: String(item.difficulty || item.level || 'intermediate'),
            applicants,
            isHot: !!(item.featured || item.isHot || item.isFeatured || false),
            createdAt: item.createdAt || new Date().toISOString(),
            raw: item, // keep full raw response for debugging
          });
        });
      }
    } catch (err) {
      console.warn(`⚠️  ZA endpoint ${ep.url} failed:`, err.message);
    }
  }));

  return results;
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

    // Superteam Earn — verified live listings (May 2026)
    { id:'st-f1', title:'Create X Content to Introduce Moony',                    description:'Moony Foundation seeking creators to produce X (Twitter) content introducing the Moony project. Design & Content skills. $300 USDC total prizes — multiple winners.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/moony/',                                                                reward:'$300',  rewardToken:'USDC', deadline:d(7),  tags:['Content','Twitter','Design','Solana'],      difficulty:'beginner',     applicants:93, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f2', title:'HelpBnk x Superteam | Business Challenge',               description:'Superteam UK & HelpBnk challenge you to propose Web3 + banking business solutions. $10,000 USDG total across 10 winners. Content, Growth, Dev all welcome.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/helpbnk-superteam-business-challenge-march-2026/',                    reward:'$10,000', rewardToken:'USDG', deadline:d(3),  tags:['Business','Content','Growth','Finance'],    difficulty:'intermediate', applicants:74, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f3', title:'Write About Trepa — $1,500 Documentation Bounty',        description:'Trepa seeking writers to create docs, tutorials or explainers. $1,500 USDC bounty. Strong writing and Web3 knowledge required.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/write-about-trepa-1500-usdc/',                                                                      reward:'$1,500', rewardToken:'USDC', deadline:d(6),  tags:['Writing','Documentation','Content','Web3'], difficulty:'intermediate', applicants:38, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f4', title:'Solana Consumer Day — Best Consumer Insights Thread',     description:'Superteam Black asking for the best consumer insights Twitter thread about the Solana ecosystem. Multiple winners. Open globally.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/solana-consumer-day-best-consumer-insights-thread',                                             reward:'TBD',    rewardToken:'USDC', deadline:d(5),  tags:['Content','Twitter','Solana','Research'],    difficulty:'beginner',     applicants:41, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f5', title:'Promote Solana Summit Kazakhstan — Content & Community',  description:'Superteam Kazakhstan looking for creators to promote the Solana Summit Kazakhstan event through content and community engagement.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/promote-solana-summit-kazakhstan-content-and-community-bounty/',                              reward:'TBD',    rewardToken:'USDC', deadline:d(2),  tags:['Marketing','Community','Solana','Events'],  difficulty:'beginner',     applicants:29, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f6', title:'Loofta Pay x MagicBlock — Creator & Content Bounty',     description:'Superteam Ireland bounty for creators to produce content for Loofta Pay and MagicBlock. Multiple formats accepted — threads, videos, articles.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/loofta-pay-x-magicblock-creator-and-content-bounty/',                              reward:'TBD',    rewardToken:'USDC', deadline:d(8),  tags:['Content','Marketing','Solana','Payments'],  difficulty:'beginner',     applicants:22, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'st-f7', title:'Kazakhstan Solana Projects Spotlight — Content Bounty',   description:'Superteam Kazakhstan wants content spotlighting Solana projects building in Kazakhstan. Writers, designers, and video creators welcome.', category:'bounty', source:'Superteam Earn', sourceUrl:'https://superteam.fun/earn/listing/kazakhstan-solana-projects-spotlight-content-bounty/',                                   reward:'TBD',    rewardToken:'USDC', deadline:d(10), tags:['Content','Spotlight','Solana','Community'],  difficulty:'beginner',     applicants:18, isHot:false, createdAt:new Date().toISOString(), raw:{} },

    // Web3.career Jobs — real working category pages
    { id:'w3c-f1', title:'Remote Solana Developer',              description:'Multiple companies hiring remote Solana developers on Web3.career. Roles span Rust smart contracts, frontend dApps, and protocol engineering.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/remote+solana-jobs',          reward:'$120k–$250k', rewardToken:'USD', deadline:null, tags:['Solana','Rust','Remote','Development'],        difficulty:'expert',        applicants:0, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f2', title:'Web3 Community Manager (Remote)',       description:'Fast-growing NFT and DeFi projects seeking community managers for Discord, Twitter, and Telegram. No coding required. Remote positions open now.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/non-tech+remote-jobs',         reward:'$60k–$90k',   rewardToken:'USD', deadline:null, tags:['Community','Discord','Remote','Non-Tech'],     difficulty:'beginner',     applicants:0, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f3', title:'Web3 Content Writer / Copywriter',      description:'Write blog posts, documentation, newsletters, and social content for Web3 projects. Remote. Crypto-native voice and research skills required.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/non-tech+remote-jobs',         reward:'$50k–$80k',   rewardToken:'USD', deadline:null, tags:['Writing','Content','Marketing','Remote'],      difficulty:'beginner',     applicants:0, isHot:false, createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f4', title:'Frontend Web3 Engineer (Remote)',        description:'Leading Web3 protocols hiring frontend engineers with React/Next.js experience. Build dApp interfaces, trading dashboards, and wallet UIs.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/web3-jobs-Remote+front-end',    reward:'$90k–$180k',  rewardToken:'USD', deadline:null, tags:['Frontend','React','Remote','DeFi'],            difficulty:'intermediate', applicants:0, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f5', title:'Solana Foundation — Business Development', description:'Solana Foundation hiring BD leads for payments and fintech. Drive strategic adoption with major financial institutions and enterprise partners.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/web3-companies/solanafoundation+business-development', reward:'Competitive', rewardToken:'USD', deadline:null, tags:['BD','Solana','Fintech','Non-Tech'],           difficulty:'advanced',     applicants:0, isHot:true,  createdAt:new Date().toISOString(), raw:{} },
    { id:'w3c-f6', title:'Remote Non-Tech Web3 Jobs',             description:'Browse dozens of open non-technical Web3 roles — marketing, operations, customer support, social media, and more. All remote on Web3.career.', category:'job', source:'Web3.career', sourceUrl:'https://web3.career/non-tech+remote-jobs',         reward:'Varies',      rewardToken:'USD', deadline:null, tags:['Non-Tech','Remote','Marketing','Operations'],  difficulty:'beginner',     applicants:0, isHot:false, createdAt:new Date().toISOString(), raw:{} },

    // Web3 Foundation Grants
    { id:'w3f-g1', title:'Web3 Foundation Open Grants Program', description:'Web3 Foundation funds open-source projects benefiting the Polkadot and Substrate ecosystem. Grants range from $10k to $100k+. Apply via GitHub.', category:'grant', source:'Web3 Foundation', sourceUrl:'https://grants.web3.foundation/applications', reward:'$10k–$100k+', rewardToken:'USD', deadline:null, tags:['Polkadot','Substrate','Open Source','Infrastructure'], difficulty:'advanced', applicants:0, isHot:false, createdAt:new Date().toISOString(), raw:{} },
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
  ].filter(op => op.title && op.title.trim() && op.title !== 'undefined');

  const mock = getMockData();

  // Deduplicate: remove mock entries whose title already exists in live data
  const liveTitles = new Set(live.map(o => o.title.toLowerCase().trim()));
  const mockFill = mock.filter(o => !liveTitles.has(o.title.toLowerCase().trim()));

  // Filter out junk live ZA entries: single-word titles, test entries, no title
  const junkTitles = new Set(['test', 'developer', 'community', 'design', 'marketing', 'development', 'bootspring', 'protocol updates', 'protocol infrastructure']);
  const cleanLive = live.filter(op => {
    const t = op.title.toLowerCase().trim();
    if (junkTitles.has(t)) return false;
    if (t.length < 5) return false;
    if (op.source === 'Zero Authority DAO' && !op.description && (!op.tags || op.tags.length === 0) && op.reward === 'TBD') return false;
    return true;
  });

  const all = [...cleanLive, ...mockFill];

  return all.map(op => ({ ...op, isHot: op.isHot || (op.applicants || 0) > 20 }));
}

module.exports = { fetchAllOpportunities, getMockData };
