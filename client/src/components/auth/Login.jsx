import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../common/Button'

const Login = ({ onToggleMode }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { signIn, error, clearError } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return

    setIsLoading(true)
    clearError()

    const { error } = await signIn(email.trim(), password)

    if (error) {
      console.error('Login error:', error)
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
        <h2>Login to Blind Auction</h2>
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
          {error && (
            <div className='auth-error'>
              {error}
            </div>
          )}
          <Button
            type='submit'
            disabled={!email.trim() || !password.trim() || isLoading}
            size='large'
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
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
  )
}

export default Login