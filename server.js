const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const gameManager = require('./server/gameManager');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
	cors: {
		origin:
			process.env.NODE_ENV === 'production' ? false : ['http://localhost:5177'],
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

function startAuction(gameId) {
	const game = gameManager.getGame(gameId);
	if (!game || !gameManager.startAuction(gameId)) return;

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

	const { nominator, availablePlayers } = result;
	console.log(`Requesting nomination from ${nominator.username} in game ${gameId}`);

	// Send nomination request only to the nominator
	io.to(nominator.id).emit('requestNomination', {
		availablePlayers: availablePlayers,
		nominator: nominator.username,
	});

	// Send waiting message to everyone EXCEPT the nominator
	const game = gameManager.getGame(gameId);
	const userArray = Array.from(game.users.values());
	userArray.forEach((user) => {
		if (user.id !== nominator.id) {
			io.to(user.id).emit('waitingForNomination', {
				nominator: nominator.username,
			});
		}
	});
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

function endAuction(gameId) {
	const game = gameManager.getGame(gameId);
	if (!game) return;

	io.to(gameId).emit('auctionComplete', {
		finalTeams: Array.from(game.users.values()),
	});
}

io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	socket.on('joinAuction', (data) => {
		const { gameId, username } = data;

		// Check if game exists
		let game = gameManager.getGame(gameId);
		if (!game) {
			// Create new game instance
			game = gameManager.createGame(gameId, playerPool);
		}

		// Check if game is full
		if (game.users.size >= 2) {
			socket.emit('auctionFull');
			return;
		}

		// Check if game has started
		if (game.gameStarted) {
			socket.emit('gameInProgress');
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

		if (game.users.size === 2) {
			startAuction(gameId);
		}
	});

	socket.on('nominatePlayer', (data) => {
		const gameId = socketGameMap.get(socket.id);
		if (!gameId) return;

		const game = gameManager.getGame(gameId);
		if (!game) return;

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

		// Check if all eligible players have bid
		const game = gameManager.getGame(gameId);
		const totalBids = game.bids.size;
		const eligiblePlayers = Array.from(game.users.values()).filter((user) => {
			const position = game.currentPlayer.position;
			if (position === 'QB' && user.team.QB) return false;
			if (position === 'RB' && user.team.RB) return false;
			if (position === 'WR' && user.team.WR.length >= 2) return false;
			if (position === 'TE' && user.team.TE) return false;
			return true;
		}).length;

		if (totalBids >= eligiblePlayers && eligiblePlayers > 0) {
			console.log('All eligible players have bid, ending auction early');
			endBidding(gameId);
		}
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

				if (!gameDeleted && game.users.size < 2 && game.gameStarted) {
					// Handle user leaving mid-game
					io.to(gameId).emit('userLeft', 'A user left the game');
				}
			}
			socketGameMap.delete(socket.id);
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