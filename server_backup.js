const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

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

// Game state
const gameState = {
	users: new Map(),
	currentPlayer: null,
	currentNominator: 0,
	bids: new Map(),
	timer: null,
	timeRemaining: 30,
	auctionActive: false,
	gameStarted: false,
	playersAuctioned: 0,
	totalPlayers: 12,
};

// Player pool loaded from CSV
let playerPool = [];
let availablePlayers = [];

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

function createUser(socketId, username) {
	return {
		id: socketId,
		username,
		budget: 100,
		team: {
			QB: null,
			RB: null,
			WR: [],
			TE: null,
		},
		playersOwned: 0,
	};
}

function canUserAffordBid(user, bidAmount) {
	const remainingSlots = 5 - user.playersOwned; // 5 total positions: 1 QB, 1 RB, 2 WR, 1 TE
	const budgetAfterBid = user.budget - bidAmount;
	return budgetAfterBid >= remainingSlots - 1;
}

function startAuction() {
	if (gameState.users.size !== 2) return;

	gameState.gameStarted = true;
	gameState.auctionActive = false;

	const allUsers = Array.from(gameState.users.values());
	io.emit('gameStarted', {
		users: allUsers,
		allUsers: allUsers,
		currentNominator: gameState.currentNominator,
	});

	// Start nomination phase
	setTimeout(() => {
		requestNomination();
	}, 2000);
}

function requestNomination() {
	const userArray = Array.from(gameState.users.values());

	// Check if we have enough users to continue
	if (userArray.length < 2) {
		console.log('Not enough players to continue auction');
		return;
	}

	const nominator = userArray[gameState.currentNominator];

	// Check if nominator exists and has completed their roster
	if (!nominator) {
		console.log('Nominator not found, resetting to first user');
		gameState.currentNominator = 0;
		requestNomination();
		return;
	}

	if (nominator.playersOwned >= 5) {
		console.log(
			`${nominator.username} has completed their roster, moving to next nominator`
		);
		gameState.currentNominator =
			(gameState.currentNominator + 1) % userArray.length;

		// Check if all users are complete
		const allUsersComplete = userArray.every((user) => user.playersOwned >= 5);
		if (allUsersComplete) {
			endAuction();
			return;
		}

		// Try next nominator
		requestNomination();
		return;
	}

	console.log(
		`Requesting nomination from ${nominator.username} (${nominator.id})`
	);

	// Send nomination request only to the nominator
	io.to(nominator.id).emit('requestNomination', {
		availablePlayers: availablePlayers,
		nominator: nominator.username,
	});

	// Send waiting message to everyone EXCEPT the nominator
	userArray.forEach((user) => {
		if (user.id !== nominator.id) {
			io.to(user.id).emit('waitingForNomination', {
				nominator: nominator.username,
			});
		}
	});
}

function startBidding(player) {
	gameState.currentPlayer = player;
	gameState.bids.clear();

	// Check how many users can actually bid on this position
	const eligibleBidders = Array.from(gameState.users.values()).filter(
		(user) => {
			const position = player.position;
			// Check if user can still bid on this position
			if (position === 'QB' && user.team.QB) return false;
			if (position === 'RB' && user.team.RB) return false;
			if (position === 'WR' && user.team.WR.length >= 2) return false;
			if (position === 'TE' && user.team.TE) return false;
			return true;
		}
	);

	// If only one person can bid (the nominator), auto-assign for $1
	if (eligibleBidders.length <= 1) {
		console.log(
			`Only ${eligibleBidders.length} eligible bidder(s), auto-assigning for $1`
		);

		// Auto-assign to the only eligible bidder (should be the nominator)
		const winner = eligibleBidders[0];

		// Assign player to winner
		winner.budget -= 1;
		winner.playersOwned++;

		const position = gameState.currentPlayer.position;
		if (position === 'QB' || position === 'RB' || position === 'TE') {
			winner.team[position] = gameState.currentPlayer;
		} else if (position === 'WR') {
			winner.team.WR.push(gameState.currentPlayer);
		}

		// Remove player from available pool
		availablePlayers = availablePlayers.filter(
			(p) => p.id !== gameState.currentPlayer.id
		);
		gameState.playersAuctioned++;

		io.emit('playerWon', {
			player: gameState.currentPlayer,
			winner: winner.username,
			winningBid: 1,
			tiedBidders: [],
			updatedUsers: Array.from(gameState.users.values()),
			autoAssigned: true,
		});

		// Check if auction is complete
		const allUsersComplete = Array.from(gameState.users.values()).every(
			(user) => user.playersOwned >= 5
		);

		if (
			gameState.playersAuctioned >= gameState.totalPlayers ||
			allUsersComplete
		) {
			endAuction();
		} else {
			// Move to next nominator
			const currentUserCount = Array.from(gameState.users.values()).length;
			gameState.currentNominator =
				(gameState.currentNominator + 1) % Math.max(currentUserCount, 2);
			setTimeout(() => {
				requestNomination();
			}, 2000); // Shorter delay since no bidding occurred
		}
		return;
	}

	// Normal bidding process for multiple eligible bidders
	gameState.auctionActive = true;
	gameState.timeRemaining = 30;

	io.emit('biddingStarted', {
		player: player,
		timeRemaining: gameState.timeRemaining,
	});

	// Start countdown timer
	gameState.timer = setInterval(() => {
		gameState.timeRemaining--;
		io.emit('timerUpdate', gameState.timeRemaining);

		if (gameState.timeRemaining <= 0) {
			endBidding();
		}
	}, 1000);
}

function endBidding() {
	clearInterval(gameState.timer);
	gameState.auctionActive = false;

	let winner = null;
	let winningBid = 0;
	let earliestBidTime = null;
	let tiedBidders = [];

	// Find highest bid and track ties
	for (const [userId, bidData] of gameState.bids) {
		if (bidData.amount > winningBid) {
			winningBid = bidData.amount;
			winner = gameState.users.get(userId);
			earliestBidTime = bidData.timestamp;
			tiedBidders = []; // Clear previous ties
		} else if (bidData.amount === winningBid) {
			// Track tied bidders
			const bidder = gameState.users.get(userId);
			if (bidder) {
				tiedBidders.push({
					username: bidder.username,
					timestamp: bidData.timestamp,
					timeDiff: bidData.timestamp - earliestBidTime,
				});
			}

			// Check if this bid was earlier (wins the tie)
			if (bidData.timestamp < earliestBidTime) {
				// Move previous winner to tied list
				if (winner) {
					tiedBidders.push({
						username: winner.username,
						timestamp: earliestBidTime,
						timeDiff: earliestBidTime - bidData.timestamp,
					});
				}
				winner = gameState.users.get(userId);
				earliestBidTime = bidData.timestamp;
			}
		}
	}

	// If no bids, assign to nominator for $1
	if (!winner) {
		const userArray = Array.from(gameState.users.values());
		winner = userArray[gameState.currentNominator];
		winningBid = 1;
	}

	// Assign player to winner (either highest bidder or nominator)
	winner.budget -= winningBid;
	winner.playersOwned++;

	const position = gameState.currentPlayer.position;
	if (position === 'QB' || position === 'RB' || position === 'TE') {
		winner.team[position] = gameState.currentPlayer;
	} else if (position === 'WR') {
		winner.team.WR.push(gameState.currentPlayer);
	}

	// Remove player from available pool
	availablePlayers = availablePlayers.filter(
		(p) => p.id !== gameState.currentPlayer.id
	);
	gameState.playersAuctioned++;

	io.emit('playerWon', {
		player: gameState.currentPlayer,
		winner: winner.username,
		winningBid: winningBid,
		tiedBidders: tiedBidders,
		updatedUsers: Array.from(gameState.users.values()),
	});

	// Check if auction is complete - either all players drafted OR all users have full rosters
	const allUsersComplete = Array.from(gameState.users.values()).every(
		(user) => user.playersOwned >= 5
	);

	if (
		gameState.playersAuctioned >= gameState.totalPlayers ||
		allUsersComplete
	) {
		endAuction();
	} else {
		// Move to next nominator
		const currentUserCount = Array.from(gameState.users.values()).length;
		gameState.currentNominator =
			(gameState.currentNominator + 1) % Math.max(currentUserCount, 2);
		setTimeout(() => {
			requestNomination();
		}, 3000);
	}
}

function endAuction() {
	io.emit('auctionComplete', {
		finalTeams: Array.from(gameState.users.values()),
	});
}

function resetGame() {
	// Clear all timers
	if (gameState.timer) {
		clearInterval(gameState.timer);
		gameState.timer = null;
	}

	// Reset game state
	gameState.users.clear();
	gameState.currentPlayer = null;
	gameState.currentNominator = 0;
	gameState.bids.clear();
	gameState.timeRemaining = 30;
	gameState.auctionActive = false;
	gameState.gameStarted = false;
	gameState.playersAuctioned = 0;

	// Reset available players
	availablePlayers = [...playerPool];

	console.log('Game state reset');
}

io.on('connection', (socket) => {
	console.log('User connected:', socket.id);

	socket.on('joinAuction', (data) => {
		if (gameState.users.size >= 2) {
			socket.emit('auctionFull');
			return;
		}

		if (gameState.gameStarted) {
			socket.emit('gameInProgress');
			return;
		}

		const user = createUser(socket.id, data.username);
		gameState.users.set(socket.id, user);

		socket.emit('joinedAuction', {
			user: user,
			playersInLobby: gameState.users.size,
		});

		io.emit('userJoined', {
			username: data.username,
			playersInLobby: gameState.users.size,
		});

		if (gameState.users.size === 2) {
			startAuction();
		}
	});

	socket.on('nominatePlayer', (data) => {
		const user = gameState.users.get(socket.id);
		const userArray = Array.from(gameState.users.values());
		const nominator = userArray[gameState.currentNominator];

		if (!user || user.id !== nominator.id) {
			return;
		}

		const player = availablePlayers.find((p) => p.id === data.playerId);
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

		startBidding(player);
	});

	socket.on('placeBid', (data) => {
		if (!gameState.auctionActive) return;

		const user = gameState.users.get(socket.id);
		if (!user) return;

		const bidAmount = data.amount;

		// Validate bid
		if (!canUserAffordBid(user, bidAmount)) {
			socket.emit('bidRejected', 'Insufficient budget');
			return;
		}

		// Check if user already has this position filled
		const position = gameState.currentPlayer.position;
		if (position === 'QB' && user.team.QB) {
			socket.emit('bidRejected', 'QB position already filled');
			return;
		}
		if (position === 'RB' && user.team.RB) {
			socket.emit('bidRejected', 'RB position already filled');
			return;
		}
		if (position === 'WR' && user.team.WR.length >= 2) {
			socket.emit('bidRejected', 'WR positions already filled');
			return;
		}
		if (position === 'TE' && user.team.TE) {
			socket.emit('bidRejected', 'TE position already filled');
			return;
		}

		// Store bid with timestamp
		gameState.bids.set(socket.id, {
			amount: bidAmount,
			timestamp: Date.now(),
		});

		socket.emit('bidPlaced', bidAmount);

		// Check if all eligible players have bid
		const totalBids = gameState.bids.size;
		const eligiblePlayers = Array.from(gameState.users.values()).filter(
			(user) => {
				const position = gameState.currentPlayer.position;
				// Check if user can still bid on this position
				if (position === 'QB' && user.team.QB) return false;
				if (position === 'RB' && user.team.RB) return false;
				if (position === 'WR' && user.team.WR.length >= 2) return false;
				if (position === 'TE' && user.team.TE) return false;
				return true;
			}
		).length;

		if (totalBids >= eligiblePlayers && eligiblePlayers > 0) {
			console.log('All eligible players have bid, ending auction early');
			endBidding();
		}
	});

	socket.on('resetGame', () => {
		console.log('Game reset requested by:', socket.id);
		resetGame();
		io.emit('gameReset');
	});

	socket.on('disconnect', () => {
		console.log('User disconnected:', socket.id);
		gameState.users.delete(socket.id);

		if (gameState.users.size < 2 && gameState.gameStarted) {
			// Handle user leaving mid-game
			io.emit('userLeft', 'A user left the game');
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
		availablePlayers = [...playerPool];

		// Update total players count based on CSV data
		gameState.totalPlayers = playerPool.length;

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
