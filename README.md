# Bingo

A web-based multiplayer bingo game where hosts can create custom bingo games with any values they choose. Players can join using their phones by entering a 4-digit game code.

## Features

- **Custom Values**: Hosts can enter any 24 custom values for the bingo squares (instead of traditional numbers)
- **Real-time Multiplayer**: Uses Socket.io for instant updates across all connected players
- **Randomized Boards**: Each player receives a unique randomized board with the same values
- **Mobile-Friendly**: Responsive design optimized for phone screens
- **4-Digit Game Codes**: Easy-to-share codes for players to join games
- **Bingo Detection**: Automatic validation of winning bingo claims (rows, columns, diagonals)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Lexieeagleson/Bingo.git
   cd Bingo
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to `http://localhost:3000`

## How to Play

### As a Host

1. Click "Host a Game"
2. Enter 24 custom values (one per line) - or click "Load sample values" for a demo
3. Click "Create Game" to generate a 4-digit game code
4. Share the game code with players
5. Click on values to call them during the game
6. Use "Reset Game" to start over with new boards or "End Game" to close the session

### As a Player

1. Click "Join a Game"
2. Enter your name and the 4-digit game code
3. Click "Join Game" to receive your randomized bingo board
4. Tap squares to mark them when the host calls matching values
5. Click "BINGO!" when you complete a row, column, or diagonal

## Technology Stack

- **Backend**: Node.js, Express
- **Real-time Communication**: Socket.io
- **Frontend**: Vanilla HTML, CSS, JavaScript

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.