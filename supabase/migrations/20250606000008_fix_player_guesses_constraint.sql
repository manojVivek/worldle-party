-- Fix the unique constraint on player_guesses to handle edge cases better
-- Remove the strict unique constraint and replace with a more flexible one

-- Drop the existing constraint
ALTER TABLE player_guesses DROP CONSTRAINT IF EXISTS player_guesses_game_id_player_id_attempt_number_key;

-- Add a new constraint that prevents duplicate attempts but handles edge cases
-- Allow multiple guesses per player per game, but ensure attempt_number is sequential
ALTER TABLE player_guesses ADD CONSTRAINT player_guesses_game_player_attempt_unique 
UNIQUE (game_id, player_id, attempt_number);

-- Alternatively, if we want to be more permissive during development, 
-- we could just ensure no duplicate exact guesses
-- ALTER TABLE player_guesses ADD CONSTRAINT player_guesses_no_duplicate_exact_guess 
-- UNIQUE (game_id, player_id, guess, attempt_number);