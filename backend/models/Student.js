const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  leetcodeUsername: { type: String, required: true, unique: true },
  universityId: { type: String },
  batch: { type: String },
  section: { type: String },
  yearLevel: { type: String }, // '2' | '3' | '4' (normalized for fast filtering)
  easySolved: { type: Number, default: 0 },
  mediumSolved: { type: Number, default: 0 },
  hardSolved: { type: Number, default: 0 },
  totalSolved: { type: Number, default: 0 },
  contestRating: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

studentSchema.index({ batch: 1 });
studentSchema.index({ yearLevel: 1 });
studentSchema.index({ totalSolved: -1, hardSolved: -1, contestRating: -1 });
studentSchema.index({ yearLevel: 1, totalSolved: -1, hardSolved: -1, contestRating: -1 });
studentSchema.index({ name: 1 });

module.exports = mongoose.model('Student', studentSchema);
