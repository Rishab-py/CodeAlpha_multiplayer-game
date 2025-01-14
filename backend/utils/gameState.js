let activeGames = {}; // In-memory store for active games (use Redis in production)

// Function to create a new game
const createGame = (player1, player2) => {
  const gameId = `${player1.socketId}-${player2.socketId}`;
  activeGames[gameId] = {
    gameId,
    player1,
    player2,
    currentState: 'player1_turn', // Indicates which player's turn it is
    board: initializeBoard(), // Example: A grid for games like Tic-Tac-Toe or Chess
    moves: [], // Array to track moves
  };
  return activeGames[gameId];
};

// Function to initialize the game board (example for Tic-Tac-Toe)
const initializeBoard = () => {
  return [
    ['-', '-', '-'],
    ['-', '-', '-'],
    ['-', '-', '-'],
  ];
};

// Function to handle a move
const handleMove = (gameId, player, move) => {
  const game = activeGames[gameId];
  if (!game) return { error: 'Game not found' };

  // Validate if it’s the player's turn
  if (game.currentState !== `${player} turn`) {
    return { error: "It's not your turn!" };
  }

  // Update the board based on the move
  const { row, col } = move;
  if (game.board[row][col] !== '-') {
    return { error: 'Invalid move' };
  }
  game.board[row][col] = player === 'player1' ? 'X' : 'O'; // Example for Tic-Tac-Toe

  // Track the move
  game.moves.push({ player, move });

  // Check game-over condition (example for Tic-Tac-Toe)
  const winner = checkWinner(game.board);
  if (winner) {
    game.currentState = 'game_over';
    return { winner };
  }

  // Switch turn
  game.currentState = game.currentState === 'player1_turn' ? 'player2_turn' : 'player1_turn';
  return game;
};

// Example of a simple Tic-Tac-Toe winner check
const checkWinner = (board) => {
  // Check rows, columns, and diagonals for a winner
  const lines = [
    ...board, // rows
    [board[0][0], board[1][0], board[2][0]], // columns
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],
    [board[0][0], board[1][1], board[2][2]], // diagonals
    [board[0][2], board[1][1], board[2][0]],
  ];

  for (let line of lines) {
    if (line[0] !== '-' && line[0] === line[1] && line[0] === line[2]) {
      return line[0]; // Return the winner (X or O)
    }
  }
  return null;
};

module.exports = { createGame, handleMove };
