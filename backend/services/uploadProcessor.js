const xlsx = require('xlsx');
const Student = require('../models/Student');
const { fetchLeetCodeStats } = require('./leetcode');
const { invalidateLeaderboardCache } = require('./leaderboardCache');
const logger = require('../utils/logger');

// Normalize a LeetCode identifier
function normalizeUsername(value) {
  if (!value) return '';
  const raw = String(value).trim();
  const sanitize = (candidate) => String(candidate || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '')
    .replace(/[^A-Za-z0-9_-]/g, '');

  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    let user = '';
    if (parts.length >= 2 && parts[0].toLowerCase() === 'u') {
      user = parts[1];
    } else if (parts.length >= 1) {
      user = parts[0];
    }
    return sanitize(user);
  } catch (_) {
    const stripped = raw
      .replace(/^https?:\/\/([^/]*\.)?leetcode\.com\//i, '')
      .replace(/^u\//i, '')
      .replace(/\/.*/g, '')
      .trim();
    return sanitize(stripped);
  }
}

function normalizeYearLevel(raw) {
  const s = (raw || '').toString().toLowerCase();
  if (!s) return '';
  if (/(^|\b)(2|2nd|second)\b/.test(s)) return '2';
  if (/(^|\b)(3|3rd|third)\b/.test(s)) return '3';
  if (/(^|\b)(4|4th|fourth)\b/.test(s)) return '4';
  return '';
}

function normalizeKey(k) {
  return String(k || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function getVal(obj, variants) {
  for (const v of variants) {
    if (obj[v] != null && obj[v] !== '') return obj[v];
  }
  return '';
}

// Fetch stats with retry logic and parallel limits
async function fetchStatsWithRetry(username, maxRetries = 2) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const stats = await fetchLeetCodeStats(username);
      if (stats) return stats;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
      }
    } catch (err) {
      if (attempt === maxRetries) {
        logger.error('Failed to fetch student stats after retries', err, { username, attempts: maxRetries + 1 });
        return null;
      }
      // Wait before retry (exponential backoff)
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
  return null;
}

// Process students in parallel batches
async function processBatch(docs, existingByUsername, batchSize = Number(process.env.LEETCODE_FETCH_BATCH_SIZE || 20)) {
  const results = [];
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = docs.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(d => 
        fetchStatsWithRetry(d.leetcodeUsername).then(stats => ({ ...d, stats }))
      )
    );

    for (const result of batchResults) {
      if (result.status === 'fulfilled') {
        const { stats, ...doc } = result.value;
        if (stats) {
          doc.easySolved = stats.easySolved || 0;
          doc.mediumSolved = stats.mediumSolved || 0;
          doc.hardSolved = stats.hardSolved || 0;
          doc.contestRating = stats.contestRating || 0;
          doc.lastUpdated = new Date();
          results.push({ doc, success: true });
        } else {
          const existing = existingByUsername.get(doc.leetcodeUsername);
          if (existing) {
            doc.easySolved = Number(existing.easySolved) || 0;
            doc.mediumSolved = Number(existing.mediumSolved) || 0;
            doc.hardSolved = Number(existing.hardSolved) || 0;
            doc.contestRating = Number(existing.contestRating) || 0;
            doc.lastUpdated = existing.lastUpdated || new Date();
            results.push({ doc, success: true });
          } else {
            results.push({ doc, success: false, error: 'Stats fetch failed for new student' });
          }
        }
      } else {
        results.push({ doc: result.reason, success: false, error: result.reason.message });
      }
    }

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < docs.length) {
      await new Promise(r => setTimeout(r, Number(process.env.LEETCODE_BATCH_DELAY_MS || 20)));
    }
  }

  return results;
}

// Bulk write to database
async function bulkWriteStudents(docs) {
  const operations = docs.map(doc => ({
    updateOne: {
      filter: { leetcodeUsername: doc.leetcodeUsername },
      update: {
        $set: {
          name: doc.name,
          universityId: doc.universityId,
          batch: doc.batch,
          section: doc.section || undefined,
          yearLevel: doc.yearLevel || undefined,
          easySolved: doc.easySolved,
          mediumSolved: doc.mediumSolved,
          hardSolved: doc.hardSolved,
          totalSolved: (Number(doc.easySolved) || 0) + (Number(doc.mediumSolved) || 0) + (Number(doc.hardSolved) || 0),
          contestRating: doc.contestRating,
          lastUpdated: doc.lastUpdated,
        },
      },
      upsert: true,
    },
  }));

  if (operations.length === 0) return { insertedCount: 0, modifiedCount: 0 };

  try {
    const result = await Student.collection.bulkWrite(operations);
    return {
      insertedCount: result.upsertedCount || 0,
      modifiedCount: result.modifiedCount || 0,
    };
  } catch (err) {
    logger.error('Database bulk operation failed', err);
    throw err;
  }
}

// Main upload processor
async function processUpload(fileBuffer, year, onProgress) {
  try {
    // Parse file (xlsx handles both Excel and CSV)
    let rows = [];
    try {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    } catch (err) {
      // If xlsx fails, try parsing as CSV directly
      const text = fileBuffer.toString('utf-8');
      const lines = text.trim().split('\n');
      if (lines.length < 2) throw new Error('File is empty or invalid');
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || '';
        });
        return obj;
      }).filter(row => Object.values(row).some(v => v)); // Filter empty rows
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error('File is empty or invalid');
    }

    const totalStudents = rows.length;
    const selectedYear = (year || '').toString();
    const displayBatch = selectedYear === '2' ? '2nd Year' : selectedYear === '3' ? '3rd Year' : selectedYear === '4' ? '4th Year' : '';

    // Normalize rows
    const normalizedRows = rows.map((r) => {
      const n = {};
      Object.keys(r).forEach((k) => {
        n[normalizeKey(k)] = r[k];
      });
      return n;
    });

    // Extract student data
    const docs = [];
    let invalidRows = 0;
    for (const row of normalizedRows) {
      const name = getVal(row, ['name', 'fullname', 'studentname']);
      const rawUser = getVal(row, [
        'leetcodeusername',
        'leetcode',
        'leetcodeid',
        'leetcodeurl',
        'leetcodeprofile',
        'username',
        'profile',
        'profileurl'
      ]);
      if (!name || !rawUser) {
        invalidRows += 1;
        continue;
      }
      const normalizedUsername = normalizeUsername(rawUser);
      if (!normalizedUsername) {
        invalidRows += 1;
        continue;
      }
      docs.push({
        name: String(name).trim(),
        leetcodeUsername: normalizedUsername,
        universityId: getVal(row, ['universityid', 'roll', 'rollno', 'rollnumber']) || '',
        batch: displayBatch || (getVal(row, ['batch', 'year']) || ''),
        section: getVal(row, ['section', 'div', 'division']) || '',
        yearLevel: selectedYear || normalizeYearLevel(getVal(row, ['batch', 'year'])),
      });
    }

    if (docs.length === 0) {
      throw new Error('No valid rows found. Ensure your first sheet has headers: name, leetcodeUsername');
    }

    const usernames = [...new Set(docs.map((d) => d.leetcodeUsername))];
    const existingStudents = await Student.find({ leetcodeUsername: { $in: usernames } })
      .select({
        _id: 0,
        leetcodeUsername: 1,
        easySolved: 1,
        mediumSolved: 1,
        hardSolved: 1,
        contestRating: 1,
        lastUpdated: 1,
      })
      .lean();
    const existingByUsername = new Map(existingStudents.map((s) => [s.leetcodeUsername, s]));

    // Report initial progress
    onProgress({
      jobId: null,
      status: 'fetching_stats',
      totalStudents: docs.length,
      processed: 0,
      inserted: 0,
      updated: 0,
      failed: 0,
      percentage: 5,
    });

    // Process in parallel batches
    const batchedResults = await processBatch(docs, existingByUsername);
    const successfulDocs = batchedResults.filter(r => r.success).map(r => r.doc);
    const failedCount = (batchedResults.length - successfulDocs.length) + invalidRows;

    // Report progress before writing
    onProgress({
      status: 'writing_database',
      totalStudents: docs.length,
      processed: successfulDocs.length,
      inserted: 0,
      updated: 0,
      failed: failedCount,
      percentage: 50,
    });

    // Bulk write to database in chunks
    const dbChunkSize = 1000;
    let totalInserted = 0;
    let totalUpdated = 0;

    for (let i = 0; i < successfulDocs.length; i += dbChunkSize) {
      const chunk = successfulDocs.slice(i, i + dbChunkSize);
      const dbResult = await bulkWriteStudents(chunk);
      totalInserted += dbResult.insertedCount || 0;
      totalUpdated += dbResult.modifiedCount || 0;

      // Report progress
      const currentProcessed = Math.min(i + dbChunkSize, successfulDocs.length);
      const percentage = 50 + (currentProcessed / successfulDocs.length) * 40;
      onProgress({
        status: 'writing_database',
        totalStudents: docs.length,
        processed: currentProcessed,
        inserted: totalInserted,
        updated: totalUpdated,
        failed: failedCount,
        percentage: Math.min(percentage, 90),
      });
    }

    // Invalidate cache
    invalidateLeaderboardCache();

    // Final progress
    onProgress({
      status: 'completed',
      totalStudents: docs.length,
      processed: successfulDocs.length,
      inserted: totalInserted,
      updated: totalUpdated,
      failed: failedCount,
      percentage: 100,
    });

    return {
      message: `Inserted ${totalInserted}, updated ${totalUpdated}${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      inserted: totalInserted,
      updated: totalUpdated,
      failed: failedCount,
      total: docs.length,
      year: selectedYear || undefined,
    };
  } catch (err) {
    logger.error('Upload processing failed', err);
    throw err;
  }
}

module.exports = {
  processUpload,
};
