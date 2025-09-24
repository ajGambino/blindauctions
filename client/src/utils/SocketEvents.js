// Socket event constants
export const SOCKET_EVENTS = {
	// Client to Server
	JOIN_AUCTION: 'joinAuction',
	NOMINATE_PLAYER: 'nominatePlayer',
	PLACE_BID: 'placeBid',

	// Server to Client
	JOINED_AUCTION: 'joinedAuction',
	USER_JOINED: 'userJoined',
	AUCTION_FULL: 'auctionFull',
	GAME_IN_PROGRESS: 'gameInProgress',
	GAME_STARTED: 'gameStarted',
	REQUEST_NOMINATION: 'requestNomination',
	WAITING_FOR_NOMINATION: 'waitingForNomination',
	BIDDING_STARTED: 'biddingStarted',
	TIMER_UPDATE: 'timerUpdate',
	NOMINATION_TIMER_UPDATE: 'nominationTimerUpdate',
	PLAYER_AUTO_NOMINATED: 'playerAutoNominated',
	BID_PLACED: 'bidPlaced',
	BID_REJECTED: 'bidRejected',
	PLAYER_WON: 'playerWon',
	NO_WINNER: 'noWinner',
	AUCTION_COMPLETE: 'auctionComplete',
	USER_LEFT: 'userLeft',

	// Connection events
	CONNECT: 'connect',
	DISCONNECT: 'disconnect',
};

// Helper functions for socket event handling
export const createSocketEventHandler = (eventType, handler) => {
	return (socket) => {
		socket.on(eventType, handler);
		return () => socket.off(eventType, handler);
	};
};

export const emitSocketEvent = (socket, eventType, data = {}) => {
	if (socket && socket.connected) {
		socket.emit(eventType, data);
		return true;
	}
	console.warn(`Cannot emit ${eventType}: socket not connected`);
	return false;
};
