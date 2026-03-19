const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/leetcode_leaderboard';
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    logger.info('Database connection established');
  } catch (err) {
    logger.error('Database connection failed', err);
    process.exit(1);
  }
};

module.exports = connectDB;
