import React from 'react';
import { useAuction } from './contexts/AuctionContext';
import { useAuth } from './contexts/AuthContext';
import Auth from './components/auth/Auth';
import GameLobby from './components/lobby/GameLobby';
import WaitingRoom from './components/lobby/WaitingRoom';
import AuctionBoard from './components/auction/AuctionBoard';
import FinalResults from './components/game/FinalResults';
import Modal from './components/common/Modal';
import './styles/global.css';

function App() {
	const { gameState, joinAuction, error, clearError } = useAuction();
	const { user, loading } = useAuth();

	const handleJoinGame = (gameId) => {
		joinAuction(gameId);
	};

	const renderCurrentScreen = () => {
		// Show loading screen while checking authentication
		if (loading) {
			return (
				<div className='screen'>
					<div className='lobby-info'>
						<h2>Loading...</h2>
						<div className='loading-dots'>
							<span></span>
							<span></span>
							<span></span>
						</div>
					</div>
				</div>
			);
		}

		// If not authenticated, show auth screen
		if (!user) {
			return <Auth />;
		}

		// If authenticated, handle game states
		switch (gameState) {
			case 'lobby':
				return <GameLobby onJoinGame={handleJoinGame} />;
			case 'waiting':
				return <WaitingRoom />;
			case 'game':
				return <AuctionBoard />;
			case 'final':
				return <FinalResults />;
			default:
				return <GameLobby onJoinGame={handleJoinGame} />;
		}
	};

	return (
		<div className='app'>
			<div className='container'>
				{/* <div className='header'>
					<h1>🏈 Blind Auctions</h1>
					<p>$100 Budget • 1 QB, 1 RB, 2 WR, 1 TE</p>
				</div> */}

				{renderCurrentScreen()}

				{error && (
					<Modal onClose={clearError}>
						<div className='error-modal'>
							<h3>Error</h3>
							<p>{error}</p>
						</div>
					</Modal>
				)}
			</div>
		</div>
	);
}

export default App;
