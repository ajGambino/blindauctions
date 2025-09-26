import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const AuctionContext = createContext();

export const useAuction = () => {
	const context = useContext(AuctionContext);
	if (!context) {
		throw new Error('useAuction must be used within an AuctionProvider');
	}
	return context;
};

const initialState = {
	gameState: 'lobby', // 'lobby', 'waiting', 'game', 'final'
	currentGameId: null,
	currentUser: null,
	allUsers: [],
	playersInLobby: 0,
	maxPlayers: 2,
	gameBuyIn: 100,
	currentPlayer: null,
	timeRemaining: 30,
	nominationTimeRemaining: 15,
	availablePlayers: [],
	currentNominator: null,
	isNominating: false,
	isBidding: false,
	bidStatus: null,
	finalTeams: [],
	error: null,
};

const auctionReducer = (state, action) => {
	switch (action.type) {
		case 'SET_GAME_STATE':
			return { ...state, gameState: action.payload };
		case 'SET_CURRENT_GAME_ID':
			return { ...state, currentGameId: action.payload };
		case 'SET_CURRENT_USER':
			return { ...state, currentUser: action.payload };
		case 'SET_ALL_USERS':
			return { ...state, allUsers: action.payload };
		case 'SET_PLAYERS_IN_LOBBY':
			return { ...state, playersInLobby: action.payload };
		case 'SET_MAX_PLAYERS':
			return { ...state, maxPlayers: action.payload };
		case 'SET_GAME_BUY_IN':
			return { ...state, gameBuyIn: action.payload };
		case 'SET_CURRENT_PLAYER':
			return { ...state, currentPlayer: action.payload };
		case 'SET_TIME_REMAINING':
			return { ...state, timeRemaining: action.payload };
		case 'SET_NOMINATION_TIME_REMAINING':
			return { ...state, nominationTimeRemaining: action.payload };
		case 'SET_AVAILABLE_PLAYERS':
			return { ...state, availablePlayers: action.payload };
		case 'SET_CURRENT_NOMINATOR':
			return { ...state, currentNominator: action.payload };
		case 'SET_IS_NOMINATING':
			return { ...state, isNominating: action.payload };
		case 'SET_IS_BIDDING':
			return { ...state, isBidding: action.payload };
		case 'SET_BID_STATUS':
			return { ...state, bidStatus: action.payload };
		case 'SET_FINAL_TEAMS':
			return { ...state, finalTeams: action.payload };
		case 'SET_ERROR':
			return { ...state, error: action.payload };
		case 'CLEAR_ERROR':
			return { ...state, error: null };
		case 'RESET_GAME':
			return { ...initialState };
		default:
			return state;
	}
};

export const AuctionProvider = ({ children }) => {
	const [state, dispatch] = useReducer(auctionReducer, initialState);
	const { socket } = useSocket();
	const { user } = useAuth();

	useEffect(() => {
		if (!socket) return;

		// Socket event listeners
		socket.on('joinedAuction', (data) => {
			dispatch({ type: 'SET_CURRENT_USER', payload: data.user });
			dispatch({ type: 'SET_PLAYERS_IN_LOBBY', payload: data.playersInLobby });
			dispatch({ type: 'SET_GAME_STATE', payload: 'waiting' });
		});

		socket.on('userJoined', (data) => {
			dispatch({ type: 'SET_PLAYERS_IN_LOBBY', payload: data.playersInLobby });
		});

		socket.on('auctionFull', () => {
			dispatch({
				type: 'SET_ERROR',
				payload: 'Auction is full. Please try again later.',
			});
		});

		socket.on('gameInProgress', () => {
			dispatch({
				type: 'SET_ERROR',
				payload: 'Game is already in progress. Please try again later.',
			});
		});

		socket.on('gameStarted', (data) => {
			dispatch({ type: 'SET_GAME_STATE', payload: 'game' });
			dispatch({
				type: 'SET_CURRENT_NOMINATOR',
				payload: data.users[0].username,
			});
			if (data.allUsers) {
				dispatch({ type: 'SET_ALL_USERS', payload: data.allUsers });
			}
		});

		socket.on('requestNomination', (data) => {
			console.log('Received requestNomination:', data);
			dispatch({ type: 'SET_IS_NOMINATING', payload: true });
			dispatch({
				type: 'SET_AVAILABLE_PLAYERS',
				payload: data.availablePlayers,
			});
			dispatch({ type: 'SET_CURRENT_NOMINATOR', payload: data.nominator });
			dispatch({ type: 'SET_NOMINATION_TIME_REMAINING', payload: data.nominationTimeRemaining });
		});

		socket.on('waitingForNomination', (data) => {
			console.log('Received waitingForNomination:', data);
			dispatch({ type: 'SET_IS_NOMINATING', payload: false });
			dispatch({ type: 'SET_CURRENT_NOMINATOR', payload: data.nominator });
			dispatch({ type: 'SET_NOMINATION_TIME_REMAINING', payload: data.nominationTimeRemaining });
		});

		socket.on('nominationTimerUpdate', (nominationTimeRemaining) => {
			dispatch({ type: 'SET_NOMINATION_TIME_REMAINING', payload: nominationTimeRemaining });
		});

		socket.on('playerAutoNominated', (data) => {
			console.log('Player auto-nominated:', data);
			dispatch({
				type: 'SET_BID_STATUS',
				payload: `${data.player.name} was auto-nominated for ${data.nominator} (time expired)`
			});
		});

		socket.on('biddingStarted', (data) => {
			dispatch({ type: 'SET_IS_BIDDING', payload: true });
			dispatch({ type: 'SET_CURRENT_PLAYER', payload: data.player });
			dispatch({ type: 'SET_TIME_REMAINING', payload: data.timeRemaining });
		});

		socket.on('timerUpdate', (timeRemaining) => {
			dispatch({ type: 'SET_TIME_REMAINING', payload: timeRemaining });
		});

		socket.on('bidPlaced', (amount) => {
			dispatch({
				type: 'SET_BID_STATUS',
				payload: { type: 'success', message: `Bid placed: $${amount}` },
			});
		});

		socket.on('bidRejected', (reason) => {
			dispatch({
				type: 'SET_BID_STATUS',
				payload: { type: 'error', message: `Bid rejected: ${reason}` },
			});
		});

		socket.on('playerWon', (data) => {
			const updatedUser = data.updatedUsers.find(
				(u) => u.id === state.currentUser?.id
			);
			if (updatedUser) {
				dispatch({ type: 'SET_CURRENT_USER', payload: updatedUser });
			}
			dispatch({ type: 'SET_ALL_USERS', payload: data.updatedUsers });

			// Format message with tie information
			let message = `${data.player.name} won by ${data.winner} for $${data.winningBid}`;

			if (data.tiedBidders && data.tiedBidders.length > 0) {
				const tieInfo = data.tiedBidders
					.map(bidder => {
						const seconds = Math.abs(bidder.timeDiff / 1000).toFixed(1);
						return `${bidder.username} $${data.winningBid} ${seconds}s slower`;
					})
					.join(', ');
				message += ` (${tieInfo})`;
			}

			dispatch({
				type: 'SET_BID_STATUS',
				payload: {
					type: 'success',
					message: message,
				},
			});
			dispatch({ type: 'SET_IS_BIDDING', payload: false });
			dispatch({ type: 'SET_IS_NOMINATING', payload: false });
			dispatch({ type: 'SET_CURRENT_NOMINATOR', payload: null });
		});

		socket.on('noWinner', (data) => {
			dispatch({
				type: 'SET_BID_STATUS',
				payload: {
					type: 'error',
					message: `No bids placed for ${data.player.name}`,
				},
			});
			dispatch({ type: 'SET_IS_BIDDING', payload: false });
			dispatch({ type: 'SET_IS_NOMINATING', payload: false });
			dispatch({ type: 'SET_CURRENT_NOMINATOR', payload: null });
		});

		socket.on('auctionComplete', async (data) => {
			dispatch({ type: 'SET_GAME_STATE', payload: 'final' });
			dispatch({ type: 'SET_FINAL_TEAMS', payload: data.finalTeams });

			// Ensure game status is marked as completed in database
			if (state.currentGameId) {
				try {
					const { gameService } = await import('../services/gameService');
					await gameService.endGame(state.currentGameId);
					console.log('Game marked as completed from client');
				} catch (error) {
					console.error('Failed to mark game as completed from client:', error);
				}
			}
		});

		socket.on('nominationRejected', (reason) => {
			dispatch({
				type: 'SET_ERROR',
				payload: reason,
			});
		});

		socket.on('userLeft', (message) => {
			dispatch({ type: 'SET_ERROR', payload: message });
		});

		socket.on('gameReset', () => {
			dispatch({ type: 'RESET_GAME' });
			dispatch({ type: 'SET_GAME_STATE', payload: 'lobby' });
		});

		socket.on('leftGame', () => {
			dispatch({ type: 'RESET_GAME' });
			dispatch({ type: 'SET_GAME_STATE', payload: 'lobby' });
		});

		return () => {
			socket.off('joinedAuction');
			socket.off('userJoined');
			socket.off('auctionFull');
			socket.off('gameInProgress');
			socket.off('gameStarted');
			socket.off('requestNomination');
			socket.off('waitingForNomination');
			socket.off('biddingStarted');
			socket.off('timerUpdate');
			socket.off('nominationTimerUpdate');
			socket.off('playerAutoNominated');
			socket.off('bidPlaced');
			socket.off('bidRejected');
			socket.off('playerWon');
			socket.off('noWinner');
			socket.off('auctionComplete');
			socket.off('nominationRejected');
			socket.off('userLeft');
			socket.off('gameReset');
			socket.off('leftGame');
		};
	}, [socket, state.currentUser]);

	// Actions
	const joinAuction = async (gameId) => {
		if (socket && user && gameId) {
			try {
				// Get game data including settings from database
				const { gameService } = await import('../services/gameService');
				const games = await gameService.getAvailableGames();
				const gameData = games.find(g => g.id === gameId);

				const username = user.email.split('@')[0];
				dispatch({ type: 'SET_CURRENT_GAME_ID', payload: gameId });
				dispatch({ type: 'SET_GAME_STATE', payload: 'waiting' });

				// Include game settings when joining via socket
				const gameSettings = gameData?.settings || { maxPlayers: 2, buyIn: 100 };
				dispatch({ type: 'SET_MAX_PLAYERS', payload: gameSettings.maxPlayers });
				dispatch({ type: 'SET_GAME_BUY_IN', payload: gameSettings.buyIn });
				socket.emit('joinAuction', { gameId, username, gameSettings });
			} catch (error) {
				console.error('Error joining auction:', error);
				// Fallback to original behavior
				const username = user.email.split('@')[0];
				dispatch({ type: 'SET_CURRENT_GAME_ID', payload: gameId });
				dispatch({ type: 'SET_GAME_STATE', payload: 'waiting' });
				socket.emit('joinAuction', { gameId, username });
			}
		}
	};

	const returnToLobby = async () => {
		try {
			// Leave the current game if we're in one
			if (state.currentGameId && user) {
				// Emit socket event to leave game room
				if (socket) {
					socket.emit('leaveGame');
				}

				// Only call leaveGame if game is not in final state (completed)
				if (state.gameState !== 'final') {
					const { gameService } = await import('../services/gameService');
					await gameService.leaveGame(state.currentGameId);
				}
			}
		} catch (error) {
			console.error('Error leaving game:', error);
		} finally {
			dispatch({ type: 'RESET_GAME' });
			dispatch({ type: 'SET_GAME_STATE', payload: 'lobby' });
		}
	};

	const nominatePlayer = (playerId) => {
		if (socket) {
			socket.emit('nominatePlayer', { playerId });
		}
	};

	const placeBid = (amount) => {
		if (socket) {
			socket.emit('placeBid', { amount });
		}
	};

	const clearError = () => {
		dispatch({ type: 'CLEAR_ERROR' });
	};

	const resetGame = () => {
		if (socket) {
			socket.emit('resetGame');
		}
	};

	const value = {
		...state,
		joinAuction,
		returnToLobby,
		nominatePlayer,
		placeBid,
		clearError,
		resetGame,
	};

	return (
		<AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>
	);
};
