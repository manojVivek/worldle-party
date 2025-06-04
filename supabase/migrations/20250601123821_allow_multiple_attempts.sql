-- Remove the unique constraint that prevents multiple guesses per player per round
-- This is needed for Worldle-style gameplay where players can make up to 6 attempts

ALTER TABLE player_guesses 
DROP CONSTRAINT IF EXISTS player_guesses_round_id_player_id_key;

-- Add a new unique constraint that allows multiple attempts but prevents duplicate attempt numbers
ALTER TABLE player_guesses 
ADD CONSTRAINT player_guesses_round_player_attempt_unique 
UNIQUE (round_id, player_id, attempt_number);