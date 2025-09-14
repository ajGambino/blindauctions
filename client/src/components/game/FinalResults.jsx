import React from 'react';
import { useAuction } from '../../contexts/AuctionContext';
import PlayerCard from '../auction/PlayerCard';

const FinalResults = () => {
	const { finalTeams, currentUser } = useAuction();

	const formatPlayerNames = (players) => {
		if (!players || players.length === 0) return 'None';
		return players.map((player) => player.name).join(', ');
	};

	const isCurrentUser = (team) => {
		return currentUser && team.id === currentUser.id;
	};

	// Sort teams by budget remaining (descending) as a tiebreaker
	const sortedTeams = [...finalTeams].sort((a, b) => b.budget - a.budget);

	return (
		<div className='screen'>
			<div className='final-results'>
				<h2>🏆 Auction Complete!</h2>
				<p className='results-subtitle'>Here are all the teams:</p>

				<div className='team-grid'>
					{sortedTeams.map((team, index) => (
						<div
							key={team.id}
							className={`team-card ${
								isCurrentUser(team) ? 'current-user-team' : ''
							}`}
						>
							<div className='team-header'>
								<h4 className='team-owner'>
									{team.username}
									{isCurrentUser(team) && (
										<span className='you-label'>(You)</span>
									)}
								</h4>
								<div className='team-budget'>
									Budget Remaining: <strong>${team.budget}</strong>
								</div>
							</div>

							<div className='team-roster'>
								<div className='position-section'>
									<h5 className='position-header'>QB</h5>
									<div className='position-players'>
										{team.team.QB ? (
											<PlayerCard
												player={team.team.QB}
												className="roster-card"
											/>
										) : (
											<div className="empty-position">No QB</div>
										)}
									</div>
								</div>

								<div className='position-section'>
									<h5 className='position-header'>RB</h5>
									<div className='position-players'>
										{team.team.RB ? (
											<PlayerCard
												player={team.team.RB}
												className="roster-card"
											/>
										) : (
											<div className="empty-position">No RB</div>
										)}
									</div>
								</div>

								<div className='position-section'>
									<h5 className='position-header'>WR</h5>
									<div className='position-players'>
										{team.team.WR && team.team.WR.length > 0 ? (
											team.team.WR.map((player, idx) => (
												<PlayerCard
													key={idx}
													player={player}
													className="roster-card"
												/>
											))
										) : (
											<div className="empty-position">No WRs</div>
										)}
									</div>
								</div>

								<div className='position-section'>
									<h5 className='position-header'>TE</h5>
									<div className='position-players'>
										{team.team.TE ? (
											<PlayerCard
												player={team.team.TE}
												className="roster-card"
											/>
										) : (
											<div className="empty-position">No TE</div>
										)}
									</div>
								</div>
							</div>

							<div className='team-summary'>
								<span className='players-count'>
									{team.playersOwned}/5 Players
								</span>
							</div>
						</div>
					))}
				</div>

				<div className='results-actions'>
					<button
						className='btn btn-primary'
						onClick={() => window.location.reload()}
					>
						Start New Auction
					</button>
				</div>
			</div>
		</div>
	);
};

export default FinalResults;
