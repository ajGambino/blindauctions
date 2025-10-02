import React, { useState } from 'react';
import { useAuction } from '../../contexts/AuctionContext';
import PlayerCard from './PlayerCard';
import Button from '../common/Button';
import Timer from '../common/Timer';

const PlayerList = () => {
	const [selectedPlayer, setSelectedPlayer] = useState(null);
	const [isNominating, setIsNominating] = useState(false);
	const [activeTab, setActiveTab] = useState('QB');
	const {
		availablePlayers,
		nominatePlayer,
		isNominating: isInNominationPhase,
		isBidding,
		nominationTimeRemaining,
		currentUser,
	} = useAuction();

	// Debug logging
	console.log('PlayerList render:', {
		isInNominationPhase,
		availablePlayersCount: availablePlayers?.length,
		availablePlayers: availablePlayers?.slice(0, 3), // First 3 for debugging
	});

	const handlePlayerSelect = (player) => {
		setSelectedPlayer(player);
		console.log('Selected player:', player);
	};

	const handleNominate = () => {
		if (!selectedPlayer) return;

		console.log('Nominating player:', selectedPlayer);
		setIsNominating(true);
		nominatePlayer(selectedPlayer.id);

		// Reset state after nomination
		setTimeout(() => {
			setIsNominating(false);
			setSelectedPlayer(null);
		}, 1000);
	};

	const groupPlayersByPosition = (players) => {
		return players.reduce((groups, player) => {
			const position = player.position;
			if (!groups[position]) {
				groups[position] = [];
			}
			groups[position].push(player);
			return groups;
		}, {});
	};

	// Ensure activeTab is valid, default to first available position that user needs
	React.useEffect(() => {
		if (availablePlayers && availablePlayers.length > 0 && currentUser) {
			const groupedPlayers = groupPlayersByPosition(availablePlayers);
			const positions = ['QB', 'RB', 'WR', 'TE'];

			// Filter positions that have available players AND user still needs
			const availablePositions = positions.filter(pos => {
				if (!groupedPlayers[pos] || groupedPlayers[pos].length === 0) {
					return false;
				}

				// Check if user needs this position
				if (pos === 'QB') return !currentUser.team.QB;
				if (pos === 'RB') return !currentUser.team.RB;
				if (pos === 'WR') return currentUser.team.WR.length < 2;
				if (pos === 'TE') return !currentUser.team.TE;
				return true;
			});

			// If current tab is not in available positions, switch to first available
			if (availablePositions.length > 0 && !availablePositions.includes(activeTab)) {
				setActiveTab(availablePositions[0]);
			}
		}
	}, [availablePlayers, activeTab, currentUser]);

	if (!isInNominationPhase || isBidding) {
		console.log('Not in nomination phase or bidding active, returning null');
		return null;
	}

	if (!availablePlayers || availablePlayers.length === 0) {
		console.log('No available players');
		return <div>No players available</div>;
	}

	const groupedPlayers = groupPlayersByPosition(availablePlayers);
	const positions = ['QB', 'RB', 'WR', 'TE'];
	const availablePositions = positions.filter(pos => groupedPlayers[pos]?.length > 0);

	return (
		<div className='nomination-section'>
			<h3>Nominate a Player</h3>

			{/* Nomination Timer */}
			<div className='timer-section'>
				<Timer timeRemaining={nominationTimeRemaining} />
			</div>

			{/* Position Tabs */}
			<div className='position-tabs'>
				{availablePositions.map((position) => (
					<button
						key={position}
						className={`position-tab ${activeTab === position ? 'active' : ''}`}
						onClick={() => setActiveTab(position)}
					>
						{position} ({groupedPlayers[position]?.length || 0})
					</button>
				))}
			</div>

			{/* Active Position Players */}
			<div className='player-groups'>
				{groupedPlayers[activeTab] && (
					<div className='position-group'>
						<div className='player-list'>
							{groupedPlayers[activeTab].map((player) => (
								<PlayerCard
									key={player.id}
									player={player}
									isSelected={selectedPlayer?.id === player.id}
									onClick={handlePlayerSelect}
									showPosition={false}
								/>
							))}
						</div>
					</div>
				)}
			</div>

			<div className='nomination-actions'>
				<Button
					onClick={handleNominate}
					disabled={!selectedPlayer || isNominating}
					variant='primary'
					size='large'
				>
					{isNominating ? 'Nominating...' : 'Nominate Selected Player'}
				</Button>

				{selectedPlayer && (
					<p>
						Selected: {selectedPlayer.name} ({selectedPlayer.position})
					</p>
				)}
			</div>
		</div>
	);
};

export default PlayerList;
