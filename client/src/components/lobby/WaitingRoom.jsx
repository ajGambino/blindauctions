import React from 'react';
import { useAuction } from '../../contexts/AuctionContext';

const WaitingRoom = () => {
	const { playersInLobby, currentUser } = useAuction();

	return (
		<div className='screen'>
			<div className='lobby-info'>
				<h2>Waiting for Players</h2>
				<div className='lobby-status'>
					<div className='player-count'>
						<span className='count'>{playersInLobby}</span>
						<span className='separator'>/</span>
						<span className='total'>2</span>
					</div>
					<p>Players in lobby</p>
				</div>

				{currentUser && (
					<div className='current-user-info'>
						<p>
							Welcome, <strong>{currentUser.username}</strong>!
						</p>
					</div>
				)}

				<div className='waiting-message'>
					<p>Auction will start automatically when 2 players join</p>
					<div className='loading-dots'>
						<span></span>
						<span></span>
						<span></span>
					</div>
				</div>
			</div>
		</div>
	);
};

export default WaitingRoom;
