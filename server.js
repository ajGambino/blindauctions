require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const gameManager = require('./server/gameManager');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
	process.env.SUPABASE_URL,
	process.env.SUPABASE_ANON_KEY
);

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = socketIo(server, {
	cors: {
		origin:
			process.env.NODE_ENV === 'production' ? false : ['http://localhost:5177', 'http://localhost:5178'],
		methods: ['GET', 'POST'],
	},
});

// Serve static files from React build (in production)
if (process.env.NODE_ENV === 'production') {
	app.use(express.static(path.join(__dirname, 'client/dist')));
}

// Player pool loaded from CSV
let playerPool = [];

// Map to track which socket is in which game
const socketGameMap = new Map(); // socketId -> gameId

// Load players from CSV file
function loadPlayersFromCSV() {
	return new Promise((resolve, reject) => {
		const players = [];
		fs.createReadStream(path.join(__dirname, 'playerList.csv'))
			.pipe(csv())
			.on('data', (row) => {
				// Convert CSV row to player object
				players.push({
					id: players.length + 1,
					name: row.Player,
					team: row.Team || null,
					position: row.Position,
					opponent: row.Opp || null,
					projection: parseFloat(row.Projection) || 0,
					image: row.Image || null,
				});
			})
			.on('end', () => {
				console.log(`Loaded ${players.length} players from CSV`);
				resolve(players);
			})
			.on('error', (error) => {
				console.error('Error reading CSV file:', error);
				reject(error);
			});
	});
}

async function startAuction(gameId) {
	const game = gameManager.getGame(gameId);
	if (!game || !gameManager.startAuction(gameId)) return;

	// Update database status to 'in_progress'
	try {
		await supabase.rpc('start_game', { game_id: gameId });
		console.log(`Game ${gameId} status updated to 'in_progress'`);
	} catch (error) {
		console.error('Error updating game status to in_progress:', error);
	}

	const allUsers = Array.from(game.users.values());
	io.to(gameId).emit('gameStarted', {
		users: allUsers,
		allUsers: allUsers,
		currentNominator: game.currentNominator,
	});

	// Start nomination phase
	setTimeout(() => {
		requestNomination(gameId);
	}, 2000);
}

function requestNomination(gameId) {
	const result = gameManager.requestNomination(gameId);
	if (!result) return;

	if (result.type === 'end') {
		endAuction(gameId);
		return;
	}

	const { nominator, availablePlayers, nominationTimeRemaining } = result;
	console.log(`Requesting nomination from ${nominator.username} in game ${gameId}`);

	// If nominator is disconnected, auto-nominate immediately
	if (nominator.disconnected) {
		console.log(`Nominator ${nominator.username} is disconnected, auto-nominating...`);
		setTimeout(() => autoNominate(gameId), 1000);
		return;
	}

	// Send nomination request only to the nominator
	io.to(nominator.id).emit('requestNomination', {
		availablePlayers: availablePlayers,
		nominator: nominator.username,
		nominationTimeRemaining: nominationTimeRemaining
	});

	// Send waiting message to everyone EXCEPT the nominator
	const game = gameManager.getGame(gameId);
	const userArray = Array.from(game.users.values());
	userArray.forEach((user) => {
		if (user.id !== nominator.id) {
			io.to(user.id).emit('waitingForNomination', {
				nominator: nominator.username,
				nominationTimeRemaining: nominationTimeRemaining
			});
		}
	});

	// Start nomination countdown timer
	game.nominationTimer = setInterval(() => {
		game.nominationTimeRemaining--;
		io.to(gameId).emit('nominationTimerUpdate', game.nominationTimeRemaining);

		if (game.nominationTimeRemaining <= 0) {
			autoNominate(gameId);
		}
	}, 1000);
}

function autoNominate(gameId) {
	const game = gameManager.getGame(gameId);
	if (!game) return;

	// Clear nomination timer
	if (game.nominationTimer) {
		clearInterval(game.nominationTimer);
		game.nominationTimer = null;
	}

	const result = gameManager.autoNominate(gameId);
	if (!result) return;

	console.log(`Auto-nominated ${result.player.name} for ${result.nominator} in game ${gameId}`);

	// Notify everyone about the auto-nomination
	io.to(gameId).emit('playerAutoNominated', {
		player: result.player,
		nominator: result.nominator
	});

	// Start bidding for the auto-nominated player
	startBidding(gameId, result.player);
}

function startBidding(gameId, player) {
	const result = gameManager.startBidding(gameId, player);
	if (!result) return;

	if (result.type === 'auto_assign') {
		io.to(gameId).emit('playerWon', {
			...result,
			autoAssigned: true,
		});

		if (gameManager.isGameComplete(gameId)) {
			endAuction(gameId);
		} else {
			const game = gameManager.getGame(gameId);
			const currentUserCount = game.users.size;
			game.currentNominator = (game.currentNominator + 1) % Math.max(currentUserCount, 2);
			setTimeout(() => {
				requestNomination(gameId);
			}, 2000);
		}
		return;
	}

	// Normal bidding process
	io.to(gameId).emit('biddingStarted', {
		player: player,
		timeRemaining: result.timeRemaining,
	});

	// Start countdown timer
	const game = gameManager.getGame(gameId);
	game.timer = setInterval(() => {
		game.timeRemaining--;
		io.to(gameId).emit('timerUpdate', game.timeRemaining);

		if (game.timeRemaining <= 0) {
			endBidding(gameId);
		}
	}, 1000);
}

function endBidding(gameId) {
	const result = gameManager.endBidding(gameId);
	if (!result) return;

	io.to(gameId).emit('playerWon', result);

	// Check if auction is complete
	if (gameManager.isGameComplete(gameId)) {
		endAuction(gameId);
	} else {
		// Move to next nominator
		const game = gameManager.getGame(gameId);
		const currentUserCount = game.users.size;
		game.currentNominator = (game.currentNominator + 1) % Math.max(currentUserCount, 2);
		setTimeout(() => {
			requestNomination(gameId);
		}, 3000);
	}
}

async function endAuction(gameId) {
	const game = gameManager.getGame(gameId);
	if (!game) return;

	// Update database status to 'completed'
	try {
		await supabase.rpc('end_game', { game_id: gameId });
		console.log(`Game ${gameId} status updated to 'completed'`);
	} catch (error) {
		console.error('Error updating game status to completed:', error);
	}

	io.to(gameId).emit('auctionComplete', {
		finalTeams: Array.from(game.users.values()),
	});
}

io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	socket.on('joinAuction', (data) => {
		const { gameId, username, gameSettings } = data;

		// Check if game exists
		let game = gameManager.getGame(gameId);
		if (!game) {
			// Create new game instance with settings
			const settings = gameSettings || { maxPlayers: 2, buyIn: 100 };
			game = gameManager.createGame(gameId, playerPool, settings);
		}

		// Check for reconnection - find disconnected user with same username
		if (game.gameStarted) {
			let reconnectedUser = null;
			let oldSocketId = null;

			for (const [socketId, user] of game.users.entries()) {
				if (user.username === username && user.disconnected) {
					reconnectedUser = user;
					oldSocketId = socketId;
					break;
				}
			}

			if (reconnectedUser && oldSocketId) {
				// Reconnect existing user
				socket.join(gameId);
				const user = gameManager.reconnectUserToGame(gameId, oldSocketId, socket.id);

				// Update socket mapping
				socketGameMap.delete(oldSocketId);
				socketGameMap.set(socket.id, gameId);

				socket.emit('reconnected', {
					user: user,
					users: Array.from(game.users.values()),
					gameState: {
						currentPlayer: game.currentPlayer,
						auctionActive: game.auctionActive,
						timeRemaining: game.timeRemaining,
						currentNominator: game.currentNominator,
					},
				});

				console.log(`User ${username} reconnected to game ${gameId}`);
				return;
			} else {
				// Game already in progress, can't join as new player
				socket.emit('gameInProgress');
				return;
			}
		}

		// Check if game is full
		if (game.users.size >= game.maxPlayers) {
			socket.emit('auctionFull');
			return;
		}

		// Join the socket room
		socket.join(gameId);
		socketGameMap.set(socket.id, gameId);

		// Add user to game
		const user = gameManager.addUserToGame(gameId, socket.id, username);

		socket.emit('joinedAuction', {
			user: user,
			playersInLobby: game.users.size,
		});

		io.to(gameId).emit('userJoined', {
			username: username,
			playersInLobby: game.users.size,
		});

		if (game.users.size === game.maxPlayers) {
			startAuction(gameId);
		}
	});

	socket.on('nominatePlayer', (data) => {
		const gameId = socketGameMap.get(socket.id);
		if (!gameId) return;

		const game = gameManager.getGame(gameId);
		if (!game) return;

		// Clear nomination timer since manual nomination was made
		if (game.nominationTimer) {
			clearInterval(game.nominationTimer);
			game.nominationTimer = null;
		}

		const user = game.users.get(socket.id);
		const userArray = Array.from(game.users.values());
		const nominator = userArray[game.currentNominator];

		if (!user || user.id !== nominator.id) {
			return;
		}

		const player = game.availablePlayers.find((p) => p.id === data.playerId);
		if (!player) return;

		// Check if nominator already has this position filled
		const position = player.position;
		if (position === 'QB' && nominator.team.QB) {
			socket.emit('nominationRejected', 'You already have a QB');
			return;
		}
		if (position === 'RB' && nominator.team.RB) {
			socket.emit('nominationRejected', 'You already have an RB');
			return;
		}
		if (position === 'WR' && nominator.team.WR.length >= 2) {
			socket.emit('nominationRejected', 'You already have 2 WRs');
			return;
		}
		if (position === 'TE' && nominator.team.TE) {
			socket.emit('nominationRejected', 'You already have a TE');
			return;
		}

		startBidding(gameId, player);
	});

	socket.on('placeBid', (data) => {
		const gameId = socketGameMap.get(socket.id);
		if (!gameId) return;

		const result = gameManager.placeBid(gameId, socket.id, data.amount);
		if (!result) return;

		if (result.error) {
			socket.emit('bidRejected', result.error);
			return;
		}

		socket.emit('bidPlaced', result.amount);

		// Check if all eligible connected players have bid
		const game = gameManager.getGame(gameId);
		const totalBids = game.bids.size;
		const eligibleConnectedPlayers = Array.from(game.users.values()).filter((user) => {
			// Skip disconnected users
			if (user.disconnected) return false;

			const position = game.currentPlayer.position;
			if (position === 'QB' && user.team.QB) return false;
			if (position === 'RB' && user.team.RB) return false;
			if (position === 'WR' && user.team.WR.length >= 2) return false;
			if (position === 'TE' && user.team.TE) return false;
			return true;
		}).length;

		if (totalBids >= eligibleConnectedPlayers && eligibleConnectedPlayers > 0) {
			console.log('All eligible connected players have bid, ending auction early');
			endBidding(gameId);
		}
	});

	socket.on('leaveGame', () => {
		const gameId = socketGameMap.get(socket.id);
		if (!gameId) return;

		console.log('User leaving game:', gameId, socket.id);

		// Leave the socket room
		socket.leave(gameId);

		// Remove user from game
		const game = gameManager.getGame(gameId);
		if (game) {
			const gameDeleted = gameManager.removeUserFromGame(gameId, socket.id);

			if (!gameDeleted) {
				// Notify remaining players
				io.to(gameId).emit('userJoined', {
					username: '',
					playersInLobby: game.users.size,
				});
			}
		}

		socketGameMap.delete(socket.id);
		socket.emit('leftGame');
	});

	socket.on('resetGame', () => {
		const gameId = socketGameMap.get(socket.id);
		if (!gameId) return;

		console.log('Game reset requested for game:', gameId);
		gameManager.resetGame(gameId, playerPool);
		io.to(gameId).emit('gameReset');
	});

	socket.on('disconnect', () => {
		console.log('User disconnected:', socket.id);
		const gameId = socketGameMap.get(socket.id);

		if (gameId) {
			const game = gameManager.getGame(gameId);
			if (game) {
				const gameDeleted = gameManager.removeUserFromGame(gameId, socket.id);

				// Only notify if user left before game started and game wasn't deleted
				if (!gameDeleted && !game.gameStarted) {
					io.to(gameId).emit('userJoined', {
						username: '',
						playersInLobby: game.users.size,
					});
				}

				// If user disconnected during active game, they're marked as disconnected
				// Game will continue and auto-timeout their decisions
			}

			// Keep socket mapping for potential reconnection during active games
			if (!game || !game.gameStarted) {
				socketGameMap.delete(socket.id);
			}
		}
	});
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
	app.get('*', (req, res) => {
		res.sendFile(path.join(__dirname, 'client/dist/index.html'));
	});
}

const PORT = process.env.PORT || 3000;

// Initialize server with CSV data
async function startServer() {
	try {
		// Load player data from CSV
		playerPool = await loadPlayersFromCSV();

		console.log(`Loaded ${playerPool.length} players for auction`);

		// Start the server
		server.listen(PORT, () => {
			console.log(`Server running on port ${PORT}`);
			console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

// Start the server
startServer();