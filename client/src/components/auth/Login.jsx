import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';

const Login = ({ onToggleMode }) => {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const { signIn, signInWithGoogle, error, clearError } = useAuth();

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!email.trim() || !password.trim()) return;

		setIsLoading(true);
		clearError();

		const { error } = await signIn(email.trim(), password);

		if (error) {
			console.error('Login error:', error);
		}
		setIsLoading(false);
	};

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleSubmit(e);
		}
	};

	const handleGoogleSignIn = async () => {
		setIsLoading(true);
		clearError();
		await signInWithGoogle();
		setIsLoading(false);
	};

	return (
		<div className='screen'>
			<div className='auth-form'>
				<h1>Login</h1>
				<form onSubmit={handleSubmit}>
					<input
						type='email'
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder='Enter your email'
						disabled={isLoading}
						className='auth-input'
						autoFocus
						required
					/>
					<input
						type='password'
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						onKeyPress={handleKeyPress}
						placeholder='Enter your password'
						disabled={isLoading}
						className='auth-input'
						required
					/>
					{error && <div className='auth-error'>{error}</div>}
					<Button
						type='submit'
						disabled={!email.trim() || !password.trim() || isLoading}
						size='large'
					>
						{isLoading ? 'Logging in...' : 'Login'}
					</Button>
				</form>

				<div className='auth-divider'>
					<span>or</span>
				</div>

				<Button
					onClick={handleGoogleSignIn}
					disabled={isLoading}
					size='large'
					variant='secondary'
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: '8px',
					}}
				>
					<svg
						width='18'
						height='18'
						viewBox='0 0 18 18'
						fill='none'
						xmlns='http://www.w3.org/2000/svg'
					>
						<path
							fillRule='evenodd'
							clipRule='evenodd'
							d='M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.8445H13.8436C13.635 11.9699 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z'
							fill='#4285F4'
						/>
						<path
							fillRule='evenodd'
							clipRule='evenodd'
							d='M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65590 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z'
							fill='#34A853'
						/>
						<path
							fillRule='evenodd'
							clipRule='evenodd'
							d='M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z'
							fill='#FBBC04'
						/>
						<path
							fillRule='evenodd'
							clipRule='evenodd'
							d='M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z'
							fill='#EA4335'
						/>
					</svg>
					Continue with Google
				</Button>
				<div className='auth-toggle'>
					<p>Don't have an account?</p>
					<button
						type='button'
						className='auth-link'
						onClick={onToggleMode}
						disabled={isLoading}
					>
						Sign Up
					</button>
				</div>
			</div>
		</div>
	);
};

export default Login;
