-- Add game settings to the games table and update create_game function

-- Update the settings column to have a proper default with buy-in information
ALTER TABLE games
ALTER COLUMN settings SET DEFAULT '{"budget": 100, "buyIn": 100, "positions": {"QB": 1, "RB": 1, "WR": 2, "TE": 1}}';

-- Update the create_game function to accept game settings
CREATE OR REPLACE FUNCTION create_game(
  game_name TEXT,
  game_settings JSONB DEFAULT '{"buyIn": 100, "maxPlayers": 2}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_game_id UUID;
  max_players_count INTEGER;
  buy_in_amount INTEGER;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Extract settings
  max_players_count := COALESCE((game_settings->>'maxPlayers')::INTEGER, 2);
  buy_in_amount := COALESCE((game_settings->>'buyIn')::INTEGER, 100);

  -- Validate settings
  IF max_players_count < 2 OR max_players_count > 6 THEN
    RAISE EXCEPTION 'Max players must be between 2 and 6';
  END IF;

  IF buy_in_amount NOT IN (100, 300, 500) THEN
    RAISE EXCEPTION 'Buy-in must be 100, 300, or 500';
  END IF;

  -- Create the game with settings
  INSERT INTO games (
    name,
    max_players,
    created_by,
    settings
  )
  VALUES (
    game_name,
    max_players_count,
    auth.uid(),
    jsonb_build_object(
      'budget', buy_in_amount,
      'buyIn', buy_in_amount,
      'maxPlayers', max_players_count,
      'positions', jsonb_build_object(
        'QB', 1,
        'RB', 1,
        'WR', 2,
        'TE', 1
      )
    )
  )
  RETURNING id INTO new_game_id;

  RETURN new_game_id;
END;
$$;

-- Also update the game_players table to use the game's buy-in as the starting budget
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
  starting_budget INTEGER;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Get game info including settings
  SELECT
    current_players,
    max_players,
    status,
    COALESCE((settings->>'budget')::INTEGER, 100)
  INTO
    current_player_count,
    max_players_count,
    game_status,
    starting_budget
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

  -- Add player to game with the correct starting budget
  INSERT INTO game_players (game_id, user_id, username, budget)
  VALUES (game_id, auth.uid(), player_username, starting_budget);

  -- Update game player count
  UPDATE games
  SET current_players = current_players + 1
  WHERE id = game_id;

  RETURN TRUE;
END;
$$;