// Structured logging utility - Simple format
const logger = {
  error: (message, error = null, context = {}) => {
    const msg = error ? `${message} (${error.constructor?.name})` : message;
    console.error(`[ERROR] ${msg}`);
  },

  warn: (message, context = {}) => {
    console.warn(`[WARN] ${message}`);
  },

  info: (message, context = {}) => {
    console.log(`[INFO] ${message}`);
  },
};

module.exports = logger;
