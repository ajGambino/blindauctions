import React from 'react';
import { useAuction } from '../../contexts/AuctionContext';

const GameStatus = () => {
	const {
		currentUser,
		currentNominator,
		isNominating,
		isBidding,
		currentPlayer,
	} = useAuction();

	if (!currentUser) {
		return null;
	}

	const getGamePhase = () => {
		if (isBidding && currentPlayer) {
			return {
				phase: 'Bidding Phase',
				description: `Bidding on ${currentPlayer.name} (${currentPlayer.position})`,
				status: 'active',
			};
		}

		if (isNominating) {
			return {
				phase: 'Your Turn',
				description: 'Select a player to nominate',
				status: 'nominating',
			};
		}

		return {
			phase: 'Nomination Phase',
			description: currentNominator
				? `${currentNominator} is nominating`
				: 'Preparing next nomination...',
			status: 'waiting',
		};
	};

	const gamePhase = getGamePhase();

	return (
		<div className='game-status'>
			<div className='status-header'>
				<div className='phase-info'>
					<h2 className={`phase-title ${gamePhase.status}`}>
						{gamePhase.phase}
					</h2>
					<p className='phase-description'>{gamePhase.description}</p>
				</div>
				<div className='user-info'>
					<div className='user-card'>
						<div className='user-name'>{currentUser.username}</div>
						<div className='user-stats'>
							<span className='budget'>${currentUser.budget}</span>
							<span className='players'>{currentUser.playersOwned}/5</span>
						</div>
					</div>
				</div>
			</div>

			{gamePhase.status === 'active' && (
				<div className='bidding-indicator'>
					<div className='pulse-dot'></div>
					<span>Live Bidding</span>
				</div>
			)}
		</div>
	);
};

export default GameStatus;
