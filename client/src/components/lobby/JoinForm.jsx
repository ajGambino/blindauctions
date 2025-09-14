import React, { useState } from 'react';
import { useAuction } from '../../contexts/AuctionContext';
import Button from '../common/Button';

const JoinForm = () => {
	const [username, setUsername] = useState('');
	const [isJoining, setIsJoining] = useState(false);
	const { joinAuction } = useAuction();

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!username.trim()) {
			return;
		}

		setIsJoining(true);
		joinAuction(username.trim());

		// Reset joining state after a delay (in case join fails)
		setTimeout(() => setIsJoining(false), 3000);
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleSubmit(e);
		}
	};

	return (
		<div className='screen'>
			<div className='join-form'>
				<h2>Join the Auction</h2>
				<form onSubmit={handleSubmit}>
					<input
						type='text'
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder='Enter your username'
						maxLength='20'
						disabled={isJoining}
						className='username-input'
						autoFocus
					/>
					<br />
					<Button
						type='submit'
						disabled={!username.trim() || isJoining}
						size='large'
					>
						{isJoining ? 'Joining...' : 'Join Auction'}
					</Button>
				</form>
			</div>
		</div>
	);
};

export default JoinForm;
