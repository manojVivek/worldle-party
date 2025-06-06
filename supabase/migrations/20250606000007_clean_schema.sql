-- Clean consolidated schema for WorldleParty
-- Hierarchical structure: Room -> Rounds -> Games -> Guesses

-- Rooms table - contains multiple rounds
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_name VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL DEFAULT 'WorldleParty Room',
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  active_round_id UUID DEFAULT NULL, -- References current active round
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  total_score INTEGER DEFAULT 0,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, name)
);

-- Rounds table - multiple rounds per room
CREATE TABLE rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  name VARCHAR(100) DEFAULT NULL,
  games_per_round INTEGER DEFAULT 10,
  time_limit_seconds INTEGER DEFAULT 60,
  max_attempts_per_game INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  current_game INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(room_id, round_number)
);

-- Games table - multiple games per round
CREATE TABLE games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  game_number INTEGER NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  country_capital VARCHAR(100),
  country_population INTEGER,
  country_area NUMERIC,
  time_limit_seconds INTEGER DEFAULT NULL, -- can override round default
  max_attempts INTEGER DEFAULT 5,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  completed_at_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  UNIQUE(round_id, game_number)
);

-- Player guesses table - multiple guesses per player per game
CREATE TABLE player_guesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  guess VARCHAR(100) NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  distance INTEGER DEFAULT 0,
  direction NUMERIC DEFAULT 0,
  proximity INTEGER DEFAULT 0,
  attempt_number INTEGER DEFAULT 1,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(game_id, player_id, attempt_number)
);

-- Round standings table - track cumulative scores per round
CREATE TABLE round_standings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  round_score INTEGER DEFAULT 0,
  games_completed INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, player_id)
);

-- Game results table (final results for each room)
CREATE TABLE game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  final_score INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for active_round_id after rounds table exists
ALTER TABLE rooms ADD CONSTRAINT fk_rooms_active_round 
  FOREIGN KEY (active_round_id) REFERENCES rounds(id) ON DELETE SET NULL;

-- Indexes for better performance
CREATE INDEX idx_rooms_room_code ON rooms(room_code);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_rounds_room_status ON rounds(room_id, status);
CREATE INDEX idx_rounds_room_number ON rounds(room_id, round_number);
CREATE INDEX idx_games_round_number ON games(round_id, game_number);
CREATE INDEX idx_games_round_status ON games(round_id, started_at, ended_at);
CREATE INDEX idx_player_guesses_game_player ON player_guesses(game_id, player_id);
CREATE INDEX idx_player_guesses_game_attempt ON player_guesses(game_id, attempt_number);
CREATE INDEX idx_round_standings_round_player ON round_standings(round_id, player_id);
CREATE INDEX idx_game_results_room_id ON game_results(room_id);

-- Helper functions
CREATE OR REPLACE FUNCTION check_game_completion(game_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_players INTEGER;
    completed_players INTEGER;
    round_uuid UUID;
    room_uuid UUID;
BEGIN
    -- Get the round_id and room_id for this game
    SELECT g.round_id, r.room_id INTO round_uuid, room_uuid
    FROM games g
    JOIN rounds r ON g.round_id = r.id
    WHERE g.id = game_uuid;
    
    -- Count total players in the room
    SELECT COUNT(*) INTO total_players
    FROM players p
    WHERE p.room_id = room_uuid;
    
    -- Count players who have completed this game (made max attempts or guessed correctly)
    SELECT COUNT(DISTINCT pg.player_id) INTO completed_players
    FROM player_guesses pg
    WHERE pg.game_id = game_uuid
    AND (
        pg.is_correct = true 
        OR pg.attempt_number >= (SELECT max_attempts FROM games WHERE id = game_uuid)
    );
    
    RETURN completed_players >= total_players;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_round_standings(round_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Update round standings with cumulative scores from all games in the round
    INSERT INTO round_standings (round_id, player_id, round_score, games_completed, games_won, total_attempts)
    SELECT 
        round_uuid,
        p.id as player_id,
        COALESCE(SUM(CASE WHEN pg.is_correct THEN pg.score ELSE 0 END), 0) as round_score,
        COUNT(DISTINCT g.id) as games_completed,
        COUNT(DISTINCT CASE WHEN pg.is_correct THEN g.id END) as games_won,
        COUNT(pg.id) as total_attempts
    FROM players p
    CROSS JOIN rounds r
    LEFT JOIN games g ON g.round_id = r.id
    LEFT JOIN player_guesses pg ON pg.game_id = g.id AND pg.player_id = p.id
    WHERE r.id = round_uuid
    AND p.room_id = r.room_id
    GROUP BY p.id
    ON CONFLICT (round_id, player_id) 
    DO UPDATE SET 
        round_score = EXCLUDED.round_score,
        games_completed = EXCLUDED.games_completed,
        games_won = EXCLUDED.games_won,
        total_attempts = EXCLUDED.total_attempts,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_round_completion(round_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_games INTEGER;
    completed_games INTEGER;
BEGIN
    -- Get total games in this round
    SELECT games_per_round INTO total_games
    FROM rounds
    WHERE id = round_uuid;
    
    -- Count completed games
    SELECT COUNT(*) INTO completed_games
    FROM games g
    WHERE g.round_id = round_uuid
    AND g.ended_at IS NOT NULL;
    
    RETURN completed_games >= total_games;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update round standings when a game completes
CREATE OR REPLACE FUNCTION trigger_update_round_standings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update round standings when a game ends
    IF NEW.ended_at IS NOT NULL AND (OLD.ended_at IS NULL OR OLD.ended_at != NEW.ended_at) THEN
        PERFORM update_round_standings(NEW.round_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_completion_trigger
    AFTER UPDATE ON games
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_round_standings();

-- Row Level Security (RLS) policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be refined later)
CREATE POLICY "Allow all operations on rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on rounds" ON rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations on games" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations on player_guesses" ON player_guesses FOR ALL USING (true);
CREATE POLICY "Allow all operations on round_standings" ON round_standings FOR ALL USING (true);
CREATE POLICY "Allow all operations on game_results" ON game_results FOR ALL USING (true);

-- Comments for documentation
COMMENT ON TABLE rooms IS 'Game rooms that contain multiple rounds';
COMMENT ON TABLE players IS 'Players in each room';
COMMENT ON TABLE rounds IS 'Multiple rounds per room with custom settings';
COMMENT ON TABLE games IS 'Individual games within rounds (10 games per round by default)';
COMMENT ON TABLE player_guesses IS 'Player guesses for each game (up to 5 attempts per game)';
COMMENT ON TABLE round_standings IS 'Cumulative scores and stats per round';
COMMENT ON TABLE game_results IS 'Final game results and rankings';