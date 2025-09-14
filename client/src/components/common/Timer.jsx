import React from 'react';

const Timer = ({ timeRemaining, className = '' }) => {
	const getTimerClass = () => {
		if (timeRemaining <= 5) return 'timer timer-critical';
		if (timeRemaining <= 10) return 'timer timer-warning';
		return 'timer timer-normal';
	};

	return (
		<div className={`${getTimerClass()} ${className}`}>{timeRemaining}</div>
	);
};

export default Timer;
