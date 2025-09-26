import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { gameService } from '../../services/gameService';
import Button from '../common/Button';
import Modal from '../common/Modal';

const GameLobby = ({ onJoinGame }) => {
	const [allGames, setAllGames] = useState([]);
	const [activeTab, setActiveTab] = useState('lobby'); // 'lobby' or 'history'
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [newGameName, setNewGameName] = useState('');
	const [selectedBuyIn, setSelectedBuyIn] = useState(100); // Default 1 banana = 100
	const [selectedPlayerCount, setSelectedPlayerCount] = useState(2);
	const [creating, setCreating] = useState(false);
	const { user, signOut } = useAuth();

	useEffect(() => {
		loadGames();

		// Subscribe to real-time updates
		const subscription = gameService.subscribeToGames(() => {
			loadGames();
		});

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, []);

	const loadGames = async () => {
		try {
			setError(null);
			const allGames = await gameService.getAllGames();
			setAllGames(allGames);
		} catch (err) {
			console.error('Error loading games:', err);
			setError('Failed to load games');
		} finally {
			setLoading(false);
		}
	};

	// Filter games for lobby (only waiting games that aren't full)
	const lobbyGames = allGames.filter(
		(game) =>
			game.status === 'waiting' && game.current_players < game.max_players
	);

	// Filter games for history (completed games and full games)
	const historyGames = allGames.filter(
		(game) =>
			game.status === 'completed' ||
			(game.status === 'in_progress' &&
				game.current_players >= game.max_players) ||
			(game.status === 'waiting' && game.current_players >= game.max_players)
	);

	const handleCreateGame = async () => {
		if (!newGameName.trim()) return;

		try {
			setCreating(true);
			setError(null);

			const gameSettings = {
				buyIn: selectedBuyIn,
				maxPlayers: selectedPlayerCount,
			};

			const gameId = await gameService.createGame(
				newGameName.trim(),
				gameSettings
			);

			// Join the game immediately after creating
			const username = user.email.split('@')[0];
			await gameService.joinGame(gameId, username);

			setShowCreateModal(false);
			setNewGameName('');
			setSelectedBuyIn(100);
			setSelectedPlayerCount(2);

			// Navigate to the game
			onJoinGame(gameId);
		} catch (err) {
			console.error('Error creating game:', err);
			setError(err.message || 'Failed to create game');
		} finally {
			setCreating(false);
		}
	};

	const getBuyInLabel = (value) => {
		switch (value) {
			case 100:
				return '1 🍌';
			case 300:
				return '3 🍌';
			case 500:
				return '5 🍌';
			default:
				return `${value / 100} 🍌`;
		}
	};

	const handleJoinGame = async (gameId) => {
		try {
			setError(null);
			const username = user.email.split('@')[0];
			await gameService.joinGame(gameId, username);
			onJoinGame(gameId);
		} catch (err) {
			console.error('Error joining game:', err);
			setError(err.message || 'Failed to join game');
		}
	};

	const getGameStatusDisplay = (game) => {
		switch (game.status) {
			case 'waiting':
				return (
					<span className='game-status waiting'>
						Waiting ({game.current_players}/{game.max_players})
					</span>
				);
			case 'in_progress':
				return (
					<span className='game-status in-progress'>
						In Progress ({game.current_players}/{game.max_players})
					</span>
				);
			default:
				return <span className='game-status'>{game.status}</span>;
		}
	};

	const canJoinGame = (game) => {
		return game.status === 'waiting' && game.current_players < game.max_players;
	};

	if (loading) {
		return (
			<div className='screen'>
				<div className='lobby-info'>
					<h2>Loading Games...</h2>
					<div className='loading-dots'>
						<span></span>
						<span></span>
						<span></span>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className='screen'>
			<div className='game-lobby'>
				<div className='lobby-header'>
					<div className='header'>
						<h1>🏈 Blind Auctions</h1>
						<p>$100 Budget • 1 QB, 1 RB, 2 WR, 1 TE</p>
					</div>
					<p>
						Welcome, <strong>{user?.email.split('@')[0]}</strong>!
					</p>
					<div className='lobby-actions'>
						<Button onClick={() => setShowCreateModal(true)} size='large'>
							Create New Game
						</Button>
						<Button onClick={signOut} variant='secondary' size='small'>
							Sign Out
						</Button>
					</div>
				</div>

				{error && <div className='error-message'>{error}</div>}

				<div className='games-section'>
					<div className='lobby-tabs'>
						<button
							className={`tab-button ${activeTab === 'lobby' ? 'active' : ''}`}
							onClick={() => setActiveTab('lobby')}
						>
							Available Games ({lobbyGames.length})
						</button>
						<button
							className={`tab-button ${
								activeTab === 'history' ? 'active' : ''
							}`}
							onClick={() => setActiveTab('history')}
						>
							Game History ({historyGames.length})
						</button>
					</div>

					{activeTab === 'lobby' ? (
						lobbyGames.length === 0 ? (
							<div className='no-games'>
								<p>No available games. Create one to get started!</p>
							</div>
						) : (
							<div className='games-grid'>
								{lobbyGames.map((game) => (
									<div key={game.id} className='game-card'>
										<div className='game-header'>
											<h4>{game.name}</h4>
											{getGameStatusDisplay(game)}
										</div>

										<div className='game-info'>
											<div className='game-meta'>
												<span>
													Created:{' '}
													{new Date(game.created_at).toLocaleTimeString()}
												</span>
												<span className='game-settings'>
													Buy-in: {getBuyInLabel(game.settings?.buyIn || 100)} •
													Max Players: {game.max_players}
												</span>
											</div>

											{game.game_players && game.game_players.length > 0 && (
												<div className='game-players'>
													<span>Players:</span>
													<div className='player-list'>
														{game.game_players.map((player, idx) => (
															<span key={player.id} className='player-name'>
																{player.username}
																{idx < game.game_players.length - 1 && ', '}
															</span>
														))}
													</div>
												</div>
											)}
										</div>

										<div className='game-actions'>
											{canJoinGame(game) ? (
												<Button onClick={() => handleJoinGame(game.id)}>
													Join Game
												</Button>
											) : game.status === 'in_progress' ? (
												<Button disabled>Game in Progress</Button>
											) : (
												<Button disabled>Game Full</Button>
											)}
										</div>
									</div>
								))}
							</div>
						)
					) : // History tab
					historyGames.length === 0 ? (
						<div className='no-games'>
							<p>No completed games yet!</p>
						</div>
					) : (
						<div className='games-grid'>
							{historyGames.map((game) => (
								<div key={game.id} className='game-card history-card'>
									<div className='game-header'>
										<h4>{game.name}</h4>
										{getGameStatusDisplay(game)}
									</div>

									<div className='game-info'>
										<div className='game-meta'>
											<span>
												{game.status === 'completed'
													? `Completed: ${new Date(
															game.completed_at || game.created_at
													  ).toLocaleString()}`
													: `Started: ${new Date(
															game.started_at || game.created_at
													  ).toLocaleString()}`}
											</span>
											<span className='game-settings'>
												Buy-in: {getBuyInLabel(game.settings?.buyIn || 100)} •
												Players: {game.current_players}/{game.max_players}
											</span>
										</div>

										{game.game_players && game.game_players.length > 0 && (
											<div className='game-players'>
												<span>Players:</span>
												<div className='player-list'>
													{game.game_players.map((player, idx) => (
														<span key={player.id} className='player-name'>
															{player.username}
															{idx < game.game_players.length - 1 && ', '}
														</span>
													))}
												</div>
											</div>
										)}
									</div>

									<div className='game-actions'>
										{game.status === 'completed' ? (
											<Button disabled>Game Completed</Button>
										) : (
											<Button disabled>
												{game.status === 'in_progress'
													? 'In Progress'
													: 'Game Full'}
											</Button>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</div>

				{showCreateModal && (
					<Modal onClose={() => !creating && setShowCreateModal(false)}>
						<div className='create-game-modal'>
							<h3>Create New Game</h3>

							<div className='game-form'>
								<input
									type='text'
									value={newGameName}
									onChange={(e) => setNewGameName(e.target.value)}
									placeholder='Enter game name'
									className='auth-input'
									maxLength={50}
									disabled={creating}
									autoFocus
								/>

								<div className='form-group'>
									<label>Buy-in Amount:</label>
									<select
										value={selectedBuyIn}
										onChange={(e) => setSelectedBuyIn(Number(e.target.value))}
										className='game-select'
										disabled={creating}
									>
										<option value={100}>1 🍌 ($1)</option>
										<option value={300}>3 🍌 ($3)</option>
										<option value={500}>5 🍌 ($5)</option>
									</select>
								</div>

								<div className='form-group'>
									<label>Max Players:</label>
									<select
										value={selectedPlayerCount}
										onChange={(e) =>
											setSelectedPlayerCount(Number(e.target.value))
										}
										className='game-select'
										disabled={creating}
									>
										<option value={2}>2 Players</option>
										<option value={3}>3 Players</option>
										<option value={4}>4 Players</option>
										<option value={5}>5 Players</option>
										<option value={6}>6 Players</option>
									</select>
								</div>
							</div>

							<div className='modal-actions'>
								<Button
									onClick={handleCreateGame}
									disabled={!newGameName.trim() || creating}
								>
									{creating ? 'Creating...' : 'Create Game'}
								</Button>
								<Button
									onClick={() => setShowCreateModal(false)}
									variant='secondary'
									disabled={creating}
								>
									Cancel
								</Button>
							</div>
						</div>
					</Modal>
				)}
			</div>
		</div>
	);
};

export default GameLobby;
