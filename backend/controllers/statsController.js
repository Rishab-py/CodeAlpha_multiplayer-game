const PlayerStats = require('../models/PlayerStats');
const GameHistory = require('../models/GameHistory');

// Retrieve player stats
exports.getPlayerStats = async (req, res) => {
  const { username } = req.params;

  try {
    const stats = await PlayerStats.findOne({ username });
    if (!stats) return res.status(404).json({ message: 'Player not found' });
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Retrieve player match history
exports.getPlayerHistory = async (req, res) => {
  const { username } = req.params;

  try {
    const history = await GameHistory.find({ players: username }).sort({ timestamp: -1 });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
};

// Update stats after a match
exports.updateStats = async (player1, player2, result) => {
  try {
    const winner = result === 'win' ? player1.username : result === 'loss' ? player2.username : null;
    
    // Update stats for player1
    const player1Stats = await PlayerStats.findOneAndUpdate(
      { username: player1.username },
      {
        $inc: {
          wins: result === 'win' ? 1 : 0,
          losses: result === 'loss' ? 1 : 0,
          draws: result === 'draw' ? 1 : 0,
        },
      },
      { upsert: true, new: true }
    );

    // Update stats for player2
    const player2Stats = await PlayerStats.findOneAndUpdate(
      { username: player2.username },
      {
        $inc: {
          wins: result === 'loss' ? 1 : 0,
          losses: result === 'win' ? 1 : 0,
          draws: result === 'draw' ? 1 : 0,
        },
      },
      { upsert: true, new: true }
    );

    // Add game history
    await GameHistory.create({
      players: [player1.username, player2.username],
      result,
      winner,
    });
  } catch (error) {
    console.error('Error updating stats:', error);
  }
};
