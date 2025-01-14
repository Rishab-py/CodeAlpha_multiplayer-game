const express = require('express');
const router = express.Router();

let waitingPlayers = []; // Array to store waiting players

/**
 * Add a player to the matchmaking queue.
 * @param {Object} player - The player object containing username, skillLevel, region, and socketId.
 */
const addPlayerToQueue = (player) => {
  waitingPlayers.push(player);
  console.log(`${player.username} added to the queue`);
};

/**
 * Match players based on criteria.
 * @param {Object} io - The Socket.IO server instance.
 */
const matchPlayers = (io) => {
  if (waitingPlayers.length >= 2) {
    for (let i = 0; i < waitingPlayers.length - 1; i++) {
      for (let j = i + 1; j < waitingPlayers.length; j++) {
        const player1 = waitingPlayers[i];
        const player2 = waitingPlayers[j];

        if (canMatch(player1, player2)) {
          // Start the match and remove players from the queue
          startMatch(player1, player2, io);
          waitingPlayers.splice(j, 1); // Remove matched player 2
          waitingPlayers.splice(i, 1); // Remove matched player 1
          return;
        }
      }
    }
  }
};

/**
 * Check if two players can be matched based on skill level and region.
 * @param {Object} player1 - The first player object.
 * @param {Object} player2 - The second player object.
 * @returns {Boolean} - True if players can be matched, otherwise false.
 */
const canMatch = (player1, player2) => {
  return (
    Math.abs(player1.skillLevel - player2.skillLevel) <= 2 && // Skill difference within range
    player1.region === player2.region // Same region
  );
};

/**
 * Start a match between two players and notify them via WebSocket.
 * @param {Object} player1 - The first player object.
 * @param {Object} player2 - The second player object.
 * @param {Object} io - The Socket.IO server instance.
 */
const startMatch = (player1, player2, io) => {
  console.log(`Match found: ${player1.username} vs ${player2.username}`);
  const matchId = `${player1.socketId}-${player2.socketId}`;

  // Emit match details to both players
  io.to(player1.socketId).emit('match-found', { matchId, opponent: player2 });
  io.to(player2.socketId).emit('match-found', { matchId, opponent: player1 });
};

/**
 * Route to join the matchmaking queue.
 * Expects JSON payload: { username, skillLevel, region, socketId }
 */
router.post('/join-queue', (req, res) => {
  const { username, skillLevel, region, socketId } = req.body;

  // Validate player data
  if (!username || !skillLevel || !region || !socketId) {
    return res.status(400).json({ message: 'Missing required player information' });
  }

  const player = { username, skillLevel, region, socketId };
  addPlayerToQueue(player);
  matchPlayers(req.io); // Pass the io instance to the matchmaking logic

  res.status(200).json({ message: `${username} added to the queue` });
});

module.exports = router;
