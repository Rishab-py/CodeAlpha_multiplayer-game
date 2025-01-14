// Initialize socket connection to the server
const socket = io('http://localhost:5000')

// Join queue button functionality
document.getElementById('joinQueueBtn').addEventListener('click', () => {
  const playerData = {
      username: 'Player1',  // Replace with dynamic username if needed
      skillLevel: 5,
      region: 'US',
  };
  socket.emit('join-queue', playerData);  // Emit join queue event
});

// Listen for match-found event
socket.on('match-found', ({ matchId, opponent }) => {
  console.log(`Match found! Opponent: ${opponent.username}`);
  // Update UI to show match details
  document.getElementById('gameStatus').innerText = `Match found! Opponent: ${opponent.username}. Starting game...`;
  document.getElementById('gameArea').style.display = 'block';  // Show game area

  // Start sending game updates
  sendGameEvent(matchId, { type: 'start' });
});

// Send a game event to the server
function sendGameEvent(matchId, event) {
  socket.emit('game-event', { matchId, event });
  console.log('Sent game event:', event);
}

// Listen for game updates from the server
socket.on('game-update', (event) => {
  console.log('Game update received:', event);
  // Update the UI based on the event (e.g., move, score update, etc.)
  document.getElementById('gameStatus').innerText = `Game Event: ${event.type}`;
  // You can extend this to dynamically update the game UI (e.g., player moves, scores)
});

// Handle opponent disconnect
socket.on('opponent-disconnected', () => {
  console.log('Opponent disconnected. Match ended.');
  // Update the UI when the opponent disconnects
  document.getElementById('gameStatus').innerText = 'Opponent disconnected. Match ended.';
  // Optionally hide the game area or reset the game
  document.getElementById('gameArea').style.display = 'none';
});
