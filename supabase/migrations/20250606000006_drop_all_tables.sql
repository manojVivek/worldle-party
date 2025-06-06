-- Drop all existing tables and start fresh
-- This is safe since we're in development

-- First drop triggers (before dropping tables)
DROP TRIGGER IF EXISTS games_completion_trigger ON games;

-- Drop functions
DROP FUNCTION IF EXISTS check_game_completion(UUID);
DROP FUNCTION IF EXISTS update_round_standings(UUID);
DROP FUNCTION IF EXISTS check_round_completion(UUID);
DROP FUNCTION IF EXISTS trigger_update_round_standings();

-- Drop all tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS player_guesses CASCADE;
DROP TABLE IF EXISTS round_standings CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS rounds CASCADE;
DROP TABLE IF EXISTS game_results CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;

-- Drop any remaining indexes (these should be dropped automatically with tables, but just in case)
DROP INDEX IF EXISTS idx_rooms_room_code;
DROP INDEX IF EXISTS idx_players_room_id;
DROP INDEX IF EXISTS idx_game_rounds_room_id;
DROP INDEX IF EXISTS idx_player_guesses_round_id;
DROP INDEX IF EXISTS idx_player_guesses_player_id;
DROP INDEX IF EXISTS idx_game_results_room_id;
DROP INDEX IF EXISTS idx_rounds_room_status;
DROP INDEX IF EXISTS idx_rounds_room_number;
DROP INDEX IF EXISTS idx_games_round_number;
DROP INDEX IF EXISTS idx_games_round_status;
DROP INDEX IF EXISTS idx_round_standings_round_player;
DROP INDEX IF EXISTS idx_player_guesses_game_player;