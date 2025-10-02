-- Run this in your Supabase SQL editor to fix disconnection and game start issues
-- This allows the server to start games automatically when they reach max players
-- AND allows players to rejoin in-progress games

-- Fix 1: Allow server to start games automatically
CREATE OR REPLACE FUNCTION start_game(game_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_player_count INTEGER;
  max_players_count INTEGER;
BEGIN
  -- Get game info
  SELECT current_players, max_players
  INTO current_player_count, max_players_count
  FROM games
  WHERE id = game_id;

  -- Check if game exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  -- Check if enough players
  IF current_player_count < max_players_count THEN
    RAISE EXCEPTION 'Not enough players to start game';
  END IF;

  -- Start the game
  UPDATE games
  SET status = 'in_progress', started_at = NOW()
  WHERE id = game_id;

  RETURN TRUE;
END;
$$;

-- Fix 2: Allow players to rejoin in-progress games
CREATE OR REPLACE FUNCTION join_game(
  game_id UUID,
  player_username TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_player_count INTEGER;
  max_players_count INTEGER;
  game_status TEXT;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get game info
  SELECT current_players, max_players, status
  INTO current_player_count, max_players_count, game_status
  FROM games
  WHERE id = game_id;

  -- Check if game exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  -- Check if game is available for new players
  IF game_status != 'waiting' AND game_status != 'in_progress' THEN
    RAISE EXCEPTION 'Game is not available for joining';
  END IF;

  -- For in_progress games, check if user was already a player (reconnection)
  IF game_status = 'in_progress' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM game_players gp
      WHERE gp.game_id = join_game.game_id AND gp.user_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Cannot join in-progress game - player was not in this game';
    END IF;
    -- If user was already in the game, allow reconnection (skip other checks)
    RETURN TRUE;
  END IF;

  -- Check if game is full
  IF current_player_count >= max_players_count THEN
    RAISE EXCEPTION 'Game is full';
  END IF;

  -- Check if user is already in the game
  IF EXISTS (
    SELECT 1
    FROM game_players gp
    WHERE gp.game_id = join_game.game_id AND gp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User already in game';
  END IF;

  -- Add player to game
  INSERT INTO game_players (game_id, user_id, username)
  VALUES (game_id, auth.uid(), player_username);

  -- Update game player count
  UPDATE games
  SET current_players = current_players + 1
  WHERE id = game_id;

  RETURN TRUE;
END;
$$;