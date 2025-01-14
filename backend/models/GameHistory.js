const mongoose = require('mongoose');

const gameHistorySchema = new mongoose.Schema({
  players: [{ type: String, required: true }], // Array of player usernames
  result: { type: String, enum: ['win', 'loss', 'draw'], required: true },
  winner: { type: String }, // Username of the winner (if applicable)
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('GameHistory', gameHistorySchema);
