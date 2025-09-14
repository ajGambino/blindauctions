import React from 'react';

const Button = ({
	children,
	onClick,
	disabled = false,
	variant = 'primary',
	size = 'medium',
	className = '',
	type = 'button',
	...props
}) => {
	const baseClasses = 'btn';
	const variantClasses = {
		primary: 'btn-primary',
		secondary: 'btn-secondary',
		danger: 'btn-danger',
		success: 'btn-success',
	};
	const sizeClasses = {
		small: 'btn-small',
		medium: 'btn-medium',
		large: 'btn-large',
	};

	const classes = [
		baseClasses,
		variantClasses[variant],
		sizeClasses[size],
		disabled && 'btn-disabled',
		className,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<button
			type={type}
			className={classes}
			onClick={onClick}
			disabled={disabled}
			{...props}
		>
			{children}
		</button>
	);
};

export default Button;
