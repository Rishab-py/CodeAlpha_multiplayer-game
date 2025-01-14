const mongoose = require('mongoose');

const playerStatsSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 }
});

module.exports = mongoose.model('PlayerStats', playerStatsSchema);
