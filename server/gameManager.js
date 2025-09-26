// Game Manager to handle multiple game instances
class GameManager {
	constructor() {
		// Map of gameId -> gameState
		this.games = new Map();
	}

	createGame(gameId, playerPool, gameSettings = { maxPlayers: 2, buyIn: 100 }) {
		const gameState = {
			id: gameId,
			users: new Map(),
			currentPlayer: null,
			currentNominator: 0,
			bids: new Map(),
			timer: null,
			nominationTimer: null,
			timeRemaining: 20,
			nominationTimeRemaining: 15,
			auctionActive: false,
			gameStarted: false,
			playersAuctioned: 0,
			totalPlayers: playerPool.length,
			availablePlayers: [...playerPool],
			maxPlayers: gameSettings.maxPlayers || 2,
			buyIn: gameSettings.buyIn || 100,
		};

		this.games.set(gameId, gameState);
		console.log(
			`Created game ${gameId} with max ${gameState.maxPlayers} players and ${gameState.buyIn} buy-in`
		);
		return gameState;
	}

	getGame(gameId) {
		return this.games.get(gameId);
	}

	deleteGame(gameId) {
		const game = this.games.get(gameId);
		if (game) {
			if (game.timer) clearInterval(game.timer);
			if (game.nominationTimer) clearInterval(game.nominationTimer);
		}
		this.games.delete(gameId);
		console.log(`Deleted game ${gameId}`);
	}

	addUserToGame(gameId, socketId, username) {
		const game = this.getGame(gameId);
		if (!game) return null;

		const user = {
			id: socketId,
			username,
			budget: 100, // Always $100 auction budget regardless of buy-in
			team: {
				QB: null,
				RB: null,
				WR: [],
				TE: null,
			},
			playersOwned: 0,
		};

		game.users.set(socketId, user);
		return user;
	}

	removeUserFromGame(gameId, socketId) {
		const game = this.getGame(gameId);
		if (!game) return false;

		game.users.delete(socketId);

		// If no users left, clean up the game
		if (game.users.size === 0) {
			this.deleteGame(gameId);
			return true;
		}

		return false;
	}

	canUserAffordBid(user, bidAmount) {
		const remainingSlots = 5 - user.playersOwned;
		const budgetAfterBid = user.budget - bidAmount;
		return budgetAfterBid >= remainingSlots - 1;
	}

	startAuction(gameId) {
		const game = this.getGame(gameId);
		if (!game || game.users.size !== game.maxPlayers) return false;

		game.gameStarted = true;
		game.auctionActive = false;
		return true;
	}

	requestNomination(gameId) {
		const game = this.getGame(gameId);
		if (!game) return null;

		const userArray = Array.from(game.users.values());
		if (userArray.length < game.maxPlayers) return null;

		const nominator = userArray[game.currentNominator];
		if (!nominator) return null;

		if (nominator.playersOwned >= 5) {
			game.currentNominator = (game.currentNominator + 1) % userArray.length;

			const allUsersComplete = userArray.every(
				(user) => user.playersOwned >= 5
			);
			if (allUsersComplete) {
				return { type: 'end' };
			}

			return this.requestNomination(gameId);
		}

		// Start nomination timer
		game.nominationTimeRemaining = 25;

		return {
			type: 'nominate',
			nominator,
			availablePlayers: game.availablePlayers,
			nominationTimeRemaining: game.nominationTimeRemaining,
		};
	}

	autoNominate(gameId) {
		const game = this.getGame(gameId);
		if (!game) return null;

		const userArray = Array.from(game.users.values());
		const nominator = userArray[game.currentNominator];
		if (!nominator) return null;

		// Find the first available player for a position the nominator doesn't have filled
		const availablePositions = [];
		if (!nominator.team.QB) availablePositions.push('QB');
		if (!nominator.team.RB) availablePositions.push('RB');
		if (nominator.team.WR.length < 2) availablePositions.push('WR');
		if (!nominator.team.TE) availablePositions.push('TE');

		// Find first player in any available position
		for (const position of availablePositions) {
			const player = game.availablePlayers.find((p) => p.position === position);
			if (player) {
				return {
					type: 'auto_nominate',
					player,
					nominator: nominator.username,
				};
			}
		}

		return null;
	}

	startBidding(gameId, player) {
		const game = this.getGame(gameId);
		if (!game) return null;

		game.currentPlayer = player;
		game.bids.clear();

		// Check how many users can actually bid on this position
		const eligibleBidders = Array.from(game.users.values()).filter((user) => {
			const position = player.position;
			if (position === 'QB' && user.team.QB) return false;
			if (position === 'RB' && user.team.RB) return false;
			if (position === 'WR' && user.team.WR.length >= 2) return false;
			if (position === 'TE' && user.team.TE) return false;
			return true;
		});

		// If only one person can bid, auto-assign for $1
		if (eligibleBidders.length <= 1) {
			return this.autoAssignPlayer(gameId, eligibleBidders[0]);
		}

		// Normal bidding process
		game.auctionActive = true;
		game.timeRemaining = 25;

		return {
			type: 'bidding',
			player,
			timeRemaining: game.timeRemaining,
			eligibleBidders: eligibleBidders.length,
		};
	}

	autoAssignPlayer(gameId, winner) {
		const game = this.getGame(gameId);
		if (!game) return null;

		winner.budget -= 1;
		winner.playersOwned++;

		const position = game.currentPlayer.position;
		if (position === 'QB' || position === 'RB' || position === 'TE') {
			winner.team[position] = game.currentPlayer;
		} else if (position === 'WR') {
			winner.team.WR.push(game.currentPlayer);
		}

		// Remove player from available pool
		game.availablePlayers = game.availablePlayers.filter(
			(p) => p.id !== game.currentPlayer.id
		);
		game.playersAuctioned++;

		return {
			type: 'auto_assign',
			player: game.currentPlayer,
			winner: winner.username,
			winningBid: 1,
			updatedUsers: Array.from(game.users.values()),
		};
	}

	placeBid(gameId, socketId, bidAmount) {
		const game = this.getGame(gameId);
		if (!game || !game.auctionActive) return null;

		const user = game.users.get(socketId);
		if (!user) return null;

		// Validate bid
		if (!this.canUserAffordBid(user, bidAmount)) {
			return { error: 'Insufficient budget' };
		}

		// Check if user can bid on this position
		const position = game.currentPlayer.position;
		if (position === 'QB' && user.team.QB)
			return { error: 'QB position already filled' };
		if (position === 'RB' && user.team.RB)
			return { error: 'RB position already filled' };
		if (position === 'WR' && user.team.WR.length >= 2)
			return { error: 'WR positions already filled' };
		if (position === 'TE' && user.team.TE)
			return { error: 'TE position already filled' };

		// Store bid with timestamp
		game.bids.set(socketId, {
			amount: bidAmount,
			timestamp: Date.now(),
		});

		return { success: true, amount: bidAmount };
	}

	endBidding(gameId) {
		const game = this.getGame(gameId);
		if (!game) return null;

		if (game.timer) clearInterval(game.timer);
		game.auctionActive = false;

		let winner = null;
		let winningBid = 0;
		let earliestBidTime = null;
		let tiedBidders = [];

		// Find highest bid and track ties
		for (const [userId, bidData] of game.bids) {
			if (bidData.amount > winningBid) {
				winningBid = bidData.amount;
				winner = game.users.get(userId);
				earliestBidTime = bidData.timestamp;
				tiedBidders = [];
			} else if (bidData.amount === winningBid) {
				const bidder = game.users.get(userId);
				if (bidder) {
					tiedBidders.push({
						username: bidder.username,
						timestamp: bidData.timestamp,
						timeDiff: bidData.timestamp - earliestBidTime,
					});
				}

				if (bidData.timestamp < earliestBidTime) {
					if (winner) {
						tiedBidders.push({
							username: winner.username,
							timestamp: earliestBidTime,
							timeDiff: earliestBidTime - bidData.timestamp,
						});
					}
					winner = game.users.get(userId);
					earliestBidTime = bidData.timestamp;
				}
			}
		}

		// If no bids, assign to nominator for $1
		if (!winner) {
			const userArray = Array.from(game.users.values());
			winner = userArray[game.currentNominator];
			winningBid = 1;
		}

		// Assign player to winner
		winner.budget -= winningBid;
		winner.playersOwned++;

		const position = game.currentPlayer.position;
		if (position === 'QB' || position === 'RB' || position === 'TE') {
			winner.team[position] = game.currentPlayer;
		} else if (position === 'WR') {
			winner.team.WR.push(game.currentPlayer);
		}

		// Remove player from available pool
		game.availablePlayers = game.availablePlayers.filter(
			(p) => p.id !== game.currentPlayer.id
		);
		game.playersAuctioned++;

		return {
			player: game.currentPlayer,
			winner: winner.username,
			winningBid,
			tiedBidders,
			updatedUsers: Array.from(game.users.values()),
		};
	}

	isGameComplete(gameId) {
		const game = this.getGame(gameId);
		if (!game) return true;

		const allUsersComplete = Array.from(game.users.values()).every(
			(user) => user.playersOwned >= 5
		);

		return game.playersAuctioned >= game.totalPlayers || allUsersComplete;
	}

	resetGame(gameId, playerPool) {
		const game = this.getGame(gameId);
		if (!game) return false;

		// Clear all timers
		if (game.timer) {
			clearInterval(game.timer);
			game.timer = null;
		}
		if (game.nominationTimer) {
			clearInterval(game.nominationTimer);
			game.nominationTimer = null;
		}

		// Reset game state but keep users
		game.currentPlayer = null;
		game.currentNominator = 0;
		game.bids.clear();
		game.timeRemaining = 20;
		game.nominationTimeRemaining = 15;
		game.auctionActive = false;
		game.gameStarted = false;
		game.playersAuctioned = 0;
		game.availablePlayers = [...playerPool];

		// Reset all users with $100 budget regardless of buy-in
		game.users.forEach((user) => {
			user.budget = 100; // Always $100 auction budget
			user.team = {
				QB: null,
				RB: null,
				WR: [],
				TE: null,
			};
			user.playersOwned = 0;
		});

		console.log(`Game ${gameId} reset`);
		return true;
	}
}

module.exports = new GameManager();
