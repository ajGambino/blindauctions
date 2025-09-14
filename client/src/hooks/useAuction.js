import { useContext } from 'react';
import { AuctionContext } from '../contexts/AuctionContext';

// Main auction hook
export const useAuction = () => {
	const context = useContext(AuctionContext);

	if (!context) {
		throw new Error('useAuction must be used within an AuctionProvider');
	}

	return context;
};

// Hook for user-specific auction data
export const useUserAuctionData = () => {
	const { currentUser } = useAuction();

	if (!currentUser) {
		return {
			username: null,
			budget: 0,
			playersOwned: 0,
			team: null,
			isLoggedIn: false,
		};
	}

	return {
		username: currentUser.username,
		budget: currentUser.budget,
		playersOwned: currentUser.playersOwned,
		team: currentUser.team,
		isLoggedIn: true,
	};
};

// Hook for current auction phase
export const useAuctionPhase = () => {
	const {
		gameState,
		isNominating,
		isBidding,
		currentPlayer,
		currentNominator,
	} = useAuction();

	const getPhaseInfo = () => {
		switch (gameState) {
			case 'join':
				return { phase: 'joining', description: 'Waiting to join auction' };
			case 'lobby':
				return { phase: 'lobby', description: 'Waiting for players' };
			case 'game':
				if (isBidding && currentPlayer) {
					return {
						phase: 'bidding',
						description: `Bidding on ${currentPlayer.name}`,
						player: currentPlayer,
					};
				}
				if (isNominating) {
					return { phase: 'nominating', description: 'Your turn to nominate' };
				}
				return {
					phase: 'waiting',
					description: `${currentNominator} is nominating`,
				};
			case 'final':
				return { phase: 'complete', description: 'Auction complete' };
			default:
				return { phase: 'unknown', description: 'Unknown state' };
		}
	};

	return getPhaseInfo();
};

// Hook for bid validation
export const useBidValidation = () => {
	const { currentUser } = useAuction();

	const validateBid = (amount) => {
		if (!currentUser) {
			return { valid: false, error: 'Not logged in' };
		}

		const numAmount = parseInt(amount);

		if (isNaN(numAmount) || numAmount < 1) {
			return { valid: false, error: 'Bid must be at least $1' };
		}

		const remainingSlots = 6 - currentUser.playersOwned;
		const budgetAfterBid = currentUser.budget - numAmount;
		const minimumRequired = remainingSlots - 1; // -1 because this slot will be filled

		if (budgetAfterBid < minimumRequired) {
			return {
				valid: false,
				error: 'Must leave at least $1 per remaining player',
			};
		}

		return { valid: true };
	};

	const getMaxBid = () => {
		if (!currentUser) return 0;

		const remainingSlots = 6 - currentUser.playersOwned;
		const minimumRequired = remainingSlots - 1;
		return Math.max(1, currentUser.budget - minimumRequired);
	};

	return { validateBid, getMaxBid };
};
