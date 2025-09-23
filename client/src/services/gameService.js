import { supabase } from '../lib/supabase'

export const gameService = {
  // Get all available games
  async getAvailableGames() {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        game_players (
          id,
          username,
          joined_at
        )
      `)
      .in('status', ['waiting', 'in_progress'])
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Create a new game
  async createGame(gameName, maxPlayers = 2) {
    const { data, error } = await supabase.rpc('create_game', {
      game_name: gameName,
      max_players_count: maxPlayers
    })

    if (error) throw error
    return data
  },

  // Join a game
  async joinGame(gameId, username) {
    const { data, error } = await supabase.rpc('join_game', {
      game_id: gameId,
      player_username: username
    })

    if (error) throw error
    return data
  },

  // Leave a game
  async leaveGame(gameId) {
    const { data, error } = await supabase.rpc('leave_game', {
      game_id: gameId
    })

    if (error) throw error
    return data
  },

  // Start a game
  async startGame(gameId) {
    const { data, error } = await supabase.rpc('start_game', {
      game_id: gameId
    })

    if (error) throw error
    return data
  },

  // Get game details
  async getGameDetails(gameId) {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        game_players (
          id,
          user_id,
          username,
          joined_at,
          budget,
          team,
          players_owned
        )
      `)
      .eq('id', gameId)
      .single()

    if (error) throw error
    return data
  },

  // Subscribe to game changes
  subscribeToGames(callback) {
    return supabase
      .channel('games_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games'
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players'
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to specific game
  subscribeToGame(gameId, callback) {
    return supabase
      .channel(`game_${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        callback
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `game_id=eq.${gameId}`
        },
        callback
      )
      .subscribe()
  },

  // Update game state (for game progress)
  async updateGameState(gameId, gameState) {
    const { data, error } = await supabase
      .from('games')
      .update({ game_state: gameState })
      .eq('id', gameId)

    if (error) throw error
    return data
  },

  // Complete a game
  async completeGame(gameId) {
    const { data, error } = await supabase
      .from('games')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', gameId)

    if (error) throw error
    return data
  }
}