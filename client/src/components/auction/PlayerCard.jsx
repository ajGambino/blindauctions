import React from 'react';

const PlayerCard = ({
	player,
	isSelected = false,
	onClick,
	disabled = false,
	showPosition = true,
	className = '',
}) => {
	const handleClick = () => {
		if (!disabled && onClick) {
			onClick(player);
		}
	};

	const getPositionColor = (position) => {
		switch (position) {
			case 'QB':
				return 'position-qb';
			case 'RB':
				return 'position-rb';
			case 'WR':
				return 'position-wr';
			case 'TE':
				return 'position-te';
			default:
				return '';
		}
	};

	const classes = [
		'player-card',
		isSelected && 'selected',
		disabled && 'disabled',
		onClick && !disabled && 'clickable',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={classes} onClick={handleClick}>
			<div className='player-header'>
				<div className='player-image'>
					{player.image ? (
						<img
							src={player.image}
							alt={player.name}
							onError={(e) => {
								e.target.style.display = 'none';
								e.target.nextSibling.style.display = 'flex';
							}}
						/>
					) : null}
					<div className='player-initials' style={{ display: player.image ? 'none' : 'flex' }}>
						{player.name.split(' ').map(n => n[0]).join('')}
					</div>
				</div>
				<div className='player-info'>
					<div className='player-name'>{player.name}</div>
					<div className='player-team-opp'>
						{player.team} {player.opponent ? `vs ${player.opponent}` : ''}
					</div>
				</div>
			</div>
			<div className='player-footer'>
				<div className={`player-position ${getPositionColor(player.position)}`}>
					{player.position}
				</div>
				{player.projection > 0 && (
					<div className='player-projection'>
						{player.projection.toFixed(1)}
					</div>
				)}
			</div>
		</div>
	);
};

export default PlayerCard;
