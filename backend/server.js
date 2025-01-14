require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const authRoutes = require('./routes/auth');
const matchmakingRoutes = require('./routes/matchmaking');
const statsRoutes = require('./routes/stats');
const { updateStats } = require('./controllers/statsController');
const { createGame, handleMove } = require('./utils/gameState');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 5000;

let waitingPlayers = [];
let activeMatches = {};

const GAME_TIMEOUT = 600000; // 10 minutes timeout for inactivity in game
const PLAYER_TIMEOUT = 30000; // 30 seconds timeout for inactivity in queue

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Serve static files from the frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve the index.html file for the root route
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: path.join(__dirname, '../frontend/html') });
});

// Pass the Socket.IO instance to routes
app.use((req, res, next) => {
  req.io = io; // Attach io to the req object
  next();
});

// Use API routes
app.use('/api/auth', authRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api', statsRoutes); // Added stats routes

// WebSocket connection setup
io.on('connection', (socket) => {
  console.log('New player connected: ' + socket.id);

  // Handle join queue
  socket.on('join-queue', (data) => {
    if (validatePlayerData(data)) {
      waitingPlayers.push({ ...data, socketId: socket.id });
      console.log(`${data.username} added to the queue`);
      matchPlayers(io);
    } else {
      socket.emit('error', { message: 'Invalid player data.' });
    }
  });

  // Handle game events
  socket.on('game-event', ({ matchId, event }) => {
    if (activeMatches[matchId]) {
      const { player1, player2 } = activeMatches[matchId];
      const opponent = socket.id === player1.socketId ? player2.socketId : player1.socketId;
      io.to(opponent).emit('game-update', event);
    } else {
      socket.emit('error', { message: 'Invalid match ID.' });
    }
  });

  // Handle make move
  socket.on('make-move', ({ gameId, player, move }) => {
    if (activeMatches[gameId]) {
      const result = handleMove(gameId, player, move);
      if (result.error) {
        socket.emit('game-error', { message: result.error });
      } else {
        const game = activeMatches[gameId];
        io.to(game.player1.socketId).emit('game-update', { gameState: game });
        io.to(game.player2.socketId).emit('game-update', { gameState: game });
        
        if (result.winner) {
          io.to(game.player1.socketId).emit('game-over', { winner: result.winner });
          io.to(game.player2.socketId).emit('game-over', { winner: result.winner });
          
          // Update player stats and save game history
          const matchResult = result.winner === game.player1.username ? 'win' : (result.winner === game.player2.username ? 'loss' : 'draw');
          updateStats(game.player1, game.player2, matchResult);
        }
      }
    } else {
      socket.emit('error', { message: 'Invalid game state.' });
    }
  });

  // Handle disconnections
  socket.on('disconnect', () => {
    console.log('Player disconnected: ' + socket.id);
    handleDisconnect(socket);
  });

  // Inactivity timeout for queue
  const inactivityTimeout = setTimeout(() => {
    handleDisconnect(socket);
    socket.emit('timeout', { message: 'You were disconnected due to inactivity in the queue.' });
  }, PLAYER_TIMEOUT);

  // Reset inactivity timer when player makes a move
  socket.on('reset-inactivity-timer', () => {
    clearTimeout(inactivityTimeout); // Reset inactivity timer
  });
});

// Matchmaking function
const matchPlayers = (io) => {
  if (waitingPlayers.length >= 2) {
    for (let i = 0; i < waitingPlayers.length - 1; i++) {
      for (let j = i + 1; j < waitingPlayers.length; j++) {
        const player1 = waitingPlayers[i];
        const player2 = waitingPlayers[j];

        if (canMatch(player1, player2)) {
          const game = createGame(player1, player2); // Start a new game
          activeMatches[game.gameId] = game; // Store the game in memory
          io.to(player1.socketId).emit('match-found', { gameId: game.gameId, opponent: player2 });
          io.to(player2.socketId).emit('match-found', { gameId: game.gameId, opponent: player1 });

          waitingPlayers.splice(j, 1);
          waitingPlayers.splice(i, 1);
          return;
        }
      }
    }
  }
};

// Match criteria
const canMatch = (player1, player2) => {
  return (
    Math.abs(player1.skillLevel - player2.skillLevel) <= 2 &&
    player1.region === player2.region
  );
};

// Disconnect handling
const handleDisconnect = (socket) => {
  // Remove from waiting queue
  waitingPlayers = waitingPlayers.filter((player) => player.socketId !== socket.id);

  Object.keys(activeMatches).forEach((matchId) => {
    const match = activeMatches[matchId];
    if (match.player1.socketId === socket.id || match.player2.socketId === socket.id) {
      io.to(match.player1.socketId).emit('opponent-disconnected');
      io.to(match.player2.socketId).emit('opponent-disconnected');
      delete activeMatches[matchId];
    }
  });
};

// Inactivity timeout handling in matches
const handleInactivity = (gameId) => {
  setTimeout(() => {
    if (activeMatches[gameId]) {
      const { player1, player2 } = activeMatches[gameId];
      io.to(player1.socketId).emit('timeout', { message: 'Game timeout due to inactivity' });
      io.to(player2.socketId).emit('timeout', { message: 'Game timeout due to inactivity' });
      delete activeMatches[gameId];
    }
  }, GAME_TIMEOUT); // End the game after the specified timeout
};

// Validate player data
const validatePlayerData = (data) => {
  return (
    data.username && typeof data.username === 'string' &&
    data.skillLevel && typeof data.skillLevel === 'number' &&
    data.region && typeof data.region === 'string'
  );
};

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error(err));

// Start the server
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
