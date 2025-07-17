import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import cors from "cors";
import { dirname } from "path";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express(); // Initialize the app first
import { db, generateGameId, addMove } from "./db.js";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
app.use(express.json()); // For parsing JSON bodies
dotenv.config(); // Load environment variables from .env file

const server = http.createServer(app); // Initialize server here
app.use(cors()); // Enable CORS for your express routes

// CORS configuration for Socket.IO
const frontendPath = process.env.FRONTEND_PATH;
const io = new Server(server, {
  cors: {
    origin: `${frontendPath}`, // The frontend origin
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

//local host port for the server
const PORT = 3000;

//Starting the Server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

//path for the frontend
app.use(express.static(path.join(__dirname, "../frontend")));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));

// Secret key for JWT
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;

// If Secret key is not set
if (!JWT_SECRET_KEY) {
  console.error("JWT_SECRET_KEY is not defined in .env");
  process.exit(1); // Stop the server if the secret key is not set
}

// Authentication of JWT token
function authenticateToken(req, res, next) {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token." });
    }

    req.userId = user.userId; // Attach the user ID to the request object
    req.username = user.username;
    next(); // Proceed to the next middleware or route handler
  });
}

// Home route
app.get("/", (req, res) => {
  const file = res.sendFile(path.join(__dirname, "../frontend", "index.html")); // Serve the login-signup.html file
});

// User registration route
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  try {
    const stmtCheck = db.prepare("SELECT * FROM users WHERE username = ?");
    const existingUser = await new Promise((resolve, reject) => {
      stmtCheck.get(username, (err, user) => {
        if (err) reject(err);
        resolve(user);
      });
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username is already taken." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const stmtInsert = db.prepare(
      "INSERT INTO users (username, password) VALUES (?, ?)"
    );
    await new Promise((resolve, reject) => {
      stmtInsert.run(username, hashedPassword, function (err) {
        if (err) reject(err);
        resolve();
      });
    });

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "An error occurred during registration." });
  }
});

// User login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  try {
    const stmt = db.prepare(
      "SELECT id, username, password FROM users WHERE username = ?"
    );
    const user = await new Promise((resolve, reject) => {
      stmt.get(username, (err, user) => {
        if (err) reject(err);
        resolve(user);
      });
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET_KEY,
      {
        expiresIn: "1h",
      }
    );
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "An error occurred during login." });
  }
});

app.post("/game", authenticateToken, (req, res) => {
  const file = res.sendFile(path.join(__dirname, "../frontend", "game.html"));
});

app.post("/home", authenticateToken, (req, res) => {
  const file = res.sendFile(path.join(__dirname, "../frontend", "home.html"));
});
// Delete user account route
app.delete("/deleteAccount", authenticateToken, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ message: "Username and password are required." });
  }

  try {
    const stmt = db.prepare(
      "SELECT id, username, password FROM users WHERE username = ?"
    );
    const user = await new Promise((resolve, reject) => {
      stmt.get(username, (err, user) => {
        if (err) reject(err);
        resolve(user);
      });
    });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid password." });
    }

    const deleteStmt = db.prepare("DELETE FROM users WHERE id = ?");
    await new Promise((resolve, reject) => {
      deleteStmt.run(user.id, function (err) {
        if (err) reject(err);
        resolve();
      });
    });

    res.status(200).json({ message: "User account deleted successfully." });
  } catch (err) {
    console.error("Error during account deletion:", err);
    res
      .status(500)
      .json({ message: "An error occurred while deleting the user." });
  }
});

//historyCODE

app.get("/history", authenticateToken, async (req, res) => {
  const username = req.username; // Extract username from the JWT payload

  try {
    // Fetch game history based on the username and result being 'X won', 'O won', or 'Draw'
    const stmt = db.prepare(`
      SELECT gameid, cross, circle, moves, result, created_at
      FROM games
      WHERE (cross = ? OR circle = ?)
      AND result IN ('X won', 'O won', 'Draw')  -- Filter by result
      ORDER BY created_at DESC
    `);

    const games = await new Promise((resolve, reject) => {
      stmt.all(username, username, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    if (!games.length) {
      return res.status(404).json({ message: "No game history found." });
    }

    res.status(200).json({ games });
  } catch (err) {
    console.error("Error fetching game history:", err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching game history." });
  }
});

// Socket.IO Connection
let waitingPlayers = []; // Queue for matchmaking

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("joinQueue", (username) => {
    console.log(username, " joined the queue");
    if (waitingPlayers.find((player) => player.username === username)) {
      socket.emit("error", "You are already in the queue");
      return;
    }

    waitingPlayers.push({ username, socketId: socket.id });

    if (waitingPlayers.length >= 2) {
      const player1 = waitingPlayers.shift();
      const player2 = waitingPlayers.shift();
      const gameId = generateGameId();
      const gameData = {
        gameId,
        players: [player1.username, player2.username],
        playerId: [player1.socketId, player2.socketId],
        board: Array(9).fill(null),
        moves: [],
        result: "ongoing",
      };

      // Insert the game directly into the database
      const stmt = db.prepare(
        "INSERT INTO games (gameId, cross, circle, moves, result) VALUES (?, ?, ?, ?, ?)"
      );
      stmt.run(
        gameId,
        player1.username,
        player2.username,
        JSON.stringify(gameData.moves),
        gameData.result,
        function (err) {
          if (err) {
            console.error("Error creating game:", err);
          } else {
            console.log(`Game created with ID: ${gameId}`);
          }
        }
      );

      // Emit game start to both players
      io.to(player1.socketId).emit("yourGame", gameData);
      io.to(player2.socketId).emit("yourGame", gameData);
    }
  });

  socket.on("joinGame", ({ room, p1, p2, p1Id, p2Id }) => {
    // Add the client to the room identified by gameId
    socket.join(room);

    // Emit initial game state
    io.to(p1Id).emit("receiveLog", {
      message1: `GameID: ${room} | Playing against ${p2}. You are X play your turn.`,
      message2: `${p1} with ${p1Id} and ${p2} with ${p2Id} have joined the room: ${room}`,
    });
    io.to(p2Id).emit("receiveLog", {
      message1: `GameID: ${room} | Playing against ${p1}. Your are O waiting for X to play.`,
      message2: `${p1} with ${p1Id} and ${p2} with ${p2Id} have joined the room: ${room}`,
    });

    // Handle move events
    socket.on("makeMove", async (gameId, move, currentTurn) => {
      try {
        const result = await addMove(gameId, move);
        if (!result.success) {
          socket.emit("error", result.message);
          return;
        }

        const { moves, result: gameResult } = result.gameState;

        // Emit the updated game state

        if (gameResult === "ongoing") {
          // Log current turn for debugging
          console.log(`Switching turn from ${currentTurn}`);
          currentTurn = currentTurn === p1Id ? p2Id : p1Id;
          console.log(`Next turn is for: ${currentTurn}`);
          io.to(room).emit("turnUpdate", currentTurn); // Notify players whose turn it is
          io.to(room).emit("gameUpdate", { gameId, moves, gameResult });
        } else {
          // Game over, notify players
          io.to(room).emit("gameUpdate", { gameId, moves, gameResult });
        }
      } catch (error) {
        console.error("Error in makeMove:", error);
        socket.emit(
          "error",
          "An unexpected error occurred while processing your move."
        );
      }
    });
  });
  //waitingqueue
  console.log("Current waitingPlayers queue:", waitingPlayers);

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
