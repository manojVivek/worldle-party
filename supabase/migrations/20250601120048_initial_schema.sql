-- Database schema for Worldle Multiplayer

-- Rooms table
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_name VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 10,
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

-- Game rounds table
CREATE TABLE game_rounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  country_code VARCHAR(2) NOT NULL,
  country_name VARCHAR(100) NOT NULL,
  country_capital VARCHAR(100),
  country_population INTEGER,
  country_area NUMERIC,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id, round_number)
);

-- Player guesses table
CREATE TABLE player_guesses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  round_id UUID REFERENCES game_rounds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  guess VARCHAR(100) NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(round_id, player_id)
);

-- Game results table (final results for each room)
CREATE TABLE game_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  final_score INTEGER NOT NULL,
  rank INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_rooms_room_code ON rooms(room_code);
CREATE INDEX idx_players_room_id ON players(room_id);
CREATE INDEX idx_game_rounds_room_id ON game_rounds(room_id);
CREATE INDEX idx_player_guesses_round_id ON player_guesses(round_id);
CREATE INDEX idx_player_guesses_player_id ON player_guesses(player_id);
CREATE INDEX idx_game_results_room_id ON game_results(room_id);

-- Row Level Security (RLS) policies
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_guesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_results ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (can be refined later)
CREATE POLICY "Allow all operations on rooms" ON rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on game_rounds" ON game_rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations on player_guesses" ON player_guesses FOR ALL USING (true);
CREATE POLICY "Allow all operations on game_results" ON game_results FOR ALL USING (true);