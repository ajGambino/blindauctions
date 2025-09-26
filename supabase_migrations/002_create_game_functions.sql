-- Function to create a new game
CREATE OR REPLACE FUNCTION create_game(
  game_name TEXT,
  max_players_count INTEGER DEFAULT 2
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_game_id UUID;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Create the game
  INSERT INTO games (name, max_players, created_by)
  VALUES (game_name, max_players_count, auth.uid())
  RETURNING id INTO new_game_id;

  RETURN new_game_id;
END;
$$;

-- Function to join a game
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

-- Function to leave a game
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

  -- Remove player from game
  DELETE FROM game_players gp
  WHERE gp.game_id = leave_game.game_id AND gp.user_id = auth.uid();

  -- Update game player count
  UPDATE games
  SET current_players = current_players - 1
  WHERE id = game_id;

  -- If no players left, delete the game
  UPDATE games
  SET status = 'cancelled'
  WHERE id = game_id AND current_players = 0;

  RETURN TRUE;
END;
$$;

-- Function to start a game
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