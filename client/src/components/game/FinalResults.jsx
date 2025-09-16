import React from 'react';
import { useAuction } from '../../contexts/AuctionContext';
import PlayerCard from '../auction/PlayerCard';

const FinalResults = () => {
	const { finalTeams, currentUser, resetGame } = useAuction();

	const isCurrentUser = (team) => {
		return currentUser && team.id === currentUser.id;
	};

	const getAllPlayers = (team) => {
		const players = [];
		if (team.team.QB) players.push(team.team.QB);
		if (team.team.RB) players.push(team.team.RB);
		if (team.team.WR) players.push(...team.team.WR);
		if (team.team.TE) players.push(team.team.TE);
		return players;
	};

	const getTotalProjection = (team) => {
		const players = getAllPlayers(team);
		return players.reduce((total, player) => total + (player.projection || 0), 0).toFixed(1);
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
								<div className='team-stats'>
									<div className='team-budget'>
										Budget: <strong>${team.budget}</strong>
									</div>
									<div className='team-projection'>
										Total Projection: <strong>{getTotalProjection(team)}</strong>
									</div>
								</div>
							</div>

							<div className='team-roster'>
								{getAllPlayers(team).map((player, idx) => (
									<PlayerCard
										key={idx}
										player={player}
										className="roster-card"
									/>
								))}
							</div>
						</div>
					))}
				</div>

				<div className='results-actions'>
					<button
						className='btn btn-primary'
						onClick={resetGame}
					>
						Start New Auction
					</button>
				</div>
			</div>
		</div>
	);
};

export default FinalResults;
