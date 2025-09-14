import React, { useEffect } from 'react';

const Modal = ({ children, onClose, className = '' }) => {
	useEffect(() => {
		const handleEscape = (e) => {
			if (e.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);
		document.body.style.overflow = 'hidden';

		return () => {
			document.removeEventListener('keydown', handleEscape);
			document.body.style.overflow = 'unset';
		};
	}, [onClose]);

	const handleBackdropClick = (e) => {
		if (e.target === e.currentTarget) {
			onClose();
		}
	};

	return (
		<div className='modal-backdrop' onClick={handleBackdropClick}>
			<div className={`modal-content ${className}`}>
				<button className='modal-close' onClick={onClose}>
					×
				</button>
				{children}
			</div>
		</div>
	);
};

export default Modal;
