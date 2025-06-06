import { supabase } from './supabase'
import { 
  Room, 
  Player, 
  Round,
  Game, 
  PlayerGuess, 
  RoundStanding,
  Country,
  RoundCreationData
} from '@/types/game.types'
import { generateRoomCode, getWorldleSettings } from './game'

export class SupabaseClient {
  public supabase = supabase
  
  async createRoom(hostName: string, roomName?: string): Promise<Room> {
    const roomCode = generateRoomCode()
    
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        room_code: roomCode,
        host_name: hostName,
        name: roomName || `${hostName}'s Room`,
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
    
    // First, check if the current browser session already has a player in this room
    const existingPlayerId = localStorage.getItem('playerId')
    if (existingPlayerId) {
      const { data: existingSessionPlayer, error: sessionError } = await supabase
        .from('players')
        .select('*')
        .eq('id', existingPlayerId)
        .eq('room_id', room.id)
        .maybeSingle()
      
      if (!sessionError && existingSessionPlayer) {
        // Player already exists in this room from this browser session
        return { room: room as Room, player: existingSessionPlayer as Player }
      }
    }
    
    // Check if the player name is already taken by someone else
    const { data: existingPlayer, error: nameError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id)
      .eq('name', playerName)
      .maybeSingle()
    
    if (!nameError && existingPlayer) {
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
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)
    
    if (error) throw error
  }

  // Round management methods
  async createRound(roomId: string, roundData: Partial<RoundCreationData> = {}): Promise<Round> {
    const { data: existingRounds } = await supabase
      .from('rounds')
      .select('round_number')
      .eq('room_id', roomId)
      .order('round_number', { ascending: false })
      .limit(1)
    
    const nextRoundNumber = existingRounds && existingRounds.length > 0 
      ? existingRounds[0].round_number + 1 
      : 1
    
    const { data, error } = await supabase
      .from('rounds')
      .insert({
        room_id: roomId,
        round_number: nextRoundNumber,
        name: roundData.name || `Round ${nextRoundNumber}`,
        games_per_round: roundData.games_per_round || 10,
        time_limit_seconds: roundData.time_limit_seconds || 60,
        max_attempts_per_game: roundData.max_attempts_per_game || 5,
        status: 'waiting'
      })
      .select()
      .single()
    
    if (error) throw error
    return data as Round
  }

  async startRound(roundId: string): Promise<void> {
    const { error } = await supabase
      .from('rounds')
      .update({ 
        status: 'active',
        started_at: new Date().toISOString(),
        current_game: 1
      })
      .eq('id', roundId)
    
    if (error) throw error

    // Get round info for creating the first game
    const { data: round } = await supabase
      .from('rounds')
      .select('room_id')
      .eq('id', roundId)
      .single()
    
    if (round) {
      // Update room to set this as active round
      await supabase
        .from('rooms')
        .update({ 
          active_round_id: roundId,
          status: 'playing'
        })
        .eq('id', round.room_id)
      
      // Create the first game
      const { getRandomCountries } = await import('../data/countries')
      const countries = getRandomCountries(1)
      await this.createGame(roundId, 1, countries[0])
    }
  }

  async createGame(roundId: string, gameNumber: number, country: Country): Promise<Game> {
    const { data, error } = await supabase
      .from('games')
      .insert({
        round_id: roundId,
        game_number: gameNumber,
        country_code: country.code,
        country_name: country.name,
        country_capital: country.capital,
        country_population: country.population,
        country_area: country.area,
        started_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create game:', error)
      throw error
    }
    return data as Game
  }

  async submitGuess(
    gameId: string, 
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
        game_id: gameId,
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

  async getActiveRound(roomId: string): Promise<Round | null> {
    const { data: room } = await supabase
      .from('rooms')
      .select('active_round_id')
      .eq('id', roomId)
      .single()
    
    if (!room?.active_round_id) return null
    
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('id', room.active_round_id)
      .single()
    
    if (error) return null
    return data as Round
  }

  async getCurrentGame(roundId: string): Promise<Game | null> {
    const { data: round } = await supabase
      .from('rounds')
      .select('current_game')
      .eq('id', roundId)
      .single()
    
    if (!round || round.current_game === 0) return null
    
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('round_id', roundId)
      .eq('game_number', round.current_game)
      .single()
    
    if (error) return null
    return data as Game
  }

  async getGameGuesses(gameId: string) {
    const { data, error } = await supabase
      .from('player_guesses')
      .select(`
        *,
        player:players (*)
      `)
      .eq('game_id', gameId)
      .order('submitted_at', { ascending: true })
    
    if (error) throw error
    return data
  }

  async getPlayerAttempts(gameId: string, playerId: string): Promise<PlayerGuess[]> {
    const { data, error } = await supabase
      .from('player_guesses')
      .select('*')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .order('attempt_number', { ascending: true })
    
    if (error) throw error
    return data as PlayerGuess[]
  }

  async hasPlayerCompletedGame(gameId: string, playerId: string): Promise<{ completed: boolean; attempts: number; won: boolean }> {
    const attempts = await this.getPlayerAttempts(gameId, playerId)
    const hasWon = attempts.some(attempt => attempt.is_correct)
    
    // Get max attempts from the game
    const { data: game } = await supabase
      .from('games')
      .select('max_attempts')
      .eq('id', gameId)
      .single()
    
    const maxAttempts = game?.max_attempts || 5
    
    return {
      completed: hasWon || attempts.length >= maxAttempts,
      attempts: attempts.length,
      won: hasWon
    }
  }

  async getRoundStandings(roundId: string): Promise<RoundStanding[]> {
    const { data, error } = await supabase
      .from('round_standings')
      .select(`
        *,
        player:players (*)
      `)
      .eq('round_id', roundId)
      .order('round_score', { ascending: false })
    
    if (error) throw error
    return data as RoundStanding[]
  }

  async markGameCompleted(gameId: string): Promise<void> {
    await supabase
      .from('games')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', gameId)
  }

  async nextGame(roundId: string): Promise<Game | null> {
    const { data: round } = await supabase
      .from('rounds')
      .select('current_game, games_per_round')
      .eq('id', roundId)
      .single()
    
    if (!round) return null
    
    // Mark current game as completed
    if (round.current_game > 0) {
      const { data: currentGame } = await supabase
        .from('games')
        .select('id')
        .eq('round_id', roundId)
        .eq('game_number', round.current_game)
        .single()
      
      if (currentGame) {
        await this.markGameCompleted(currentGame.id)
      }
    }
    
    const nextGameNumber = round.current_game + 1
    
    if (nextGameNumber > round.games_per_round) {
      // Round is complete
      await supabase
        .from('rounds')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', roundId)
      return null
    }
    
    // Update current game number
    await supabase
      .from('rounds')
      .update({ current_game: nextGameNumber })
      .eq('id', roundId)
    
    // Return the next game if it exists
    const { data: nextGame } = await supabase
      .from('games')
      .select('*')
      .eq('round_id', roundId)
      .eq('game_number', nextGameNumber)
      .single()
    
    return nextGame as Game || null
  }

  async completeRound(roundId: string): Promise<void> {
    const { error } = await supabase
      .from('rounds')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', roundId)
    
    if (error) throw error
    
    // Clear active round from room
    const { data: round } = await supabase
      .from('rounds')
      .select('room_id')
      .eq('id', roundId)
      .single()
    
    if (round) {
      await supabase
        .from('rooms')
        .update({ active_round_id: null })
        .eq('id', round.room_id)
    }
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

  subscribeToRoomUpdates(roomId: string, callback: (payload: unknown) => void) {
    return supabase
      .channel(`room-updates-${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'players',
        filter: `room_id=eq.${roomId}`
      }, callback)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, callback)
      .subscribe()
  }

  subscribeToGuesses(gameId: string, callback: (payload: unknown) => void) {
    return supabase
      .channel(`guesses:${gameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'player_guesses',
        filter: `game_id=eq.${gameId}`
      }, callback)
      .subscribe()
  }

  subscribeToRounds(roomId: string, callback: (payload: unknown) => void) {
    return supabase
      .channel(`rounds:${roomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rounds',
        filter: `room_id=eq.${roomId}`
      }, callback)
      .subscribe()
  }

  subscribeToGames(roundId: string, callback: (payload: unknown) => void) {
    return supabase
      .channel(`games:${roundId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `round_id=eq.${roundId}`
      }, callback)
      .subscribe()
  }
}

export const supabaseClient = new SupabaseClient()