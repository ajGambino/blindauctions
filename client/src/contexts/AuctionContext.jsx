import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useSocket } from './SocketContext';

const AuctionContext = createContext();

export const useAuction = () => {
	const context = useContext(AuctionContext);
	if (!context) {
		throw new Error('useAuction must be used within an AuctionProvider');
	}
	return context;
};

const initialState = {
	gameState: 'join', // 'join', 'lobby', 'game', 'final'
	currentUser: null,
	allUsers: [],
	playersInLobby: 0,
	currentPlayer: null,
	timeRemaining: 30,
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
		case 'SET_CURRENT_USER':
			return { ...state, currentUser: action.payload };
		case 'SET_ALL_USERS':
			return { ...state, allUsers: action.payload };
		case 'SET_PLAYERS_IN_LOBBY':
			return { ...state, playersInLobby: action.payload };
		case 'SET_CURRENT_PLAYER':
			return { ...state, currentPlayer: action.payload };
		case 'SET_TIME_REMAINING':
			return { ...state, timeRemaining: action.payload };
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

	useEffect(() => {
		if (!socket) return;

		// Socket event listeners
		socket.on('joinedAuction', (data) => {
			dispatch({ type: 'SET_CURRENT_USER', payload: data.user });
			dispatch({ type: 'SET_PLAYERS_IN_LOBBY', payload: data.playersInLobby });
			dispatch({ type: 'SET_GAME_STATE', payload: 'lobby' });
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
		});

		socket.on('waitingForNomination', (data) => {
			console.log('Received waitingForNomination:', data);
			dispatch({ type: 'SET_IS_NOMINATING', payload: false });
			dispatch({ type: 'SET_CURRENT_NOMINATOR', payload: data.nominator });
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

		socket.on('auctionComplete', (data) => {
			dispatch({ type: 'SET_GAME_STATE', payload: 'final' });
			dispatch({ type: 'SET_FINAL_TEAMS', payload: data.finalTeams });
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
			socket.off('bidPlaced');
			socket.off('bidRejected');
			socket.off('playerWon');
			socket.off('noWinner');
			socket.off('auctionComplete');
			socket.off('nominationRejected');
			socket.off('userLeft');
			socket.off('gameReset');
		};
	}, [socket, state.currentUser]);

	// Actions
	const joinAuction = (username) => {
		if (socket) {
			socket.emit('joinAuction', { username });
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
		nominatePlayer,
		placeBid,
		clearError,
		resetGame,
	};

	return (
		<AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>
	);
};
