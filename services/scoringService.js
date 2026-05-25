/**
 * ZEROSCOPE Opportunity Scoring Engine
 * Scores each opportunity 0–100 based on user profile match.
 */

// Skill aliases — maps broad skills to related tags/keywords
const SKILL_ALIASES = {
  'react':        ['react', 'frontend', 'ui', 'javascript', 'nextjs', 'web'],
  'ui/ux':        ['ui/ux', 'design', 'figma', 'ux', 'ui', 'frontend', 'interface'],
  'design':       ['design', 'figma', 'ui/ux', 'graphics', 'animation', 'visual', 'creative'],
  'content':      ['content', 'writing', 'copywriting', 'documentation', 'blog', 'articles', 'twitter', 'social media', 'thread'],
  'marketing':    ['marketing', 'growth', 'social media', 'twitter', 'community', 'content', 'seo', 'branding'],
  'community':    ['community', 'discord', 'telegram', 'social', 'marketing', 'governance', 'dao'],
  'development':  ['development', 'developer', 'engineering', 'solidity', 'rust', 'typescript', 'javascript', 'python', 'backend', 'frontend', 'fullstack'],
  'solidity':     ['solidity', 'smart contracts', 'ethereum', 'evm', 'defi', 'web3'],
  'rust':         ['rust', 'solana', 'programs', 'blockchain', 'systems'],
  'solana':       ['solana', 'rust', 'anchor', 'web3', 'blockchain'],
  'web3':         ['web3', 'blockchain', 'crypto', 'defi', 'nft', 'dao', 'solana', 'ethereum'],
  'defi':         ['defi', 'finance', 'trading', 'yield', 'protocol', 'smart contracts'],
  'nft':          ['nft', 'art', 'creative', 'collectibles', 'digital art'],
  'video':        ['video', 'animation', 'content', 'youtube', 'editing', 'media'],
  'research':     ['research', 'analysis', 'writing', 'content', 'strategy'],
  'python':       ['python', 'data', 'backend', 'automation', 'scripting'],
  'typescript':   ['typescript', 'javascript', 'frontend', 'backend', 'react', 'node'],
  'node':         ['node', 'backend', 'javascript', 'api', 'server'],
  'business':     ['business', 'strategy', 'bd', 'sales', 'partnerships', 'growth'],
  'devrel':       ['devrel', 'developer relations', 'content', 'community', 'education', 'tutorials'],
};

/**
 * Normalise a string for matching
 */
function norm(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

/**
 * Expand user skills to a full keyword set using aliases
 */
function expandSkills(skills = []) {
  const expanded = new Set();
  skills.forEach(skill => {
    const key = norm(skill);
    expanded.add(key);
    // Check direct alias
    if (SKILL_ALIASES[key]) {
      SKILL_ALIASES[key].forEach(alias => expanded.add(alias));
    }
    // Partial match on alias keys
    Object.entries(SKILL_ALIASES).forEach(([aliasKey, aliasVals]) => {
      if (aliasKey.includes(key) || key.includes(aliasKey)) {
        expanded.add(aliasKey);
        aliasVals.forEach(v => expanded.add(v));
      }
    });
  });
  return expanded;
}

/**
 * Score skill match (0–40 points)
 * Checks title, description, and tags against expanded user skills
 */
function scoreSkillMatch(opportunity, expandedSkills) {
  if (!expandedSkills || expandedSkills.size === 0) return 20; // neutral if no skills set

  const opText = norm([
    opportunity.title,
    opportunity.description,
    ...(opportunity.tags || []),
  ].join(' '));

  let hits = 0;
  let total = expandedSkills.size;

  expandedSkills.forEach(skill => {
    if (opText.includes(skill)) hits++;
  });

  // Tag-specific bonus: direct tag match is stronger signal
  const opTags = (opportunity.tags || []).map(norm);
  let tagHits = 0;
  expandedSkills.forEach(skill => {
    if (opTags.some(tag => tag.includes(skill) || skill.includes(tag))) tagHits++;
  });

  const baseScore = total > 0 ? (hits / Math.min(total, 8)) * 30 : 15;
  const tagBonus = Math.min(tagHits * 3, 10);
  return Math.min(Math.round(baseScore + tagBonus), 40);
}

/**
 * Score reward size (0–20 points)
 */
function scoreReward(opportunity) {
  const raw = parseFloat(opportunity.reward);
  if (isNaN(raw)) return 8; // TBD / Open — neutral score

  if (raw >= 10000) return 20;
  if (raw >= 5000)  return 17;
  if (raw >= 1000)  return 14;
  if (raw >= 500)   return 11;
  if (raw >= 100)   return 8;
  return 5;
}

/**
 * Score deadline urgency (0–20 points)
 * Closer deadlines = higher urgency score (encourages timely action)
 */
function scoreDeadline(opportunity) {
  if (!opportunity.deadline) return 10; // open / no deadline — neutral

  const now = Date.now();
  const deadline = new Date(opportunity.deadline).getTime();
  const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);

  if (daysLeft < 0)  return 0;  // expired
  if (daysLeft <= 2) return 20; // ending very soon — urgent
  if (daysLeft <= 5) return 17;
  if (daysLeft <= 7) return 14;
  if (daysLeft <= 14) return 11;
  if (daysLeft <= 30) return 8;
  return 6;
}

/**
 * Score difficulty match (0–15 points)
 * Matches opportunity difficulty to user experience level
 */
function scoreDifficulty(opportunity, experienceLevel = 'intermediate') {
  const opLevel = norm(opportunity.difficulty || 'intermediate');
  const userLevel = norm(experienceLevel);

  // Perfect match
  if (opLevel === userLevel) return 15;

  // Adjacency scoring
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];
  const opIdx   = levels.indexOf(opLevel);
  const userIdx = levels.indexOf(userLevel);
  const diff    = Math.abs(opIdx - userIdx);

  if (diff === 0) return 15;
  if (diff === 1) return 10;
  if (diff === 2) return 5;
  return 2;
}

/**
 * Score platform relevance (0–5 points)
 * Zero Authority DAO is the primary platform for this community
 */
function scorePlatform(opportunity) {
  const src = norm(opportunity.source || '');
  if (src.includes('zero authority')) return 5;
  if (src.includes('superteam'))      return 4;
  if (src.includes('web3'))           return 3;
  return 2;
}

/**
 * Main scoring function — returns opportunity with score and breakdown
 */
function scoreOpportunity(opportunity, userProfile) {
  const expandedSkills = userProfile
    ? expandSkills(userProfile.skills || [])
    : new Set();

  const experienceLevel = userProfile?.experienceLevel || 'intermediate';

  const breakdown = {
    skillMatch:    scoreSkillMatch(opportunity, expandedSkills),
    reward:        scoreReward(opportunity),
    deadline:      scoreDeadline(opportunity),
    difficulty:    scoreDifficulty(opportunity, experienceLevel),
    platform:      scorePlatform(opportunity),
  };

  const total = Math.min(
    breakdown.skillMatch +
    breakdown.reward +
    breakdown.deadline +
    breakdown.difficulty +
    breakdown.platform,
    100
  );

  return {
    ...opportunity,
    score: total,
    scoreBreakdown: breakdown,
    matchLabel: total >= 80 ? 'Excellent Match' :
                total >= 60 ? 'Good Match' :
                total >= 40 ? 'Fair Match' : 'Low Match',
    matchColor: total >= 80 ? 'var(--success)' :
                total >= 60 ? 'var(--accent)' :
                total >= 40 ? '#f59e0b' : 'var(--text-dim)',
  };
}

/**
 * Score and rank all opportunities for a user
 * Returns sorted array (highest score first)
 */
function rankOpportunities(opportunities, userProfile) {
  const scored = opportunities.map(op => scoreOpportunity(op, userProfile));
  return scored.sort((a, b) => b.score - a.score);
}

module.exports = { rankOpportunities, scoreOpportunity, expandSkills };
