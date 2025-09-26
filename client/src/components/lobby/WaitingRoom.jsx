import React from 'react';
import { useAuction } from '../../contexts/AuctionContext';
import Button from '../common/Button';

const WaitingRoom = () => {
	const { playersInLobby, maxPlayers, currentUser, gameBuyIn, returnToLobby } = useAuction();

	const getBuyInLabel = (budget) => {
		switch(budget) {
			case 100: return '1 🍌'
			case 300: return '3 🍌'
			case 500: return '5 🍌'
			default: return `${budget / 100} 🍌`
		}
	};

	return (
		<div className='screen'>
			<div className='lobby-info'>
				<h2>Waiting for Players</h2>
				<div className='lobby-status'>
					<div className='player-count'>
						<span className='count'>{playersInLobby}</span>
						<span className='separator'>/</span>
						<span className='total'>{maxPlayers}</span>
					</div>
					<p>Players in lobby</p>
				</div>

				{currentUser && (
					<div className='current-user-info'>
						<p>
							Welcome, <strong>{currentUser.username}</strong>!
						</p>
						<p className='game-settings'>
							Buy-in: {getBuyInLabel(gameBuyIn)}
						</p>
					</div>
				)}

				<div className='waiting-message'>
					<p>Waiting for more players to join...</p>
					<div className='loading-dots'>
						<span></span>
						<span></span>
						<span></span>
					</div>
				</div>

				<div className='waiting-actions'>
					<Button
						onClick={returnToLobby}
						variant="secondary"
						size="small"
					>
						Leave Game
					</Button>
				</div>
			</div>
		</div>
	);
};

export default WaitingRoom;
