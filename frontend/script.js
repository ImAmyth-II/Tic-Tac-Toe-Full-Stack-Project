const socket = io("http://localhost:3000");
// Listen for socket connection
socket.on('connect', () => {
    console.log('Connected with socket ID:', socket.id);
});

// Determine the current page
const currentPage = document.body.id;
if (currentPage === 'login-signup') {
    // Elements
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginUsername = document.getElementById('loginUsername');
    const loginPassword = document.getElementById('loginPassword');
    const signupUsername = document.getElementById('signupUsername');
    const signupPassword = document.getElementById('signupPassword');
    const confirmPassword = document.getElementById('confirmPassword');
    const loginLink = document.getElementById('login-link');
    const signupLink = document.getElementById('signup-link');

    // Form toggle functionality
    signupLink.addEventListener('click', () => {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('signup-form').style.display = 'block';
    });

    loginLink.addEventListener('click', () => {
        document.getElementById('signup-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
    });

    // Login form submission
    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = loginUsername.value;
        const password = loginPassword.value;

        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('username', username); // Store username in localStorage
                alert('Login successful!');
                window.location.href = '/home.html';
            } else {
                alert(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Error during login:', error);
            alert('An error occurred during login');
        }
    });

    // Signup form submission
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const username = signupUsername.value;
        const password = signupPassword.value;
        const confirmPasswordValue = confirmPassword.value;

        if (password !== confirmPasswordValue) {
            alert('Passwords do not match!');
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();
            if (response.ok) {
                alert('Registration successful!');
                document.getElementById('signup-form').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
            } else {
                alert(data.message || 'Something went wrong!');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('An error occurred. Please try again later.');
        }
    });
}

if (currentPage === 'home') {
    // Elements
    const usernameSpan = document.getElementById('username');
    const startGameButton = document.getElementById('start-game');
    const logoutButton = document.getElementById('logout');
    const deleteAccountButton = document.getElementById('delete-account-btn');
    const historyButton = document.getElementById('viewHistory');
    
    // Fetch the auth token
    const authToken = localStorage.getItem('authToken');
     // Fetch the  user name
    const user = localStorage.getItem('username');

    if (!authToken) {
        alert('You are not logged in. Redirecting to login page.');
        window.location.href = '/login-signup.html';
    }

    // Display username
    usernameSpan.textContent = localStorage.getItem('username'); // Store username during login/signup

    //deleteAccount button logic
    deleteAccountButton.addEventListener('click', async () => {
        try {
            const username = prompt('Enter your username:');
            const password = prompt('Enter your password:');
    
            const response = await fetch('http://localhost:3000/deleteAccount', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ username, password }),
            });
    
            if (response.ok) {
                alert('Account deleted successfully.');
                window.location.href = '/login-signup.html'; // Redirect to the login page
            } else {
                const data = await response.json();
                alert(data.message || 'Could not delete account.');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
        }
    });
    // Start random game
    startGameButton.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:3000/game', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({}),
            });
            // Check if the response is successful (status 2xx)
            if (response.ok) {
                window.location.href = '/game.html';  // Redirect to the game page
                // window.location.href = `/game.html?gameId=${data.gameId}`;
            } else {
                const data = await response.json();
                alert(data.message || 'Could not start the game');
            }
        } catch (error) {
            console.error('Error starting random game:', error);
        }
    });
    
    //history button
    historyButton.addEventListener('click', async () => {
        try {
          const response = await fetch('http://localhost:3000/history', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`, // Include token for authentication
            },
          });
      
          if (response.ok) {
            const data = await response.json();
            localStorage.setItem('gameHistory', JSON.stringify(data.games)); // Store data in localStorage
            window.location.href = '/history.html'; // Redirect to history page
          } else {
            const error = await response.json();
            alert(error.message || 'Could not fetch game history.');
          }
        } catch (err) {
          console.error('Error fetching game history:', err);
        }
      });
      
    // Logout functionality
    logoutButton.addEventListener('click', () => {
        localStorage.clear();
        alert('Logged out successfully!');
        window.location.href = '/login-signup.html';
    });
}

if (currentPage === 'game') {
    socket.on('connect', () => {
        console.log('Connected with gamer ID:', socket.id);
    });
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        alert('You are not logged in. Redirecting to login page.');
        window.location.href = '/login-signup.html';
    }
    const statusText = document.getElementById('status');
    const username = localStorage.getItem('username');
    console.log(username);

    statusText.textContent = "Joining the game...";
    socket.emit('joinQueue', username);
    const homeButton = document.getElementById('home-btn');
    homeButton.addEventListener('click', async () => {
        try {
            const response = await fetch('http://localhost:3000/home', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({}),
            });
            // Check if the response is successful (status 2xx)
            if (response.ok) {
                window.location.href = '/home.html';  // Redirect to the game page
                // window.location.href = `/game.html?gameId=${data.gameId}`;
            } else {
                const data = await response.json();
                alert(data.message || 'Could not start the game');
            }
        } catch (error) {
            console.error('Error starting random game:', error);
        }
    });

    let currentTurn = '';  // Global variable to keep track of whose turn it is

    socket.on('yourGame', (gameData) => {
    const room = gameData.gameId;
    const p1 = gameData.players[0];
    const p2 = gameData.players[1];
    const p1Id = gameData.playerId[0];
    const p2Id = gameData.playerId[1];
    console.log('Your Room is ', room);

    // Initialize currentTurn
    currentTurn = p1Id;

    socket.emit('joinGame', { room, p1, p2, p1Id, p2Id });
    statusText.textContent = `Game ID: ${gameData.gameId}. Waiting for another player...`;

    //registers Cell as clicked
    function handleCellClick(event) {
        const cell = event.target;
        const cellIndex = Array.from(cell.parentElement.children).indexOf(cell);
        
        // alert(`You clicked cell number ${cellIndex}`); //debugging code
    
        // Only allow the player to make a move if it is their turn
        if (!cell.textContent && socket.id === currentTurn) {
            socket.emit('makeMove', room, cellIndex,currentTurn);
        }
    }

    document.querySelectorAll('[data-cell]').forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });

    socket.on('gameUpdate', (data) => {
        const { room, moves, gameResult } = data;
        console.log(moves);
        console.log(gameResult);
        updateBoard(moves, gameResult);
        if (gameResult !== 'ongoing') {
            showGameEnd(gameResult);
        }
    });

    socket.on('turnUpdate', (turnId) => {
        // Update currentTurn when the server sends a new turn update
        currentTurn = turnId;
    
        // Clear all existing listeners before adding new ones
        document.querySelectorAll('[data-cell]').forEach(cell => {
            const newCell = cell.cloneNode(true); // Cloning the cell to remove all listeners(avoid dublicate click listners)
            cell.parentNode.replaceChild(newCell, cell); // Replace the cell in the DOM
        });
    
        if (socket.id === currentTurn) {
            statusText.textContent = "It's your turn!";
    
            // Add a single listener for the current player's turn
            document.querySelectorAll('[data-cell]').forEach(cell => {
                cell.addEventListener('click', handleCellClick);
            });
        } else {
            statusText.textContent = "Waiting for the opponent's move...";
        }
    });
    
    //Updates and renders the moves on the Client
    function updateBoard(moves, gameResult) {
        const cells = document.querySelectorAll('[data-cell]');
        cells.forEach(cell => cell.textContent = '');

        moves.forEach((move, index) => {
            const cell = cells[move];
            if (cell) {
                cell.textContent = index % 2 === 0 ? 'X' : 'O';
            }
        });

        if (gameResult !== 'ongoing') {
            showGameEnd(gameResult);
        }
    }

    function showGameEnd(gameResult) {
        statusText.textContent = `Game Over:${gameResult}`;
        // alert(`Game Over: ${gameResult}`);
        document.querySelectorAll('[data-cell]').forEach(cell => {
            cell.removeEventListener('click', handleCellClick);
        });
    }
});

    socket.on('receiveLog', (data) => {
        const { message1, message2 } = data;
        statusText.textContent = `${message1}`;
        console.log('Log from server:', message2);
    });

    socket.on('error', (errorMessage) => {
        statusText.textContent = `Error: ${errorMessage}`;
    });
}

if (currentPage === 'history'){
    document.addEventListener('DOMContentLoaded', () => {
        const gameHistory = JSON.parse(localStorage.getItem('gameHistory')) || []; // Get game history from localStorage
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            alert('You are not logged in. Redirecting to login page.');
            window.location.href = '/login-signup.html';
        }
        const historyHomeButton = document.querySelector('#history-home');
        historyHomeButton.addEventListener('click', async () => {
            try {
                const response = await fetch('http://localhost:3000/home', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`,
                    },
                    body: JSON.stringify({}),
                });
                // Check if the response is successful (status 2xx)
                if (response.ok) {
                    window.location.href = '/home.html';  // Redirect to the game page
                    // window.location.href = `/game.html?gameId=${data.gameId}`;
                } else {
                    const data = await response.json();
                    alert(data.message || 'Could load');
                }
            } catch (error) {
                console.error('Error starting loading', error);
            }
        });
        const tableBody = document.querySelector('#history-table tbody'); // Get the table body
        
        // Check if there's any history to display
        if (gameHistory.length === 0) {
          tableBody.innerHTML = '<tr><td colspan="6">No game history found.</td></tr>';
          return;
        }
        
        // Loop through the games and create HTML for each one
        gameHistory.forEach(game => {
          const row = document.createElement('tr'); // Create a new row for each game
          
          // Create table cells for each game detail
          const gameIdCell = document.createElement('td');
          gameIdCell.textContent = game.gameid;
          
          const crossCell = document.createElement('td');
          crossCell.textContent = game.cross;
          
          const circleCell = document.createElement('td');
          circleCell.textContent = game.circle;
          
          const movesCell = document.createElement('td');
          const movesArray = JSON.parse(game.moves);  // Parse the moves string back into an array
          movesCell.textContent = `[${movesArray.join(', ')}]`; // Format the moves as an array
          
          const resultCell = document.createElement('td');
          resultCell.textContent = game.result;
          
          const dateCell = document.createElement('td');
          dateCell.textContent = new Date(game.created_at).toLocaleString(); // Format the date
          
          // Append each cell to the row
          row.appendChild(gameIdCell);
          row.appendChild(crossCell);
          row.appendChild(circleCell);
          row.appendChild(movesCell);
          row.appendChild(resultCell);
          row.appendChild(dateCell);
          
          // Append the row to the table body
          tableBody.appendChild(row);
        });
      });
              
}