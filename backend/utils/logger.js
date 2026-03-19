// Structured logging utility
const logger = {
  error: (message, error = null, context = {}) => {
    const log = {
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    // Only log error message, not full stack trace (security)
    if (error) {
      log.errorType = error.constructor?.name || 'Unknown';
    }
    console.error(JSON.stringify(log));
  },

  warn: (message, context = {}) => {
    const log = {
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    console.warn(JSON.stringify(log));
  },

  info: (message, context = {}) => {
    const log = {
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...context,
    };
    console.log(JSON.stringify(log));
  },
};

module.exports = logger;
