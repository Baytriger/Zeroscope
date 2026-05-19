const express = require('express');
const router = express.Router();
const axios = require('axios');
const { fetchAllOpportunities } = require('../services/dataService');

// POST /api/chat — AI assistant for bounty/job recommendations
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    const opportunities = await fetchAllOpportunities();

    const opsSummary = opportunities.slice(0, 30).map(o =>
      `[${o.category.toUpperCase()}] ${o.title} | Reward: ${o.reward} ${o.rewardToken} | Tags: ${o.tags.join(', ')} | Source: ${o.source} | Deadline: ${o.deadline ? new Date(o.deadline).toDateString() : 'Open'}`
    ).join('\n');

    const opsFull = opportunities.slice(0, 40).map((o, i) =>
      `${i+1}. [${o.category.toUpperCase()}] "${o.title}"\n   Reward: ${o.reward} ${o.rewardToken} | Difficulty: ${o.difficulty} | Tags: ${o.tags.join(', ')} | Source: ${o.source} | Deadline: ${o.deadline ? new Date(o.deadline).toDateString() : 'Open'}`
    ).join('\n\n');

    const systemPrompt = `You are ZERO, the ZEROSCOPE AI assistant — an expert Web3 career and opportunity advisor built for the Zero Authority DAO community.
You have FULL knowledge of every live opportunity on the platform and can match contributors to the best ones based on their skills, experience, and goals.

LIVE OPPORTUNITIES ON ZEROSCOPE RIGHT NOW (${opportunities.length} total):
${opsFull}

YOUR CAPABILITIES:
- Match users to specific opportunities by skill, background, or interest (e.g. "I'm a content writer" → find content/documentation bounties)
- Explain what each opportunity involves and how to succeed at it
- Compare opportunities by reward, difficulty, and deadline urgency
- Advise on Web3 career paths and how to build reputation
- Help users understand grant vs bounty vs job differences

RESPONSE RULES:
- Always refer to ACTUAL opportunities from the list above by name when recommending
- Be specific: mention the title, reward, and WHY it fits the user
- If someone describes their skills, match them to 2-3 real opportunities from the list
- Use emojis sparingly but effectively (🎯 for recommendations, ⏱ for deadlines, 💰 for rewards)
- Keep responses under 220 words unless a detailed breakdown is explicitly requested
- If no opportunities match, say so honestly and suggest what skills to build`;

    const messages = [
      ...history.slice(-6),
      { role: 'user', content: message }
    ];

    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      timeout: 15000,
    });

    const reply = response.data.content[0].text;
    res.json({ success: true, reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    // Fallback smart responses when no API key
    const fallbacks = [
      "🔭 Based on current trends, focus on Solidity and smart contract development — it commands the highest rewards in Web3 bounties right now.",
      "💡 For beginners, documentation and community bounties are the best entry points. They build your reputation while paying well.",
      "🎯 Hot tip: Grant programs like those from Zero Authority DAO often have less competition than bounties. Your odds are better!",
      "🏗️ Builder-tier opportunities (smart contracts, SDKs) offer 3-5x the reward of content tasks. Worth the skill investment.",
    ];
    const reply = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    res.json({ success: true, reply, fallback: true });
  }
});

// GET /api/opportunities — JSON feed
router.get('/opportunities', async (req, res) => {
  try {
    const opportunities = await fetchAllOpportunities();
    res.json({ success: true, count: opportunities.length, data: opportunities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
