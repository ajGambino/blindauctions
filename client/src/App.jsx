import React from 'react';
import { useAuction } from './contexts/AuctionContext';
import JoinForm from './components/lobby/JoinForm';
import WaitingRoom from './components/lobby/WaitingRoom';
import AuctionBoard from './components/auction/AuctionBoard';
import FinalResults from './components/game/FinalResults';
import Modal from './components/common/Modal';
import './styles/global.css';

function App() {
	const { gameState, error, clearError } = useAuction();

	const renderCurrentScreen = () => {
		switch (gameState) {
			case 'join':
				return <JoinForm />;
			case 'lobby':
				return <WaitingRoom />;
			case 'game':
				return <AuctionBoard />;
			case 'final':
				return <FinalResults />;
			default:
				return <JoinForm />;
		}
	};

	return (
		<div className='app'>
			<div className='container'>
				<div className='header'>
					<h1>🏈 Blind Auction</h1>
					<p>2 Players • $100 Budget • 1 QB, 1 RB, 2 WR, 1 TE</p>
				</div>

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
