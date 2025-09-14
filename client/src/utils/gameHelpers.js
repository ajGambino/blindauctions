// Game state helpers
export const GAME_STATES = {
	JOIN: 'join',
	LOBBY: 'lobby',
	GAME: 'game',
	FINAL: 'final',
};

export const POSITIONS = {
	QB: 'QB',
	RB: 'RB',
	WR: 'WR',
	TE: 'TE',
};

export const POSITION_LIMITS = {
	QB: 1,
	RB: 1,
	WR: 2,
	TE: 1,
};

// Team validation helpers
export const isTeamComplete = (team) => {
	return (
		team.QB !== null &&
		team.RB !== null &&
		team.WR.length === 2 &&
		team.TE !== null
	);
};

export const getPositionCount = (team, position) => {
	switch (position) {
		case POSITIONS.QB:
			return team.QB ? 1 : 0;
		case POSITIONS.RB:
			return team.RB ? 1 : 0;
		case POSITIONS.WR:
			return team.WR.length;
		case POSITIONS.TE:
			return team.TE ? 1 : 0;
		default:
			return 0;
	}
};

export const canAddPlayerToPosition = (team, position) => {
	const currentCount = getPositionCount(team, position);
	const maxCount = POSITION_LIMITS[position];
	return currentCount < maxCount;
};

// Budget validation helpers
export const calculateMinimumBudgetRequired = (user) => {
	const remainingSlots = 6 - user.playersOwned;
	return remainingSlots; // Need at least $1 per remaining slot
};

export const canUserAffordBid = (user, bidAmount) => {
	const budgetAfterBid = user.budget - bidAmount;
	const minimumRequired = calculateMinimumBudgetRequired(user) - 1; // -1 because this slot will be filled
	return budgetAfterBid >= minimumRequired;
};

export const getMaxBidForUser = (user) => {
	const minimumRequired = calculateMinimumBudgetRequired(user) - 1;
	return Math.max(1, user.budget - minimumRequired);
};

// Player helpers
export const groupPlayersByPosition = (players) => {
	return players.reduce((groups, player) => {
		const position = player.position;
		if (!groups[position]) {
			groups[position] = [];
		}
		groups[position].push(player);
		return groups;
	}, {});
};

export const filterPlayersByPosition = (players, position) => {
	return players.filter((player) => player.position === position);
};

// Timer helpers
export const formatTimeRemaining = (seconds) => {
	return seconds.toString();
};

export const getTimerStatus = (timeRemaining) => {
	if (timeRemaining <= 5) return 'critical';
	if (timeRemaining <= 10) return 'warning';
	return 'normal';
};

// Validation helpers
export const validateUsername = (username) => {
	const trimmed = username.trim();
	if (!trimmed) {
		return { valid: false, error: 'Username is required' };
	}
	if (trimmed.length > 20) {
		return { valid: false, error: 'Username must be 20 characters or less' };
	}
	return { valid: true };
};

export const validateBidAmount = (amount, user) => {
	const numAmount = parseInt(amount);

	if (isNaN(numAmount) || numAmount < 1) {
		return { valid: false, error: 'Bid must be at least $1' };
	}

	if (!canUserAffordBid(user, numAmount)) {
		return { valid: false, error: 'Insufficient budget for this bid' };
	}

	return { valid: true };
};

// Format helpers
export const formatCurrency = (amount) => {
	return `$${amount}`;
};

export const formatPlayerList = (players) => {
	if (!players || players.length === 0) return 'None';
	return players.map((player) => player.name).join(', ');
};
