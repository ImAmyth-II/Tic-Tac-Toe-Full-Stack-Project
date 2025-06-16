import sqlite3 from 'sqlite3';

// Enable verbose mode for SQLite
sqlite3.verbose();

// Initialize the database connection
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Could not connect to the database', err);
  } else {
    console.log('Connected to the SQLite database');
  }
});

// Create users table with unique username constraint
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)");
});

// Function to generate a random 5-character alphanumeric game ID
export function generateGameId() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}


// Create the games table with the updated schema
db.run(`
  CREATE TABLE IF NOT EXISTS games (
    gameid TEXT PRIMARY KEY,
    cross TEXT NOT NULL,
    circle TEXT NOT NULL,
    moves TEXT NOT NULL,  -- Array of moves as JSON string
    result TEXT NOT NULL CHECK(result IN ('ongoing', 'X won', 'O won', 'Draw')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`
);

// Function to check for a winner
function checkGameResult(moves) {
  // Initialize an empty board
  let board = ['-', '-', '-', '-', '-', '-', '-', '-', '-'];

  // Place the moves on the board
  moves.forEach((move, index) => {
    board[move] = index % 2 === 0 ? 'X' : 'O'; // X starts first, followed by O
  });
  console.log('Board state after moves:', board);

  // Winning combinations
  const winningCombos = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  // Check each winning combination
  for (const combo of winningCombos) {
    const [a, b, c] = combo;
    console.log(`Checking combo: ${combo} -> ${board[a]}, ${board[b]}, ${board[c]}`);
    if (board[a] !== '-' && board[a] === board[b] && board[a] === board[c]) {
      console.log('Winning combo found:', combo);
      console.log(`${board[a]} won`);
      return `${board[a]} won`;
    }
  }

  // Check for a draw (if there are no empty spaces left)
  if (!board.includes('-')) {
    console.log('Game ended in a draw');
    return 'Draw';
  }

  console.log('Game is still ongoing');
  return 'ongoing';
}


// Function to add a move and check for the winner
export async function addMove(gameid, move) {
  try {
    const stmt = db.prepare('SELECT moves, result FROM games WHERE gameid = ?');
    const row = await new Promise((resolve, reject) => {
      stmt.get(gameid, (err, row) => err ? reject(err) : resolve(row));
    });

    if (row.result !== 'ongoing') {
      return { success: false, message: 'Game is already over' };
    }

    const moves = JSON.parse(row.moves);
    moves.push(move);
    const winner = checkGameResult(moves);

    const newResult = winner === 'ongoing' ? 'ongoing' : winner;
    const stmtUpdate = db.prepare('UPDATE games SET moves = ?, result = ? WHERE gameid = ?');
    await new Promise((resolve, reject) => {
      stmtUpdate.run(JSON.stringify(moves), newResult, gameid, function (err) {
        if (err) reject(err);
        resolve();
      });
    });

    return { success: true, gameState: { moves, result: newResult } };
  } catch (err) {
    console.error('Error in addMove:', err);
    return { success: false, message: 'An error occurred' };
  }
}

// Export the database connection
export { db };
