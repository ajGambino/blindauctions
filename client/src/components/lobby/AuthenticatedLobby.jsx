import React, { useEffect, useState } from 'react';
import { useAuction } from '../../contexts/AuctionContext';
import { useAuth } from '../../contexts/AuthContext';
import WaitingRoom from './WaitingRoom';
import Button from '../common/Button';

const AuthenticatedLobby = () => {
	const { joinAuction, gameState } = useAuction();
	const { user, signOut } = useAuth();
	const [hasJoined, setHasJoined] = useState(false);

	useEffect(() => {
		// Automatically join auction when component mounts and user is authenticated
		if (user && !hasJoined) {
			joinAuction();
			setHasJoined(true);
		}
	}, [user, joinAuction, hasJoined]);

	const handleSignOut = async () => {
		await signOut();
	};

	// If already in lobby, show waiting room
	if (gameState === 'lobby') {
		return (
			<>
				<WaitingRoom />
				<div style={{ textAlign: 'center', marginTop: '20px' }}>
					<Button onClick={handleSignOut} size="small">
						Sign Out
					</Button>
				</div>
			</>
		);
	}

	// Show joining screen
	return (
		<div className='screen'>
			<div className='lobby-info'>
				<h2>Joining Auction...</h2>
				<p>Welcome, <strong>{user?.email}</strong>!</p>
				<div className='loading-dots'>
					<span></span>
					<span></span>
					<span></span>
				</div>
				<div style={{ marginTop: '30px' }}>
					<Button onClick={handleSignOut} size="small">
						Sign Out
					</Button>
				</div>
			</div>
		</div>
	);
};

export default AuthenticatedLobby;