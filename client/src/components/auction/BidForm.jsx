import React, { useState, useEffect } from 'react';
import { useAuction } from '../../contexts/AuctionContext';
import Button from '../common/Button';

const BidForm = () => {
	const [bidAmount, setBidAmount] = useState('1');
	const { currentUser, currentPlayer, placeBid, bidStatus, isBidding } =
		useAuction();

	useEffect(() => {
		// Reset to $1 when new bidding starts
		if (isBidding) {
			setBidAmount('1');
		}
	}, [isBidding]);

	const getMaxBid = () => {
		if (!currentUser) return 0;
		return Math.min(
			currentUser.budget,
			currentUser.budget - (5 - currentUser.playersOwned - 1)
		);
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		const amount = parseInt(bidAmount);

		if (!amount || amount < 1) {
			return;
		}

		placeBid(amount);
		setBidAmount('1'); // Reset to $1 after bid
	};

	const handleInputChange = (e) => {
		const value = e.target.value;
		if (
			value === '' ||
			(parseInt(value) >= 1 && parseInt(value) <= getMaxBid())
		) {
			setBidAmount(value);
		}
	};

	const handleMaxBid = () => {
		const maxBid = getMaxBid();
		setBidAmount(maxBid.toString());
	};

	if (!isBidding || !currentPlayer) {
		return null;
	}

	const maxBid = getMaxBid();

	return (
		<div className='bidding-section'>
			<h3>Place Your Bid</h3>
			<div className='bid-info'>
				<p>Budget available: ${maxBid}</p>
			</div>

			<form onSubmit={handleSubmit} className='bid-form'>
				<div className='bid-controls'>
					<div className='bid-input-group'>
						<span className='currency-symbol'>$</span>
						<input
							type='number'
							value={bidAmount}
							onChange={handleInputChange}
							min='1'
							max={maxBid}
							placeholder='Amount'
							className='bid-input'
							autoFocus
						/>
					</div>
					<Button
						type='button'
						onClick={handleMaxBid}
						variant='secondary'
						className='max-bid-btn'
						disabled={maxBid <= 1}
					>
						Max (${maxBid})
					</Button>
				</div>
				<Button
					type='submit'
					disabled={!bidAmount || parseInt(bidAmount) < 1 || parseInt(bidAmount) > maxBid}
					variant='primary'
				>
					Place Bid
				</Button>
			</form>

		</div>
	);
};

export default BidForm;
