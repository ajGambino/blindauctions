import React from 'react';
import { useAuction } from '../../contexts/AuctionContext';

const UserTeam = () => {
	const { currentUser, allUsers } = useAuction();

	if (!currentUser) {
		return null;
	}

	const usersToDisplay = allUsers.length > 0 ? allUsers : [currentUser];

	const RosterCircle = ({ player, position, isEmpty = false }) => {
		return (
			<div className={`roster-circle ${isEmpty ? 'empty' : 'filled'}`}>
				{player && player.image ? (
					<img
						src={player.image}
						alt={player.name}
						className="player-headshot"
						onError={(e) => {
							e.target.style.display = 'none';
							e.target.nextSibling.style.display = 'flex';
						}}
					/>
				) : null}
				<div className={`position-text ${player ? 'hidden' : 'visible'}`}>
					{position}
				</div>
				{player && (
					<div className="player-name-tooltip">
						{player.name}
					</div>
				)}
			</div>
		);
	};

	const getUserRoster = (user) => {
		const roster = [
			{ position: 'QB', player: user.team.QB },
			{ position: 'RB', player: user.team.RB },
			{ position: 'WR', player: user.team.WR?.[0] },
			{ position: 'WR', player: user.team.WR?.[1] },
			{ position: 'TE', player: user.team.TE },
		];
		return roster;
	};

	return (
		<div className='teams-section'>
			<h3 className='teams-header'>Teams</h3>

			{usersToDisplay.map((user) => {
				const roster = getUserRoster(user);
				const isCurrentUser = user.id === currentUser.id;

				return (
					<div key={user.id} className={`user-team ${isCurrentUser ? 'current-user' : ''}`}>
						<div className='user-header'>
							<div className='user-name'>
								{user.username}
								{isCurrentUser && <span className='you-badge'>You</span>}
							</div>
							<div className='user-stats'>
								<span className='budget'>${user.budget}</span>
								<span className='players'>{user.playersOwned}/5</span>
							</div>
						</div>

						<div className='circular-roster'>
							{roster.map((slot, index) => (
								<RosterCircle
									key={index}
									player={slot.player}
									position={slot.position}
									isEmpty={!slot.player}
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
};

export default UserTeam;
