const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Store active games
const games = new Map();

// Generate a random 4-digit code
function generateGameCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (games.has(code));
  return code;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Generate a randomized bingo board for a player
function generatePlayerBoard(values) {
  const shuffled = shuffleArray(values);
  const board = [];
  for (let i = 0; i < 5; i++) {
    board.push(shuffled.slice(i * 5, i * 5 + 5));
  }
  // Set the free space in the center
  board[2][2] = 'FREE';
  return board;
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Host creates a new game
  socket.on('createGame', (values) => {
    // Validate values (need at least 24 unique values + FREE space)
    if (!Array.isArray(values) || values.length < 24) {
      socket.emit('error', 'Please provide at least 24 values for the bingo board');
      return;
    }

    const gameCode = generateGameCode();
    const game = {
      code: gameCode,
      hostId: socket.id,
      values: values.slice(0, 24), // Take first 24 values
      calledValues: [],
      players: new Map()
    };

    games.set(gameCode, game);
    socket.join(gameCode);
    socket.emit('gameCreated', { code: gameCode, values: game.values });
    console.log(`Game created with code: ${gameCode}`);
  });

  // Player joins a game
  socket.on('joinGame', (data) => {
    const { code, playerName } = data;
    const game = games.get(code);

    if (!game) {
      socket.emit('error', 'Game not found. Please check the code and try again.');
      return;
    }

    // Generate a randomized board for this player
    const board = generatePlayerBoard(game.values);
    game.players.set(socket.id, {
      name: playerName || 'Anonymous',
      board: board,
      markedSquares: [[false, false, false, false, false],
                      [false, false, false, false, false],
                      [false, false, true, false, false], // Free space is marked
                      [false, false, false, false, false],
                      [false, false, false, false, false]]
    });

    socket.join(code);
    socket.emit('gameJoined', { 
      board: board, 
      calledValues: game.calledValues,
      gameCode: code
    });

    // Notify the host
    io.to(game.hostId).emit('playerJoined', { 
      playerId: socket.id, 
      playerName: playerName || 'Anonymous',
      playerCount: game.players.size
    });

    console.log(`Player ${playerName || 'Anonymous'} joined game ${code}`);
  });

  // Host calls a value
  socket.on('callValue', (data) => {
    const { code, value } = data;
    const game = games.get(code);

    if (!game || game.hostId !== socket.id) {
      socket.emit('error', 'Unauthorized or game not found');
      return;
    }

    if (!game.calledValues.includes(value)) {
      game.calledValues.push(value);
      io.to(code).emit('valueCalled', { value, calledValues: game.calledValues });
      console.log(`Value called in game ${code}: ${value}`);
    }
  });

  // Player marks a square
  socket.on('markSquare', (data) => {
    const { code, row, col } = data;
    const game = games.get(code);

    if (!game) return;

    const player = game.players.get(socket.id);
    if (!player) return;

    const value = player.board[row][col];
    
    // Check if the value has been called or is FREE
    if (value === 'FREE' || game.calledValues.includes(value)) {
      player.markedSquares[row][col] = true;
      socket.emit('squareMarked', { row, col });
    }
  });

  // Player claims bingo
  socket.on('claimBingo', (code) => {
    const game = games.get(code);
    if (!game) return;

    const player = game.players.get(socket.id);
    if (!player) return;

    const isValidBingo = checkBingo(player.markedSquares);
    
    if (isValidBingo) {
      io.to(code).emit('bingoWinner', { 
        playerId: socket.id, 
        playerName: player.name 
      });
      console.log(`BINGO! Winner: ${player.name} in game ${code}`);
    } else {
      socket.emit('invalidBingo');
    }
  });

  // Host resets the game
  socket.on('resetGame', (code) => {
    const game = games.get(code);
    if (!game || game.hostId !== socket.id) return;

    game.calledValues = [];
    
    // Reset all player boards and marks
    for (const [playerId, player] of game.players) {
      player.board = generatePlayerBoard(game.values);
      player.markedSquares = [[false, false, false, false, false],
                              [false, false, false, false, false],
                              [false, false, true, false, false],
                              [false, false, false, false, false],
                              [false, false, false, false, false]];
    }

    io.to(code).emit('gameReset');
    
    // Send new boards to all players
    for (const [playerId, player] of game.players) {
      io.to(playerId).emit('newBoard', { board: player.board });
    }

    console.log(`Game ${code} has been reset`);
  });

  // Host ends the game
  socket.on('endGame', (code) => {
    const game = games.get(code);
    if (!game || game.hostId !== socket.id) return;

    io.to(code).emit('gameEnded');
    games.delete(code);
    console.log(`Game ${code} has been ended`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Check if disconnected user was a host
    for (const [code, game] of games) {
      if (game.hostId === socket.id) {
        io.to(code).emit('hostDisconnected');
        games.delete(code);
        console.log(`Host disconnected, game ${code} ended`);
      } else if (game.players.has(socket.id)) {
        const playerName = game.players.get(socket.id).name;
        game.players.delete(socket.id);
        io.to(game.hostId).emit('playerLeft', { 
          playerId: socket.id, 
          playerName: playerName,
          playerCount: game.players.size
        });
        console.log(`Player ${playerName} left game ${code}`);
      }
    }
  });
});

// Check for bingo (5 in a row - horizontal, vertical, or diagonal)
function checkBingo(markedSquares) {
  // Check rows
  for (let i = 0; i < 5; i++) {
    if (markedSquares[i].every(cell => cell)) return true;
  }

  // Check columns
  for (let j = 0; j < 5; j++) {
    if (markedSquares.every(row => row[j])) return true;
  }

  // Check diagonals
  if ([0, 1, 2, 3, 4].every(i => markedSquares[i][i])) return true;
  if ([0, 1, 2, 3, 4].every(i => markedSquares[i][4 - i])) return true;

  return false;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Bingo server running on port ${PORT}`);
});
