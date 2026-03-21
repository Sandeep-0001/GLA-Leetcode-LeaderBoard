const Student = require('../models/Student');
const { makeKey, getCached, setCached, invalidateLeaderboardCache } = require('../services/leaderboardCache');
const { createUploadJob, getUploadJobStatus } = require('../services/queue');
const { fetchLeetCodeStats } = require('../services/leetcode');
const logger = require('../utils/logger');

function getYearFilter(year) {
  if (!year) return {};

  if (year === '2') {
    return {
      $or: [
        { yearLevel: '2' },
        { batch: { $regex: /(\b2\b|2nd|second)/i } },
      ],
    };
  }

  if (year === '3') {
    return {
      $or: [
        { yearLevel: '3' },
        { batch: { $regex: /(\b3\b|3rd|third)/i } },
      ],
    };
  }

  if (year === '4') {
    return {
      $or: [
        { yearLevel: '4' },
        { batch: { $regex: /(\b4\b|4th|fourth)/i } },
      ],
    };
  }

  return { yearLevel: year };
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'application/octet-stream'
];

// Helper to validate file by extension as fallback
function isValidFileExt(fileName) {
  const name = fileName.toLowerCase();
  return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
}

// POST /api/students/upload
exports.uploadStudents = async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const file = req.files.file;
    const year = (req.body?.year || '').toString();

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ message: 'File too large. Maximum size is 5MB.' });
    }

    // Validate file type (by MIME type or extension)
    const isMimeTypeValid = ALLOWED_MIME_TYPES.includes(file.mimetype);
    const isExtValid = isValidFileExt(file.name);
    
    if (!isMimeTypeValid && !isExtValid) {
      return res.status(400).json({ message: 'Invalid file type. Only Excel (.xlsx, .xls) or CSV files are allowed.' });
    }

    const job = await createUploadJob({
      fileBuffer: file.data,
      fileName: file.name,
      year,
    });

    return res.status(202).json({
      message: 'Upload queued. Check progress with jobId.',
      jobId: String(job.id),
      statusUrl: `/api/students/upload-progress/${job.id}`,
    });
  } catch (err) {
    logger.error('Upload processing failed', err, { endpoint: '/upload' });
    return res.status(500).json({ message: 'Upload failed. Please try again.' });
  }
};

// GET /api/students/upload-progress/:jobId
exports.getUploadProgress = async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await getUploadJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ message: 'Job not found' });
    }

    return res.json({
      jobId: status.jobId,
      state: status.state,
      attempts: status.attempts,
      progress: status.progress,
      failedReason: status.failedReason,
    });
  } catch (err) {
    logger.error('Upload progress fetch failed', err, { endpoint: '/upload-progress', jobId: req.params.jobId });
    return res.status(500).json({ message: 'Failed to fetch progress.' });
  }
};

// GET /api/students/upload-result/:jobId
exports.getUploadResult = async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await getUploadJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (status.state === 'completed') {
      return res.json({
        status: 'completed',
        result: status.result,
      });
    } else if (status.state === 'failed') {
      return res.status(400).json({
        status: 'failed',
        error: status.failedReason,
      });
    } else {
      return res.json({
        status: status.state,
        progress: status.progress || {},
      });
    }
  } catch (err) {
    logger.error('Upload result fetch failed', err, { endpoint: '/upload-result', jobId: req.params.jobId });
    return res.status(500).json({ message: 'Failed to fetch result.' });
  }
};

// GET /api/students/sections
exports.getSections = async (req, res) => {
  try {
    const year = (req.query?.year || '').toString().trim();
    const filter = { section: { $exists: true, $ne: '' } };
    if (year) Object.assign(filter, getYearFilter(year));

    const sections = await Student.distinct('section', filter);
    const normalized = sections
      .map((s) => String(s).trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    return res.json({ data: normalized });
  } catch (err) {
    logger.error('Sections fetch failed', err, { endpoint: '/sections' });
    return res.status(500).json({ message: 'Failed to fetch sections.' });
  }
};


// GET /api/students/leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const year = (req.query?.year || '').toString().trim(); // '2' | '3' | '4'
    const section = (req.query?.section || '').toString().trim();
    const q = (req.query?.q || '').toString().trim();
    const hasPagination = req.query?.page != null || req.query?.limit != null;
    const parsedPage = Number.parseInt(req.query?.page, 10);
    const parsedLimit = Number.parseInt(req.query?.limit, 10);
    const page = Number.isFinite(parsedPage) ? Math.max(1, parsedPage) : 1;
    const limit = Number.isFinite(parsedLimit) ? Math.min(10_000, Math.max(1, parsedLimit)) : 50;
    const skip = (page - 1) * limit;

    const filter = {};
    if (year) {
      // Prefer normalized field but include legacy rows where yearLevel was not backfilled.
      Object.assign(filter, getYearFilter(year));
    }
    if (section) {
      filter.section = section;
    }
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.name = { $regex: escaped, $options: 'i' };
    }

    // Backwards compatibility:
    // - If client does NOT pass page/limit, return the legacy array response.
    // - If page/limit are present, return the new paginated contract.
    if (!hasPagination) {
      const students = await Student.find(filter)
        .sort({ totalSolved: -1, hardSolved: -1, contestRating: -1 })
        .select({
          _id: 1,
          name: 1,
          leetcodeUsername: 1,
          universityId: 1,
          batch: 1,
          section: 1,
          yearLevel: 1,
          easySolved: 1,
          mediumSolved: 1,
          hardSolved: 1,
          totalSolved: 1,
          contestRating: 1,
        })
        .lean();
      const ranked = students.map((s, i) => ({ rank: i + 1, ...s }));
      // Override global no-store for this endpoint only; safe because data is not user-specific.
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
      return res.json(ranked);
    }

    const cacheKey = makeKey({ year, section, page, limit, q });
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const projection = {
      _id: 1,
      name: 1,
      leetcodeUsername: 1,
      universityId: 1,
      batch: 1,
      section: 1,
      yearLevel: 1,
      easySolved: 1,
      mediumSolved: 1,
      hardSolved: 1,
      totalSolved: 1,
      contestRating: 1,
    };

    const [total, items] = await Promise.all([
      Student.countDocuments(filter),
      Student.find(filter)
        .sort({ totalSolved: -1, hardSolved: -1, contestRating: -1 })
        .skip(skip)
        .limit(limit)
        .select(projection)
        .lean(),
    ]);

    const rankedItems = items.map((s, i) => ({ rank: skip + i + 1, ...s }));
    const payload = { data: rankedItems, total, page, limit };

    // TTL keeps results snappy while staying reasonably fresh.
    setCached(cacheKey, payload, 120_000);
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=30');
    return res.json(payload);
  } catch (err) {
    logger.error('Leaderboard fetch failed', err, { endpoint: '/leaderboard' });
    return res.status(500).json({ message: 'Failed to fetch leaderboard.' });
  }
};

// POST /api/students/:id/refresh
exports.refreshStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });

    const stats = await fetchLeetCodeStats(student.leetcodeUsername);
    if (!stats) {
      return res.json({
        message: 'LeetCode temporarily unavailable. Existing stats kept.',
        updated: false,
        stale: true,
        student,
      });
    }

    student.easySolved = stats.easySolved;
    student.mediumSolved = stats.mediumSolved;
    student.hardSolved = stats.hardSolved;
    student.totalSolved = (stats.easySolved || 0) + (stats.mediumSolved || 0) + (stats.hardSolved || 0);
    student.contestRating = stats.contestRating;
    student.lastUpdated = new Date();
    await student.save();
    invalidateLeaderboardCache();
    return res.json({ message: 'Updated', updated: true, stale: false, student });
  } catch (err) {
    logger.error('Student refresh failed', err, { endpoint: '/refresh', studentId: req.params.id });
    return res.status(500).json({ message: 'Failed to refresh student.' });
  }
};

// POST /api/students/refresh-all
exports.refreshAll = async (_req, res) => {
  try {
    const students = await Student.find({});
    const concurrency = 10;
    let updated = 0;
    let failed = 0;
    for (let i = 0; i < students.length; i += concurrency) {
      const chunk = students.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        chunk.map(async (s) => {
          const stats = await fetchLeetCodeStats(s.leetcodeUsername);
          if (!stats) {
            logger.warn('Failed to fetch student stats', { endpoint: '/refresh-all', username: s.leetcodeUsername });
            return false;
          }
          s.easySolved = stats.easySolved;
          s.mediumSolved = stats.mediumSolved;
          s.hardSolved = stats.hardSolved;
          s.totalSolved = (stats.easySolved || 0) + (stats.mediumSolved || 0) + (stats.hardSolved || 0);
          s.contestRating = stats.contestRating;
          s.lastUpdated = new Date();
          await s.save();
          return true;
        })
      );
      results.forEach((r) => {
        if (r.status === 'fulfilled' && r.value === true) updated += 1;
        else failed += 1;
      });
    }
    invalidateLeaderboardCache();
    return res.json({ message: `Refreshed ${updated} students`, updated, failed, total: students.length });
  } catch (err) {
    logger.error('Batch refresh failed', err, { endpoint: '/refresh-all' });
    return res.status(500).json({ message: 'Failed to refresh students.' });
  }
};
