import React from 'react';
import { useAuction } from '../../contexts/AuctionContext';
import GameStatus from '../game/GameStatus';
import UserTeam from '../game/UserTeam';
import PlayerList from './PlayerList';
import BidForm from './BidForm';
import Timer from '../common/Timer';
import PlayerCard from './PlayerCard';

const AuctionBoard = () => {
	const auctionData = useAuction();
	const {
		currentPlayer,
		timeRemaining,
		isBidding,
		isNominating,
		currentNominator,
		bidStatus,
	} = auctionData;

	// Debug logging
	console.log('AuctionBoard render:', {
		currentPlayer,
		timeRemaining,
		isBidding,
		isNominating,
		currentNominator,
	});

	return (
		<div className='screen'>
			<GameStatus />

			{/* Last Sale/Bid Status */}
			{bidStatus && (
				<div
					className={`bid-status persistent ${
						bidStatus.type === 'success' ? 'bid-placed' : 'bid-rejected'
					}`}
				>
					{bidStatus.message}
				</div>
			)}

			<div className='auction-content'>
				<div className='main-auction-area'>
					{/* Current Player Being Auctioned */}
					{currentPlayer && isBidding && (
						<div className='current-player-section'>
							<h3>Current Player</h3>
							<div className='current-player-display'>
								<PlayerCard
									player={currentPlayer}
									className='current-player-card'
									showPosition={true}
								/>
								<Timer timeRemaining={timeRemaining} />
							</div>
						</div>
					)}

					{/* Nomination Phase */}
					{isNominating && <PlayerList />}

					{/* Waiting for Nomination */}
					{!isNominating && !isBidding && currentNominator && (
						<div className='nomination-waiting'>
							<h3>Waiting for Nomination</h3>
							<p>{currentNominator} is selecting a player to nominate...</p>
							<div className='loading-dots'>
								<span></span>
								<span></span>
								<span></span>
							</div>
						</div>
					)}

					{/* Bidding Form */}
					<BidForm />
				</div>

				<div className='sidebar'>
					<UserTeam />
				</div>
			</div>
		</div>
	);
};

export default AuctionBoard;
