-- Fix ambiguous column reference in join_game function
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

  -- Check if game is available
  IF game_status != 'waiting' THEN
    RAISE EXCEPTION 'Game is not available for joining';
  END IF;

  -- Check if game is full
  IF current_player_count >= max_players_count THEN
    RAISE EXCEPTION 'Game is full';
  END IF;

  -- Check if user is already in the game (fixed ambiguous column reference)
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

-- Also fix the leave_game function for consistency
CREATE OR REPLACE FUNCTION leave_game(game_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Remove player from game (fixed ambiguous column reference)
  DELETE FROM game_players gp
  WHERE gp.game_id = leave_game.game_id AND gp.user_id = auth.uid();

  -- Update game player count
  UPDATE games
  SET current_players = current_players - 1
  WHERE id = game_id;

  -- If no players left, cancel the game
  UPDATE games
  SET status = 'cancelled'
  WHERE id = game_id AND current_players = 0;

  RETURN TRUE;
END;
$$;