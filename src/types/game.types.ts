export interface Country {
  code: string
  name: string
  capital: string
  population: number
  area: number
  continent: string
  flag: string
  shape?: string
  latitude: number
  longitude: number
}

export interface GuessResult {
  guess: string
  distance: number
  direction: number
  proximity: number
  isCorrect: boolean
}

export interface Room {
  id: string
  room_code: string
  host_name: string
  name: string
  status: 'waiting' | 'playing' | 'finished'
  active_round_id?: string
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  room_id: string
  name: string
  total_score: number
  is_host: boolean
  joined_at: string
}

export interface Round {
  id: string
  room_id: string
  round_number: number
  name?: string
  games_per_round: number
  time_limit_seconds: number
  max_attempts_per_game: number
  status: 'waiting' | 'active' | 'completed'
  current_game: number
  created_at: string
  started_at?: string
  completed_at?: string
}

export interface Game {
  id: string
  round_id: string
  game_number: number
  country_code: string
  country_name: string
  country_capital: string
  country_population: number
  country_area: number
  time_limit_seconds?: number
  max_attempts: number
  started_at: string
  started_at_timestamp?: string
  completed_at_timestamp?: string
  ended_at?: string
}

export interface PlayerGuess {
  id: string
  game_id: string
  player_id: string
  guess: string
  is_correct: boolean
  score: number
  distance: number
  direction: number
  proximity: number
  attempt_number: number
  submitted_at: string
}

export interface RoundStanding {
  id: string
  round_id: string
  player_id: string
  round_score: number
  games_completed: number
  games_won: number
  total_attempts: number
  created_at: string
  updated_at: string
}

export interface GameResult {
  id: string
  room_id: string
  player_id: string
  final_score: number
  rank: number
  created_at: string
}

export interface RoomWithPlayers extends Room {
  players: Player[]
  active_round?: Round
}

export interface RoundWithGames extends Round {
  games: Game[]
}

export interface GameWithGuesses extends Game {
  player_guesses: (PlayerGuess & { player: Player })[]
}

export interface RoundStandingWithPlayer extends RoundStanding {
  player: Player
}

export type GameStatus = 'waiting' | 'playing' | 'finished'
export type RoundStatus = 'waiting' | 'active' | 'completed'
export type RoomCreationData = Pick<Room, 'host_name' | 'name'>
export type PlayerJoinData = Pick<Player, 'name'>
export type RoundCreationData = Pick<Round, 'name' | 'games_per_round' | 'time_limit_seconds' | 'max_attempts_per_game'>