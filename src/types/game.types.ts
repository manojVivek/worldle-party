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
  current_round: number
  total_rounds: number
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

export interface GameRound {
  id: string
  room_id: string
  round_number: number
  country_code: string
  country_name: string
  country_capital: string
  country_population: number
  country_area: number
  started_at: string
  ended_at?: string
}

export interface PlayerGuess {
  id: string
  round_id: string
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
}

export interface RoundWithGuesses extends GameRound {
  player_guesses: (PlayerGuess & { player: Player })[]
}

export type GameStatus = 'waiting' | 'playing' | 'finished'
export type RoomCreationData = Pick<Room, 'host_name' | 'name'>
export type PlayerJoinData = Pick<Player, 'name'>