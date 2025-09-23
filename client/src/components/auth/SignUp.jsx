import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../common/Button'

const SignUp = ({ onToggleMode }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const { signUp, error, clearError } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) return

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)
    setMessage('')
    clearError()

    const { data, error } = await signUp(email.trim(), password)

    if (error) {
      console.error('Signup error:', error)
    } else if (data?.user && !data.user.email_confirmed_at) {
      setMessage('Check your email for a confirmation link!')
    }

    setIsLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  return (
    <div className='screen'>
      <div className='auth-form'>
        <h2>Sign Up for Blind Auction</h2>
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
            placeholder='Create a password (min 6 characters)'
            disabled={isLoading}
            className='auth-input'
            minLength={6}
            required
          />
          <input
            type='password'
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder='Confirm your password'
            disabled={isLoading}
            className='auth-input'
            required
          />
          {error && (
            <div className='auth-error'>
              {error}
            </div>
          )}
          {message && (
            <div className='auth-message'>
              {message}
            </div>
          )}
          <Button
            type='submit'
            disabled={!email.trim() || !password.trim() || !confirmPassword.trim() || isLoading}
            size='large'
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </Button>
        </form>
        <div className='auth-toggle'>
          <p>Already have an account?</p>
          <button
            type='button'
            className='auth-link'
            onClick={onToggleMode}
            disabled={isLoading}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  )
}

export default SignUp