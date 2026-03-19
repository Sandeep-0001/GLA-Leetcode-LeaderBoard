const cache = new Map();

function nowMs() {
  return Date.now();
}

function makeKey({ year, section, page, limit, q }) {
  return JSON.stringify({ year: year || '', section: section || '', page: Number(page) || 1, limit: Number(limit) || 100, q: q || '' });
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= nowMs()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value, ttlMs) {
  cache.set(key, { value, expiresAt: nowMs() + ttlMs });
}

function invalidateLeaderboardCache() {
  cache.clear();
}

module.exports = {
  makeKey,
  getCached,
  setCached,
  invalidateLeaderboardCache,
};
