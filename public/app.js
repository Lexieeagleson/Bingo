// Connect to Socket.io server
const socket = io();

console.log('Bingo app initialized');
console.log('Socket connected:', socket.connected);

// Log socket connection events
socket.on('connect', () => {
  console.log('Socket connected successfully, ID:', socket.id);
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});

// DOM Elements
const pages = {
  landing: document.getElementById('landing-page'),
  hostSetup: document.getElementById('host-setup-page'),
  hostGame: document.getElementById('host-game-page'),
  joinGame: document.getElementById('join-game-page'),
  playerGame: document.getElementById('player-game-page')
};

// State
let currentGameCode = null;
let playerBoard = null;
let calledValues = [];

// Sample values for demonstration
const sampleValues = [
  'Cat', 'Dog', 'Bird', 'Fish', 'Lion',
  'Tiger', 'Bear', 'Wolf', 'Fox', 'Deer',
  'Rabbit', 'Mouse', 'Snake', 'Frog', 'Duck',
  'Eagle', 'Hawk', 'Owl', 'Parrot', 'Penguin',
  'Whale', 'Shark', 'Dolphin', 'Turtle'
];

// Utility Functions
function showPage(pageName) {
  Object.values(pages).forEach(page => page.classList.remove('active'));
  pages[pageName].classList.add('active');
}

function showError(message) {
  const toast = document.getElementById('error-toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function showModal(winnerName) {
  const modal = document.getElementById('winner-modal');
  document.getElementById('winner-name').textContent = `${winnerName} got BINGO!`;
  modal.classList.add('active');
}

function hideModal() {
  document.getElementById('winner-modal').classList.remove('active');
}

// Landing Page
document.getElementById('host-btn').addEventListener('click', () => {
  console.log('Host a Game button clicked');
  showPage('hostSetup');
});

document.getElementById('join-btn').addEventListener('click', () => {
  console.log('Join a Game button clicked');
  showPage('joinGame');
});

// Host Setup Page
const valuesInput = document.getElementById('values-input');
const valueCount = document.getElementById('value-count');
const createGameBtn = document.getElementById('create-game-btn');

document.getElementById('load-sample').addEventListener('click', () => {
  valuesInput.value = sampleValues.join('\n');
  updateValueCount();
});

function updateValueCount() {
  const values = valuesInput.value.split('\n').filter(v => v.trim());
  const count = values.length;
  valueCount.textContent = `${count} / 24 values`;
  
  if (count >= 24) {
    valueCount.classList.add('valid');
    valueCount.classList.remove('invalid');
    createGameBtn.disabled = false;
  } else {
    valueCount.classList.remove('valid');
    valueCount.classList.add('invalid');
    createGameBtn.disabled = true;
  }
}

valuesInput.addEventListener('input', updateValueCount);

createGameBtn.addEventListener('click', () => {
  console.log('Create Game button clicked');
  const values = valuesInput.value.split('\n')
    .map(v => v.trim())
    .filter(v => v);
  
  console.log('Values entered:', values.length, 'items');
  console.log('Values:', values);
  
  if (values.length >= 24) {
    console.log('Emitting createGame event to server...');
    socket.emit('createGame', values.slice(0, 24));
  } else {
    console.log('Not enough values:', values.length, '(need at least 24)');
  }
});

document.getElementById('back-to-landing').addEventListener('click', () => {
  console.log('Back button clicked (from host setup)');
  showPage('landing');
});

// Join Game Page
document.getElementById('join-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const playerName = document.getElementById('player-name').value.trim();
  const gameCode = document.getElementById('game-code-input').value.trim();
  
  console.log('Join form submitted');
  console.log('Player name:', playerName);
  console.log('Game code:', gameCode);
  
  if (playerName && gameCode.length === 4) {
    console.log('Emitting joinGame event to server...');
    socket.emit('joinGame', { code: gameCode, playerName });
  } else {
    console.log('Invalid input - Name:', playerName, 'Code length:', gameCode.length);
  }
});

document.getElementById('back-to-landing-2').addEventListener('click', () => {
  console.log('Back button clicked (from join game)');
  showPage('landing');
});

// Host Game Page
function renderHostValues(values, called) {
  const container = document.getElementById('available-values');
  container.innerHTML = '';
  
  values.forEach(value => {
    const btn = document.createElement('button');
    btn.className = 'value-btn';
    btn.textContent = value;
    
    if (called.includes(value)) {
      btn.classList.add('called');
    }
    
    btn.addEventListener('click', () => {
      if (!called.includes(value)) {
        console.log('Calling value:', value, 'for game:', currentGameCode);
        socket.emit('callValue', { code: currentGameCode, value });
      }
    });
    
    container.appendChild(btn);
  });
}

function renderCalledValues(called) {
  const container = document.getElementById('called-values');
  container.innerHTML = called.map(v => 
    `<span class="called-value">${v}</span>`
  ).join('');
}

document.getElementById('reset-game-btn').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset the game? All players will get new boards.')) {
    console.log('Reset game confirmed, emitting resetGame event');
    socket.emit('resetGame', currentGameCode);
  }
});

document.getElementById('end-game-btn').addEventListener('click', () => {
  if (confirm('Are you sure you want to end the game?')) {
    console.log('End game confirmed, emitting endGame event');
    socket.emit('endGame', currentGameCode);
    showPage('landing');
    valuesInput.value = '';
    updateValueCount();
  }
});

// Player Game Page
function renderPlayerBoard(board, called) {
  const container = document.getElementById('board-cells');
  container.innerHTML = '';
  
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.textContent = board[row][col];
      cell.dataset.row = row;
      cell.dataset.col = col;
      
      if (board[row][col] === 'FREE') {
        cell.classList.add('free', 'marked');
      } else if (called.includes(board[row][col])) {
        cell.classList.add('callable');
      }
      
      cell.addEventListener('click', () => {
        if (!cell.classList.contains('marked')) {
          const value = board[row][col];
          if (value === 'FREE' || called.includes(value)) {
            console.log('Marking square at row:', row, 'col:', col, 'value:', value);
            socket.emit('markSquare', { code: currentGameCode, row, col });
          } else {
            console.log('Cannot mark square - value not called yet:', value);
          }
        }
      });
      
      container.appendChild(cell);
    }
  }
}

function updateCallableSquares() {
  if (!playerBoard) return;
  
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);
    const value = playerBoard[row][col];
    
    if (!cell.classList.contains('marked') && calledValues.includes(value)) {
      cell.classList.add('callable');
    }
  });
}

function renderPlayerCalledValues(called) {
  const container = document.getElementById('player-called-values');
  container.innerHTML = called.map(v => 
    `<span class="called-value">${v}</span>`
  ).join('');
}

document.getElementById('claim-bingo-btn').addEventListener('click', () => {
  console.log('Claiming BINGO for game:', currentGameCode);
  socket.emit('claimBingo', currentGameCode);
});

document.getElementById('close-modal').addEventListener('click', hideModal);

// Socket Events
socket.on('gameCreated', (data) => {
  console.log('Game created successfully!');
  console.log('Game code:', data.code);
  console.log('Values:', data.values);
  
  currentGameCode = data.code;
  calledValues = [];
  
  document.getElementById('game-code').textContent = data.code;
  document.getElementById('player-count').textContent = 'Players: 0';
  
  renderHostValues(data.values, []);
  renderCalledValues([]);
  
  showPage('hostGame');
});

socket.on('gameJoined', (data) => {
  console.log('Successfully joined game!');
  console.log('Game code:', data.gameCode);
  console.log('Board:', data.board);
  console.log('Called values:', data.calledValues);
  
  currentGameCode = data.gameCode;
  playerBoard = data.board;
  calledValues = data.calledValues || [];
  
  document.getElementById('player-game-code').textContent = data.gameCode;
  
  renderPlayerBoard(data.board, calledValues);
  renderPlayerCalledValues(calledValues);
  
  showPage('playerGame');
});

socket.on('playerJoined', (data) => {
  console.log('Player joined:', data.playerName);
  console.log('Total players:', data.playerCount);
  document.getElementById('player-count').textContent = `Players: ${data.playerCount}`;
});

socket.on('playerLeft', (data) => {
  console.log('Player left:', data.playerName);
  console.log('Total players:', data.playerCount);
  document.getElementById('player-count').textContent = `Players: ${data.playerCount}`;
});

socket.on('valueCalled', (data) => {
  console.log('Value called:', data.value);
  console.log('All called values:', data.calledValues);
  calledValues = data.calledValues;
  
  // Update host view
  const hostValues = document.getElementById('available-values');
  if (hostValues.children.length > 0) {
    renderHostValues(Array.from(hostValues.children).map(b => b.textContent), calledValues);
    renderCalledValues(calledValues);
  }
  
  // Update player view
  updateCallableSquares();
  renderPlayerCalledValues(calledValues);
});

socket.on('squareMarked', (data) => {
  console.log('Square marked at row:', data.row, 'col:', data.col);
  const cells = document.querySelectorAll('.cell');
  cells.forEach(cell => {
    if (parseInt(cell.dataset.row) === data.row && parseInt(cell.dataset.col) === data.col) {
      cell.classList.add('marked');
      cell.classList.remove('callable');
    }
  });
});

socket.on('bingoWinner', (data) => {
  console.log('BINGO! Winner:', data.playerName);
  showModal(data.playerName);
});

socket.on('invalidBingo', () => {
  console.log('Invalid bingo claim');
  showError('Not a valid BINGO! Keep playing.');
});

socket.on('gameReset', () => {
  console.log('Game has been reset');
  calledValues = [];
  renderCalledValues([]);
  
  // Host will receive updated values
  const hostValues = document.getElementById('available-values');
  if (hostValues.children.length > 0) {
    Array.from(hostValues.children).forEach(btn => {
      btn.classList.remove('called');
    });
  }
});

socket.on('newBoard', (data) => {
  console.log('Received new board:', data.board);
  playerBoard = data.board;
  calledValues = [];
  renderPlayerBoard(data.board, []);
  renderPlayerCalledValues([]);
});

socket.on('gameEnded', () => {
  console.log('Game ended by host');
  showError('The host has ended the game.');
  showPage('landing');
});

socket.on('hostDisconnected', () => {
  console.log('Host disconnected');
  showError('The host has disconnected. Game over.');
  showPage('landing');
});

socket.on('error', (message) => {
  console.error('Error from server:', message);
  showError(message);
});
