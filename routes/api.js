const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const { fetchAllOpportunities } = require('../services/dataService');

// ── Smart free AI engine ────────────────────────────────────────────────────
function smartReply(message, opportunities) {
  const msg = message.toLowerCase().trim();
  const all = opportunities;

  // Format one opportunity nicely
  const fmt = (op) => {
    const days = op.deadline ? Math.max(0, Math.ceil((new Date(op.deadline) - Date.now()) / 86400000)) : null;
    const deadline = days !== null ? `⏱ ${days}d left` : '🟢 Open';
    const reward = isNaN(parseFloat(op.reward)) ? op.reward : `$${parseFloat(op.reward).toLocaleString()}`;
    return `**${op.title}**\n` +
      `   💰 ${reward} ${op.rewardToken} · ${op.difficulty} · ${deadline}\n` +
      `   🏷 ${(op.tags || []).slice(0,4).join(', ') || 'General'} · ${op.source}\n` +
      (op.sourceUrl ? `   🔗 ${op.sourceUrl}` : '');
  };

  // Match opportunity text
  const match = (op, keywords) =>
    keywords.some(k =>
      (op.title + ' ' + (op.tags || []).join(' ') + ' ' + (op.description || '')).toLowerCase().includes(k)
    );

  // Greetings
  if (/^(hi|hello|hey|sup|yo|what.s up|howdy)/.test(msg)) {
    const total = all.length;
    const hot = all.filter(o => o.isHot).length;
    return `👋 Hey! I'm **ZERO**, your Web3 opportunity advisor on ZEROSCOPE.\n\nRight now we have **${total} live opportunities** — ${hot} are trending 🔥\n\nTell me your skills or ask me anything! Try:\n• *"I'm a content writer"*\n• *"Show me hot bounties"*\n• *"Best for beginners"*\n• *"What grants are open?"*`;
  }

  // Help
  if (/^help|what can you|what do you know|commands/.test(msg)) {
    return `🔭 Here's what I can help with:\n\n**By skill:** "I'm a [designer/developer/writer/marketer]"\n**By category:** "Show me [bounties/grants/jobs/events]"\n**By level:** "Best for beginners" / "Advanced opportunities"\n**By platform:** "Show Zero Authority opportunities" / "Superteam listings"\n**Hot picks:** "What's trending?" / "Hot opportunities"\n**Deadline:** "Ending soon" / "Urgent bounties"\n**Stats:** "How many opportunities?" / "Total rewards"\n\nI know all ${all.length} live listings — just ask!`;
  }

  // Stats
  if (/how many|total|count|stats|overview/.test(msg)) {
    const cats = ['bounty','grant','job','event'];
    const counts = cats.map(c => `${all.filter(o=>o.category===c).length} ${c}s`).join(', ');
    const hotCount = all.filter(o=>o.isHot).length;
    const zaCount = all.filter(o=>o.source.includes('Zero Authority')).length;
    const stCount = all.filter(o=>o.source.includes('Superteam')).length;
    return `📊 **ZEROSCOPE Live Stats:**\n\n**${all.length} total opportunities**\n• ${counts}\n• ${hotCount} trending 🔥\n\n**By platform:**\n• Zero Authority DAO: ${zaCount}\n• Superteam Earn: ${stCount}\n• Others: ${all.length - zaCount - stCount}`;
  }

  // Skill-based matching
  const skillMap = {
    'content|writer|writing|copywriter|article|blog|documentation|doc':
      ['content', 'writing', 'copywriting', 'documentation', 'thread', 'article', 'blog', 'clipping', 'clip'],
    'design|figma|ui|ux|graphic|visual|animation|illustrat':
      ['design', 'figma', 'ui', 'ux', 'graphic', 'animation', 'visual', 'creative', 'art'],
    'developer|dev|solidity|smart contract|rust|code|build|coding|engineer|typescript|python|node|react|frontend|backend':
      ['development', 'solidity', 'rust', 'smart contract', 'build', 'code', 'clarity', 'typescript', 'react', 'frontend', 'backend'],
    'market|growth|social|community manager|twitter|x post|brand':
      ['marketing', 'growth', 'social', 'twitter', 'community', 'x', 'brand', 'campaign'],
    'video|youtube|animation|clip|clipping|editor|film':
      ['video', 'clip', 'clipping', 'animation', 'youtube', 'media', 'film'],
    'research|analys|strategy|business|bd|business development':
      ['research', 'analysis', 'strategy', 'business', 'bd'],
    'community|discord|telegram|dao|governance|mod|moderator':
      ['community', 'discord', 'dao', 'governance', 'mod'],
    'meme|memes|funny|humor':
      ['meme', 'funny', 'humor', 'creative', 'art'],
  };

  for (const [pattern, keywords] of Object.entries(skillMap)) {
    if (new RegExp(pattern).test(msg)) {
      const matches = all
        .filter(op => match(op, keywords))
        .sort((a, b) => {
          if (b.isHot !== a.isHot) return b.isHot ? 1 : -1;
          const ad = a.deadline ? new Date(a.deadline) : Infinity;
          const bd = b.deadline ? new Date(b.deadline) : Infinity;
          return ad - bd;
        })
        .slice(0, 3);

      const skill = pattern.split('|')[0];
      if (matches.length > 0) {
        const total = all.filter(op => match(op, keywords)).length;
        return `🎯 Top picks for **${skill}** skills (${total} total matches):\n\n${matches.map(fmt).join('\n\n')}\n\n💡 Click the 🔗 links above to apply directly!`;
      }
    }
  }

  // Category queries
  if (/bounty|bounties/.test(msg)) {
    const items = all.filter(o => o.category === 'bounty')
      .sort((a,b) => (b.isHot?1:0)-(a.isHot?1:0)).slice(0, 3);
    return `🎯 **Top Bounties right now (${all.filter(o=>o.category==='bounty').length} total):**\n\n${items.map(fmt).join('\n\n')}\n\nFilter by "Bounties" on the dashboard to see all!`;
  }

  if (/grant|grants|funding|degrant/.test(msg)) {
    const items = all.filter(o => o.category === 'grant').slice(0, 3);
    return items.length > 0
      ? `💰 **Active Grants (${all.filter(o=>o.category==='grant').length} total):**\n\n${items.map(fmt).join('\n\n')}\n\nGrants typically have larger rewards but require a proposal.`
      : `No grants currently listed. Check Zero Authority DeGrants at zeroauthoritydao.com/funding/degrants`;
  }

  if (/job|jobs|work|hire|hiring|career|employ/.test(msg)) {
    const items = all.filter(o => o.category === 'job').slice(0, 3);
    return items.length > 0
      ? `💼 **Open Web3 Jobs (${all.filter(o=>o.category==='job').length} total):**\n\n${items.map(fmt).join('\n\n')}\n\nMost are remote-first. Click the links to apply!`
      : `No jobs currently listed. Check web3.career directly!`;
  }

  if (/event|events|hackathon|quest|quests/.test(msg)) {
    const items = all.filter(o => o.category === 'event').slice(0, 3);
    return items.length > 0
      ? `🎪 **Events & Quests (${all.filter(o=>o.category==='event').length} total):**\n\n${items.map(fmt).join('\n\n')}\n\nEvents are great for building your on-chain reputation!`
      : `No events currently listed. Watch the Zero Authority DAO community for upcoming events!`;
  }

  // Platform queries
  if (/zero authority|zero dao|za |stacks/.test(msg)) {
    const items = all.filter(o => o.source.includes('Zero Authority')).slice(0, 3);
    return `🏛️ **Zero Authority DAO Opportunities (${all.filter(o=>o.source.includes('Zero Authority')).length} total):**\n\n${items.map(fmt).join('\n\n')}`;
  }

  if (/superteam|solana/.test(msg)) {
    const items = all.filter(o => o.source.includes('Superteam')).slice(0, 3);
    return items.length > 0
      ? `⚡ **Superteam Earn Listings (${items.length} shown):**\n\n${items.map(fmt).join('\n\n')}`
      : `No Superteam listings loaded right now. Visit earn.superteam.fun directly.`;
  }

  // Difficulty
  if (/beginner|easy|start|new|newbie|noob/.test(msg)) {
    const items = all.filter(o => o.difficulty === 'beginner')
      .sort((a,b) => (b.isHot?1:0)-(a.isHot?1:0)).slice(0, 3);
    return items.length > 0
      ? `🌱 **Best for Beginners (${all.filter(o=>o.difficulty==='beginner').length} total):**\n\n${items.map(fmt).join('\n\n')}\n\nThese are great starting points to build your Web3 reputation!`
      : `No beginner opportunities right now. Check back soon!`;
  }

  if (/advanced|expert|senior|hard|difficult/.test(msg)) {
    const items = all.filter(o => ['advanced','expert'].includes(o.difficulty)).slice(0, 3);
    return items.length > 0
      ? `🔥 **Advanced Opportunities:**\n\n${items.map(fmt).join('\n\n')}`
      : `No advanced-level opportunities right now.`;
  }

  // Hot / trending
  if (/hot|trend|popular|best|top|recommend/.test(msg)) {
    const items = all.filter(o => o.isHot).slice(0, 3);
    return items.length > 0
      ? `🔥 **Trending Right Now:**\n\n${items.map(fmt).join('\n\n')}\n\nThese are the most active opportunities on ZEROSCOPE!`
      : `No trending opportunities tagged right now. Here are the newest:\n\n${all.slice(0,3).map(fmt).join('\n\n')}`;
  }

  // Deadline urgency
  if (/urgent|ending|soon|deadline|expir|closing|last chance/.test(msg)) {
    const items = all
      .filter(o => o.deadline)
      .sort((a,b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 3);
    return items.length > 0
      ? `⏱️ **Ending Soonest — Apply Now:**\n\n${items.map(fmt).join('\n\n')}\n\nDon't miss these deadlines!`
      : `No upcoming deadlines tracked right now.`;
  }

  // Highest reward
  if (/reward|money|pay|earn|highest|most|prize/.test(msg)) {
    const items = all
      .filter(o => !isNaN(parseFloat(o.reward)))
      .sort((a,b) => parseFloat(b.reward) - parseFloat(a.reward))
      .slice(0, 3);
    return items.length > 0
      ? `💰 **Highest Rewards Available:**\n\n${items.map(fmt).join('\n\n')}\n\nHigher rewards usually mean more competition — make sure your submission stands out!`
      : `Most rewards are listed as TBD. Check each opportunity's page for details.`;
  }

  // Fuzzy fallback
  const words = msg.split(/\s+/).filter(w => w.length > 3);
  const fuzzy = all.filter(op =>
    words.some(w => (op.title + ' ' + (op.tags||[]).join(' ')).toLowerCase().includes(w))
  ).slice(0, 2);

  if (fuzzy.length > 0) {
    return `Here's what I found related to your query:\n\n${fuzzy.map(fmt).join('\n\n')}\n\n💡 Try: *"I'm a [skill]"*, *"show me bounties"*, or *"help"* for all commands.`;
  }

  return `🔭 I couldn't find a match for that. Here are today's top picks:\n\n${all.filter(o=>o.isHot).slice(0,2).map(fmt).join('\n\n')}\n\nType **"help"** to see everything I can do, or ask *"I'm a [your skill]"* for personalized picks!`;
}

// POST /api/chat
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.json({ success: true, reply: 'Please type a message!' });
    }

    const opportunities = await fetchAllOpportunities();

    // Try Anthropic if key is set and has credits
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const opsFull = opportunities.slice(0, 40).map((o, i) =>
          `${i+1}. [${o.category.toUpperCase()}] "${o.title}" | Reward: ${o.reward} ${o.rewardToken} | Difficulty: ${o.difficulty} | Tags: ${(o.tags||[]).join(', ')} | Source: ${o.source} | Deadline: ${o.deadline ? new Date(o.deadline).toDateString() : 'Open'} | URL: ${o.sourceUrl || 'N/A'}`
        ).join('\n');

        const systemPrompt = `You are ZERO, the ZEROSCOPE AI assistant for the Zero Authority DAO community. You know every live opportunity on the platform.\n\nLIVE OPPORTUNITIES (${opportunities.length} total):\n${opsFull}\n\nRules: Be concise (under 200 words). Recommend specific opportunities by name. Use emojis sparingly.`;

        const response = await axios.post('https://api.anthropic.com/v1/messages', {
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 400,
          system: systemPrompt,
          messages: [{ role: 'user', content: message }],
        }, {
          headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          timeout: 10000,
        });

        return res.json({ success: true, reply: response.data.content[0].text });
      } catch (apiErr) {
        // Fall through to smart engine
      }
    }

    // Free smart engine
    const reply = smartReply(message, opportunities);
    res.json({ success: true, reply });

  } catch (err) {
    console.error('Chat error:', err.message);
    res.json({ success: true, reply: '🔭 Something went wrong. Try asking: "Show me hot bounties" or "I\'m a designer, what should I apply for?"' });
  }
});

// GET /api/opportunities
router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await fetchAllOpportunities();
    res.json({ success: true, count: opportunities.length, data: opportunities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

// GET /api/debug-za — see raw ZA API response (remove after debugging)
router.get('/debug-za', async (req, res) => {
  try {
    const axios = require('axios');
    const result = await axios.get('https://zeroauthoritydao.com/api/bounties', {
      timeout: 8000,
      headers: { 'Accept': 'application/json' }
    });
    const items = result.data?.data || result.data || [];
    // Return first 3 items with ALL fields
    res.json({ 
      total: items.length,
      sample: items.slice(0, 3),
      firstItemKeys: items[0] ? Object.keys(items[0]) : []
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});
