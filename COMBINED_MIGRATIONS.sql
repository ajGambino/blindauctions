-- ============================================
-- COMBINED MIGRATIONS FOR SUPABASE
-- Copy and paste this entire file into Supabase SQL Editor
-- ============================================

-- ============================================
-- MIGRATION 001: Create Tables
-- ============================================

-- Create games table to track multiple auction instances
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  current_players INTEGER DEFAULT 0,
  max_players INTEGER DEFAULT 2,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{"budget": 100, "positions": {"QB": 1, "RB": 1, "WR": 2, "TE": 1}}',
  game_state JSONB DEFAULT '{}'
);

-- Create game_players table to track which users are in which games
CREATE TABLE IF NOT EXISTS game_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  budget INTEGER DEFAULT 100,
  team JSONB DEFAULT '{"QB": null, "RB": null, "WR": [], "TE": null}',
  players_owned INTEGER DEFAULT 0,
  UNIQUE(game_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at);
CREATE INDEX IF NOT EXISTS idx_game_players_game_id ON game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_players_user_id ON game_players(user_id);

-- Enable Row Level Security
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;

-- Create policies for games table
DROP POLICY IF EXISTS "Anyone can view games" ON games;
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create games" ON games;
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Game creators can update their games" ON games;
CREATE POLICY "Game creators can update their games" ON games FOR UPDATE TO authenticated USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Game creators can delete their games" ON games;
CREATE POLICY "Game creators can delete their games" ON games FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Create policies for game_players table
DROP POLICY IF EXISTS "Anyone can view game players" ON game_players;
CREATE POLICY "Anyone can view game players" ON game_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can join games" ON game_players;
CREATE POLICY "Authenticated users can join games" ON game_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Players can update their own data" ON game_players;
CREATE POLICY "Players can update their own data" ON game_players FOR UPDATE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Players can leave games" ON game_players;
CREATE POLICY "Players can leave games" ON game_players FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- ============================================
-- MIGRATION 002: Create Game Functions
-- ============================================

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


-- ============================================
-- MIGRATION 003: Fix Ambiguous Columns
-- ============================================

-- Function to join a game (with fixed ambiguous column references)
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

-- Function to leave a game (with fixed ambiguous column reference)
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


-- ============================================
-- MIGRATION 004: Add Game Settings
-- ============================================

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

-- Update join_game to use the game's buy-in as the starting budget
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


-- ============================================
-- MIGRATION 005: Add End Game Function
-- ============================================

-- Function to end a game
CREATE OR REPLACE FUNCTION end_game(game_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the game status to completed
  UPDATE games
  SET status = 'completed', completed_at = NOW()
  WHERE id = game_id;

  -- Check if the update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Game not found';
  END IF;

  RETURN TRUE;
END;
$$;


-- ============================================
-- VERIFICATION QUERIES (Optional - comment out if not needed)
-- ============================================

-- Check if tables were created
SELECT 'Tables Created!' as status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('games', 'game_players');

-- Check if functions were created
SELECT 'Functions Created!' as status;
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('create_game', 'join_game', 'leave_game', 'start_game', 'end_game');
