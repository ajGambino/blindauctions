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
CREATE POLICY "Anyone can view games" ON games FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create games" ON games FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Game creators can update their games" ON games FOR UPDATE TO authenticated USING (auth.uid() = created_by);
CREATE POLICY "Game creators can delete their games" ON games FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Create policies for game_players table
CREATE POLICY "Anyone can view game players" ON game_players FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join games" ON game_players FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Players can update their own data" ON game_players FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Players can leave games" ON game_players FOR DELETE TO authenticated USING (auth.uid() = user_id);