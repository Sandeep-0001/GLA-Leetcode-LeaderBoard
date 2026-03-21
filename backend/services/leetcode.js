const axios = require('axios');
const logger = require('../utils/logger');

function normalizeLeetCodeUsername(value) {
  if (!value) return '';
  const raw = String(value).trim();
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[0].toLowerCase() === 'u') {
      return parts[1].trim();
    }
    if (parts.length >= 1) {
      return parts[0].trim();
    }
    return '';
  } catch (_) {
    return raw
      .replace(/^https?:\/\/([^/]*\.)?leetcode\.com\//i, '')
      .replace(/^u\//i, '')
      .replace(/\/.*/g, '')
      .trim();
  }
}

const graphql = async (query, variables) => {
  const res = await axios.post('https://leetcode.com/graphql', { query, variables }, {
    headers: {
      'Content-Type': 'application/json',
      'Referer': 'https://leetcode.com',
      'User-Agent': 'Mozilla/5.0'
    },
    withCredentials: true,
    timeout: 10000 // 10s timeout to avoid hanging
  });
  return res.data;
};

const fetchSolvedCounts = async (username) => {
  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        submitStats: submitStatsGlobal {
          acSubmissionNum { difficulty count }
        }
      }
    }
  `;
  const data = await graphql(query, { username });
  const ac = data?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
  const get = (d) => ac.find(x => x.difficulty === d)?.count || 0;
  return { easy: get('Easy'), medium: get('Medium'), hard: get('Hard') };
};

const fetchContestRating = async (username) => {
  const query = `
    query userContestRanking($username: String!) {
      userContestRanking(username: $username) { rating }
    }
  `;
  const data = await graphql(query, { username });
  return data?.data?.userContestRanking?.rating || 0;
};

const fetchLeetCodeStats = async (username) => {
  try {
    const normalized = normalizeLeetCodeUsername(username);
    if (!normalized) return null;

    const [solved, rating] = await Promise.all([
      fetchSolvedCounts(normalized),
      fetchContestRating(normalized)
    ]);
    return {
      easySolved: solved.easy || 0,
      mediumSolved: solved.medium || 0,
      hardSolved: solved.hard || 0,
      contestRating: rating || 0
    };
  } catch (e) {
    logger.error('LeetCode API call failed', e, { username });
    // Return null to signal failure so callers can decide whether to keep existing stats
    return null;
  }
};

module.exports = { fetchLeetCodeStats };
