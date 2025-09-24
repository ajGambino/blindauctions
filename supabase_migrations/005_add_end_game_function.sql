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