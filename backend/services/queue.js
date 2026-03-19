const Queue = require('bull');
const { processUpload } = require('./uploadProcessor');
const logger = require('../utils/logger');

const useRedisQueue = String(process.env.USE_REDIS_QUEUE || '').toLowerCase() === 'true';
let uploadQueue = null;

const jobProgress = new Map();
const localJobs = new Map();
let queueReady = false;

function initProgress(jobId, fileName) {
  jobProgress.set(jobId, {
    jobId,
    fileName,
    status: 'processing',
    totalStudents: 0,
    processed: 0,
    inserted: 0,
    updated: 0,
    failed: 0,
    percentage: 0,
    startTime: Date.now(),
  });
}

function makeLocalJobId() {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function runJob(jobId, data, setJobProgressFn) {
  const { fileBuffer, year } = data;
  const result = await processUpload(fileBuffer, year, (progress) => {
    const next = {
      ...(jobProgress.get(jobId) || {}),
      ...progress,
      jobId,
    };
    jobProgress.set(jobId, next);
    if (setJobProgressFn) setJobProgressFn(progress);
  });

  const done = {
    ...(jobProgress.get(jobId) || {}),
    status: 'completed',
    percentage: 100,
    endTime: Date.now(),
    ...result,
  };
  jobProgress.set(jobId, done);
  return result;
}

function startLocalJob(data, reason = 'local-fallback') {
  const jobId = makeLocalJobId();
  localJobs.set(jobId, {
    id: jobId,
    state: 'waiting',
    attemptsMade: 0,
    failedReason: null,
    returnvalue: null,
    reason,
  });
  initProgress(jobId, data.fileName || 'upload');

  setImmediate(async () => {
    const j = localJobs.get(jobId);
    if (!j) return;
    j.state = 'active';
    try {
      const result = await runJob(jobId, data, null);
      j.state = 'completed';
      j.returnvalue = result;
    } catch (error) {
      j.state = 'failed';
      j.failedReason = error?.message || 'Local upload job failed';
      jobProgress.set(jobId, {
        ...(jobProgress.get(jobId) || {}),
        status: 'failed',
        error: j.failedReason,
        endTime: Date.now(),
      });
    }
  });

  return { id: jobId, mode: 'local' };
}

if (useRedisQueue) {
  uploadQueue = new Queue('student-upload', {
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT || 6379),
    },
    settings: {
      maxStalledCount: 2,
      maxStalledInterval: 5000,
      lockDuration: 30000,
      lockRenewTime: 15000,
    },
  });

  uploadQueue.process(5, async (job) => {
    const jobId = job.id.toString();
    initProgress(jobId, job.data?.fileName || 'upload');
    try {
      return await runJob(jobId, job.data, (progress) => {
        job.progress(progress.percentage || 0);
      });
    } catch (error) {
      jobProgress.set(jobId, {
        ...(jobProgress.get(jobId) || {}),
        status: 'failed',
        error: error.message,
        endTime: Date.now(),
      });
      throw error;
    }
  });

  uploadQueue.on('ready', () => {
    queueReady = true;
    logger.info('Queue connected');
  });

  uploadQueue.on('error', (err) => {
    queueReady = false;
    logger.error('Queue error', err);
  });

  uploadQueue.on('completed', (job) => {
    logger.info('Job completed', { jobId: job.id });
  });

  uploadQueue.on('failed', (job, err) => {
    logger.error('Job failed', err, { jobId: job.id });
  });
} else {
  logger.info('Upload queue disabled', { hint: 'set USE_REDIS_QUEUE=true to enable' });
}

async function createUploadJob(data) {
  // Return immediately with local job if queue isn't ready.
  if (!queueReady) {
    return startLocalJob(data, 'queue-not-ready');
  }

  try {
    const queueAddTimeoutMs = Number(process.env.QUEUE_ADD_TIMEOUT_MS || 2500);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('QUEUE_ADD_TIMEOUT')), queueAddTimeoutMs);
    });

    const job = await Promise.race([
      uploadQueue.add(data, {
        attempts: 1,
        removeOnComplete: false,
        removeOnFail: false,
      }),
      timeoutPromise,
    ]);

    return { id: job.id.toString(), mode: 'queue' };
  } catch (err) {
    console.warn('Queue add failed, using local fallback:', err.message || err);
    return startLocalJob(data, 'queue-add-failed');
  }
}

async function getUploadJobStatus(jobId) {
  const id = String(jobId);

  if (id.startsWith('local-')) {
    const local = localJobs.get(id);
    if (!local) return null;
    const progress = jobProgress.get(id) || {};
    return {
      jobId: id,
      state: local.state,
      attempts: local.attemptsMade || 0,
      failedReason: local.failedReason || undefined,
      progress: {
        ...progress,
        percentage: progress.percentage || 0,
      },
      result: local.returnvalue || null,
    };
  }

  if (!uploadQueue) return null;
  const job = await uploadQueue.getJob(id);
  if (!job) return null;
  const state = await job.getState();
  const progress = jobProgress.get(id) || {};

  return {
    jobId: id,
    state,
    attempts: job.attemptsMade,
    failedReason: job.failedReason || undefined,
    progress: {
      ...progress,
      percentage: job._progress || progress.percentage || 0,
    },
    result: state === 'completed' ? job.returnvalue : null,
  };
}

module.exports = {
  createUploadJob,
  getUploadJobStatus,
  getJobProgress: (jobId) => jobProgress.get(String(jobId)),
  getAllProgress: () => Array.from(jobProgress.values()),
};
