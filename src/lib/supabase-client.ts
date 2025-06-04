import { supabase } from './supabase'
import { 
  Room, 
  Player, 
  GameRound, 
  PlayerGuess, 
  Country 
} from '@/types/game.types'
import { generateRoomCode, getWorldleSettings } from './game'

export class SupabaseClient {
  public supabase = supabase
  
  async createRoom(hostName: string): Promise<Room> {
    const roomCode = generateRoomCode()
    
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_code: roomCode,
        host_name: hostName,
        status: 'waiting'
      })
      .select()
      .single()
    
    if (error) throw error
    return data as Room
  }

  async joinRoom(roomCode: string, playerName: string): Promise<{ room: Room; player: Player }> {
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('*')
      .eq('room_code', roomCode.toUpperCase())
      .single()
    
    if (roomError) throw new Error('Room not found')
    
    const { data: existingPlayer } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .eq('name', playerName)
      .single()
    
    if (existingPlayer) {
      throw new Error('Player name already taken in this room')
    }
    
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        room_id: room.id,
        name: playerName,
        is_host: room.host_name === playerName
      })
      .select()
      .single()
    
    if (playerError) throw playerError
    
    return { room: room as Room, player: player as Player }
  }

  async getRoomWithPlayers(roomId: string) {
    const { data, error } = await supabase
      .from('rooms')
      .select(`
        *,
        players (*)
      `)
      .eq('id', roomId)
      .single()
    
    if (error) throw error
    return data
  }

  async startGame(roomId: string): Promise<void> {
    const { error } = await supabase
      .from('rooms')
      .update({ 
        status: 'playing',
        current_round: 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
    
    if (error) throw error
  }

  async createGameRound(roomId: string, roundNumber: number, country: Country): Promise<GameRound> {
    const { data, error } = await supabase
      .from('game_rounds')
      .insert({
        room_id: roomId,
        round_number: roundNumber,
        country_code: country.code,
        country_name: country.name,
        country_capital: country.capital,
        country_population: country.population,
        country_area: country.area
      })
      .select()
      .single()
    
    if (error) throw error
    return data as GameRound
  }

  async submitGuess(
    roundId: string, 
    playerId: string, 
    guess: string, 
    isCorrect: boolean, 
    score: number,
    distance: number,
    direction: number,
    proximity: number,
    attemptNumber: number
  ): Promise<PlayerGuess> {
    const { data, error } = await supabase
      .from('player_guesses')
      .insert({
        round_id: roundId,
        player_id: playerId,
        guess,
        is_correct: isCorrect,
        score,
        distance,
        direction,
        proximity,
        attempt_number: attemptNumber
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Only update total score if the guess is correct
    if (isCorrect) {
      await supabase
        .from('players')
        .update({
          total_score: (await this.getPlayerScore(playerId)) + score
        })
        .eq('id', playerId)
    }
    
    return data as PlayerGuess
  }

  async getPlayerScore(playerId: string): Promise<number> {
    const { data, error } = await supabase
      .from('players')
      .select('total_score')
      .eq('id', playerId)
      .single()
    
    if (error) return 0
    return data.total_score || 0
  }

  async getCurrentRound(roomId: string): Promise<GameRound | null> {
    const { data: room } = await supabase
      .from('rooms')
      .select('current_round')
      .eq('id', roomId)
      .single()
    
    if (!room?.current_round) return null
    
    const { data, error } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('room_id', roomId)
      .eq('round_number', room.current_round)
      .single()
    
    if (error) return null
    return data as GameRound
  }

  async getRoundGuesses(roundId: string) {
    const { data, error } = await supabase
      .from('player_guesses')
      .select(`
        *,
        player:players (*)
      `)
      .eq('round_id', roundId)
      .order('submitted_at', { ascending: true })
    
    if (error) throw error
    return data
  }

  async getPlayerAttempts(roundId: string, playerId: string): Promise<PlayerGuess[]> {
    const { data, error } = await supabase
      .from('player_guesses')
      .select('*')
      .eq('round_id', roundId)
      .eq('player_id', playerId)
      .order('attempt_number', { ascending: true })
    
    if (error) throw error
    return data as PlayerGuess[]
  }

  async hasPlayerCompletedRound(roundId: string, playerId: string): Promise<{ completed: boolean; attempts: number; won: boolean }> {
    const attempts = await this.getPlayerAttempts(roundId, playerId)
    const hasWon = attempts.some(attempt => attempt.is_correct)
    const { maxAttempts } = getWorldleSettings()
    
    return {
      completed: hasWon || attempts.length >= maxAttempts,
      attempts: attempts.length,
      won: hasWon
    }
  }

  async nextRound(roomId: string): Promise<void> {
    const { data: room } = await supabase
      .from('rooms')
      .select('current_round, total_rounds')
      .eq('id', roomId)
      .single()
    
    if (!room) return
    
    const nextRound = room.current_round + 1
    const status = nextRound > room.total_rounds ? 'finished' : 'playing'
    
    const { error } = await supabase
      .from('rooms')
      .update({
        current_round: nextRound,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
    
    if (error) throw error
  }

  subscribeToRoom(roomId: string, callback: (payload: unknown) => void) {
    return supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, callback)
      .subscribe()
  }

  subscribeToPlayers(roomId: string, callback: (payload: unknown) => void) {
    return supabase
      .channel(`players:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`
      }, callback)
      .subscribe()
  }

  subscribeToGuesses(roundId: string, callback: (payload: unknown) => void) {
    return supabase
      .channel(`guesses:${roundId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_guesses',
        filter: `round_id=eq.${roundId}`
      }, callback)
      .subscribe()
  }
}

export const supabaseClient = new SupabaseClient()