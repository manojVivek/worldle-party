-- Add Worldle-specific columns to player_guesses table
ALTER TABLE player_guesses 
ADD COLUMN distance INTEGER DEFAULT 0,
ADD COLUMN direction NUMERIC DEFAULT 0,
ADD COLUMN proximity INTEGER DEFAULT 0,
ADD COLUMN attempt_number INTEGER DEFAULT 1;

-- Add max_attempts column to game_rounds
ALTER TABLE game_rounds
ADD COLUMN max_attempts INTEGER DEFAULT 6;

-- Update existing records to have default values
UPDATE player_guesses 
SET distance = 0, direction = 0, proximity = 0, attempt_number = 1 
WHERE distance IS NULL;