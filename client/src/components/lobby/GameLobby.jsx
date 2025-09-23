import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { gameService } from '../../services/gameService'
import Button from '../common/Button'
import Modal from '../common/Modal'

const GameLobby = ({ onJoinGame }) => {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newGameName, setNewGameName] = useState('')
  const [creating, setCreating] = useState(false)
  const { user, signOut } = useAuth()

  useEffect(() => {
    loadGames()

    // Subscribe to real-time updates
    const subscription = gameService.subscribeToGames(() => {
      loadGames()
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const loadGames = async () => {
    try {
      setError(null)
      const availableGames = await gameService.getAvailableGames()
      setGames(availableGames)
    } catch (err) {
      console.error('Error loading games:', err)
      setError('Failed to load games')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGame = async () => {
    if (!newGameName.trim()) return

    try {
      setCreating(true)
      setError(null)
      const gameId = await gameService.createGame(newGameName.trim())

      // Join the game immediately after creating
      const username = user.email.split('@')[0]
      await gameService.joinGame(gameId, username)

      setShowCreateModal(false)
      setNewGameName('')

      // Navigate to the game
      onJoinGame(gameId)
    } catch (err) {
      console.error('Error creating game:', err)
      setError(err.message || 'Failed to create game')
    } finally {
      setCreating(false)
    }
  }

  const handleJoinGame = async (gameId) => {
    try {
      setError(null)
      const username = user.email.split('@')[0]
      await gameService.joinGame(gameId, username)
      onJoinGame(gameId)
    } catch (err) {
      console.error('Error joining game:', err)
      setError(err.message || 'Failed to join game')
    }
  }

  const getGameStatusDisplay = (game) => {
    switch (game.status) {
      case 'waiting':
        return (
          <span className="game-status waiting">
            Waiting ({game.current_players}/{game.max_players})
          </span>
        )
      case 'in_progress':
        return (
          <span className="game-status in-progress">
            In Progress ({game.current_players}/{game.max_players})
          </span>
        )
      default:
        return (
          <span className="game-status">{game.status}</span>
        )
    }
  }

  const canJoinGame = (game) => {
    return game.status === 'waiting' && game.current_players < game.max_players
  }

  if (loading) {
    return (
      <div className='screen'>
        <div className='lobby-info'>
          <h2>Loading Games...</h2>
          <div className='loading-dots'>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='screen'>
      <div className='game-lobby'>
        <div className='lobby-header'>
          <h2>🏈 Auction Lobby</h2>
          <p>Welcome, <strong>{user?.email.split('@')[0]}</strong>!</p>
          <div className='lobby-actions'>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="large"
            >
              Create New Game
            </Button>
            <Button
              onClick={signOut}
              variant="secondary"
              size="small"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {error && (
          <div className='error-message'>
            {error}
          </div>
        )}

        <div className='games-section'>
          <h3>Available Games</h3>

          {games.length === 0 ? (
            <div className='no-games'>
              <p>No games available. Create one to get started!</p>
            </div>
          ) : (
            <div className='games-grid'>
              {games.map((game) => (
                <div key={game.id} className='game-card'>
                  <div className='game-header'>
                    <h4>{game.name}</h4>
                    {getGameStatusDisplay(game)}
                  </div>

                  <div className='game-info'>
                    <div className='game-meta'>
                      <span>Created: {new Date(game.created_at).toLocaleTimeString()}</span>
                    </div>

                    {game.game_players && game.game_players.length > 0 && (
                      <div className='game-players'>
                        <span>Players:</span>
                        <div className='player-list'>
                          {game.game_players.map((player, idx) => (
                            <span key={player.id} className='player-name'>
                              {player.username}
                              {idx < game.game_players.length - 1 && ', '}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className='game-actions'>
                    {canJoinGame(game) ? (
                      <Button onClick={() => handleJoinGame(game.id)}>
                        Join Game
                      </Button>
                    ) : game.status === 'in_progress' ? (
                      <Button disabled>
                        Game in Progress
                      </Button>
                    ) : (
                      <Button disabled>
                        Game Full
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showCreateModal && (
          <Modal onClose={() => !creating && setShowCreateModal(false)}>
            <div className='create-game-modal'>
              <h3>Create New Game</h3>
              <input
                type='text'
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder='Enter game name'
                className='auth-input'
                maxLength={50}
                disabled={creating}
                autoFocus
              />
              <div className='modal-actions'>
                <Button
                  onClick={handleCreateGame}
                  disabled={!newGameName.trim() || creating}
                >
                  {creating ? 'Creating...' : 'Create Game'}
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="secondary"
                  disabled={creating}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}

export default GameLobby