'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { Room, Player, GameRound, Country, PlayerGuess } from '@/types/game.types'
import { getRandomCountries, getCountryByName, searchCountries, highlightSearchTerm } from '@/data/countries'
import { evaluateGuess, calculateWorldleScore, getDirectionArrow, formatDistance, getProximityColor, getWorldleSettings } from '@/lib/game'
import CountryShape from '@/components/CountryShape'

export default function GamePage() {
  const { roomCode } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null)
  const [currentCountry, setCurrentCountry] = useState<Country | null>(null)
  const [guess, setGuess] = useState('')
  const [suggestions, setSuggestions] = useState<Country[]>([])
  const [playerAttempts, setPlayerAttempts] = useState<PlayerGuess[]>([])
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isNextRoundLoading, setIsNextRoundLoading] = useState(false)
  const [roundStatus, setRoundStatus] = useState<{ completed: boolean; attempts: number; won: boolean }>({ completed: false, attempts: 0, won: false })
  const [allPlayersStatus, setAllPlayersStatus] = useState<Record<string, boolean>>({})
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { maxAttempts } = getWorldleSettings()

  useEffect(() => {
    const playerId = localStorage.getItem('playerId')
    setCurrentPlayerId(playerId)

    if (!playerId) {
      router.push('/')
      return
    }

    loadGameData()
  }, [roomCode, router])

  useEffect(() => {
    if (guess.length > 0) {
      const guessedCountries = playerAttempts.map(attempt => attempt.guess)
      const results = searchCountries(guess, guessedCountries)
      setSuggestions(results)
      setShowDropdown(results.length > 0)
      setSelectedSuggestionIndex(-1)
    } else {
      setSuggestions([])
      setShowDropdown(false)
      setSelectedSuggestionIndex(-1)
    }
  }, [guess, playerAttempts])

  const loadGameData = async () => {
    try {
      const { data: rooms } = await supabaseClient.supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single()

      if (!rooms) {
        router.push('/')
        return
      }

      const { data: playersData } = await supabaseClient.supabase
        .from('players')
        .select('*')
        .eq('room_id', rooms.id)
        .order('total_score', { ascending: false })

      const round = await supabaseClient.getCurrentRound(rooms.id)
      
      if (round) {
        const country = getCountryByName(round.country_name)
        setCurrentCountry(country || null)
        setCurrentRound(round)
        
        if (currentPlayerId) {
          const attempts = await supabaseClient.getPlayerAttempts(round.id, currentPlayerId)
          setPlayerAttempts(attempts)
          
          const status = await supabaseClient.hasPlayerCompletedRound(round.id, currentPlayerId)
          setRoundStatus(status)

          // Check status for all players
          const playersStatusMap: Record<string, boolean> = {}
          for (const player of playersData || []) {
            const playerStatus = await supabaseClient.hasPlayerCompletedRound(round.id, player.id)
            playersStatusMap[player.id] = playerStatus.completed
          }
          setAllPlayersStatus(playersStatusMap)
        }
      }

      setRoom(rooms)
      setPlayers(playersData || [])
      setLoading(false)

      if (rooms.status === 'finished') {
        router.push(`/results/${rooms.room_code}`)
      }
      
      // Auto-focus input when round loads and not completed
      if (round && !loading && inputRef.current && !roundStatus.completed) {
        setTimeout(() => inputRef.current?.focus(), 200)
      }

    } catch (err) {
      console.error('Failed to load game data:', err)
      setLoading(false)
    }
  }

  const handleSubmitGuess = async (selectedCountry: string) => {
    if (!currentRound || !currentCountry || !currentPlayerId || roundStatus.completed || isSubmitting) return

    const guessedCountry = getCountryByName(selectedCountry)
    if (!guessedCountry) return

    setIsSubmitting(true)

    try {
      const guessResult = evaluateGuess(guessedCountry, currentCountry)
      const attemptNumber = playerAttempts.length + 1
      const score = calculateWorldleScore(attemptNumber, guessResult.isCorrect)

      await supabaseClient.submitGuess(
        currentRound.id,
        currentPlayerId,
        selectedCountry,
        guessResult.isCorrect,
        score,
        guessResult.distance,
        guessResult.direction,
        guessResult.proximity,
        attemptNumber
      )
      
      setGuess('')
      setSuggestions([])
      setShowDropdown(false)
      setSelectedSuggestionIndex(-1)
      await loadGameData()
      
      // Focus input for next attempt (with a small delay to ensure the UI has updated)
      setTimeout(() => {
        if (inputRef.current && !roundStatus.completed) {
          inputRef.current.focus()
        }
      }, 100)
    } catch (err) {
      console.error('Failed to submit guess:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedSuggestionIndex >= 0) {
          handleSubmitGuess(suggestions[selectedSuggestionIndex].name)
        }
        break
      case 'Escape':
        setShowDropdown(false)
        setSelectedSuggestionIndex(-1)
        break
    }
  }

  const handleNextRound = async () => {
    if (!room || !currentRound || isNextRoundLoading) return

    setIsNextRoundLoading(true)
    try {
      const nextRoundNumber = room.current_round + 1
      
      if (nextRoundNumber <= room.total_rounds) {
        const countries = getRandomCountries(1)
        await supabaseClient.createGameRound(room.id, nextRoundNumber, countries[0])
        await supabaseClient.nextRound(room.id)
        
        await loadGameData()
      } else {
        await supabaseClient.nextRound(room.id)
        router.push(`/results/${room.room_code}`)
      }
    } catch (err) {
      console.error('Failed to start next round:', err)
    } finally {
      setIsNextRoundLoading(false)
    }
  }

  const allPlayersCompleted = players.length > 0 && players.every(player => allPlayersStatus[player.id])
  const isHost = players.find(p => p.id === currentPlayerId)?.is_host

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading game...</p>
        </div>
      </div>
    )
  }

  if (!room || !currentRound || !currentCountry) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-300">Game not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Round {room.current_round} of {room.total_rounds}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">Room: {room.room_code}</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {roundStatus.attempts}/{maxAttempts} attempts
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {roundStatus.completed ? (roundStatus.won ? 'Completed!' : 'Failed') : 'In progress'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 mb-6 text-center">
                <div className="mb-6 flex justify-center">
                  <CountryShape countryCode={currentCountry.code} className="h-48 w-full max-w-md" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  What country is this?
                </h2>
                
                {!roundStatus.completed && (
                  <div className="space-y-4">
                    <div className="relative max-w-md mx-auto">
                      <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a country name..."
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setShowDropdown(suggestions.length > 0)}
                        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                        className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        disabled={isSubmitting}
                        autoComplete="off"
                      />
                      
                      {showDropdown && suggestions.length > 0 && !isSubmitting && (
                        <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg mt-1 max-h-60 overflow-y-auto shadow-lg">
                          {suggestions.map((country, index) => (
                            <button
                              key={country.code}
                              ref={index === selectedSuggestionIndex ? (el) => el?.scrollIntoView({ block: 'nearest' }) : undefined}
                              onClick={() => handleSubmitGuess(country.name)}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3 transition-colors ${
                                index === selectedSuggestionIndex 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' 
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                              disabled={isSubmitting}
                            >
                              <span className="text-xl">{country.flag}</span>
                              <div 
                                className="font-medium text-gray-900 dark:text-white"
                                dangerouslySetInnerHTML={{ 
                                  __html: highlightSearchTerm(country.name, guess) 
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {guess.length > 0 && suggestions.length === 0 && !isSubmitting && (
                        <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 rounded-lg mt-1 p-4 text-center text-gray-500 dark:text-gray-400 shadow-lg">
                          No countries found matching "{guess}"
                        </div>
                      )}
                    </div>
                    
                    {/* Keyboard navigation hints */}
                    {showDropdown && suggestions.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Use ↑↓ arrow keys to navigate, Enter to select, Esc to close
                      </div>
                    )}
                    
                  </div>
                )}

                {roundStatus.completed && (
                  <div className={`${roundStatus.won ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
                    <p className={`${roundStatus.won ? 'text-green-800' : 'text-red-800'} font-medium`}>
                      {roundStatus.won ? '🎉 Correct!' : '❌ Game Over'}
                    </p>
                    <p className={`${roundStatus.won ? 'text-green-700' : 'text-red-700'}`}>
                      The answer was: <strong>{currentCountry.name}</strong>
                    </p>
                    {roundStatus.won && (
                      <p className="text-green-600 text-sm mt-1">
                        Solved in {roundStatus.attempts} attempt{roundStatus.attempts !== 1 ? 's' : ''}!
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Player's Attempts */}
              {(playerAttempts.length > 0 || isSubmitting) && (
                <div className="bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg p-4 mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Attempts</h3>
                  <div className="space-y-2">
                    {playerAttempts.map((attempt, index) => {
                      const guessedCountry = getCountryByName(attempt.guess)
                      return (
                      <div key={attempt.id} className={`flex items-center gap-4 p-3 rounded-lg ${
                        attempt.is_correct ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700'
                      }`}>
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">#{index + 1}</span>
                          <span className="text-lg">{guessedCountry?.flag || '🏳️'}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{attempt.guess}</span>
                          {attempt.is_correct && <span className="text-green-600 text-lg">✓</span>}
                        </div>
                        {!attempt.is_correct && (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{formatDistance(attempt.distance)}</span>
                              <span className="text-xl">{getDirectionArrow(attempt.direction)}</span>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-white text-sm ${getProximityColor(attempt.proximity)}`}>
                              {attempt.proximity}%
                            </div>
                          </>
                        )}
                        {attempt.is_correct && (
                          <div className="bg-green-500 px-3 py-1 rounded-full text-white text-sm">
                            +{attempt.score} pts
                          </div>
                        )}
                      </div>
                      )
                    })}
                    
                    {isSubmitting && (
                      <div className="flex items-center gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-sm font-medium text-blue-600">#{playerAttempts.length + 1}</span>
                          <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {allPlayersCompleted && isHost && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">All Players Completed</h3>
                  <p className="text-green-700 mb-4">Everyone has finished this round!</p>
                  <button
                    onClick={handleNextRound}
                    disabled={isNextRoundLoading}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isNextRoundLoading && (
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {isNextRoundLoading 
                      ? 'Loading...' 
                      : (room.current_round < room.total_rounds ? 'Next Round' : 'Finish Game')
                    }
                  </button>
                </div>
              )}

              {allPlayersCompleted && !isHost && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-blue-800">Waiting for host to start next round...</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Leaderboard</h3>
                <div className="space-y-2">
                  {players.map((player, index) => (
                    <div
                      key={player.id}
                      className={`flex justify-between items-center p-2 rounded ${
                        player.id === currentPlayerId ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">#{index + 1}</span>
                        <span className="truncate">{player.name}</span>
                        {player.is_host && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                            Host
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-blue-600">{player.total_score}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Round Progress</h3>
                <div className="space-y-2">
                  {players.map((player) => (
                    <div key={player.id} className="flex justify-between items-center text-sm">
                      <span className="truncate pr-2">{player.name}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        allPlayersStatus[player.id] 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {allPlayersStatus[player.id] ? 'Done' : 'Playing'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">How to Play</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Guess the country from its shape</p>
                  <p>• You have {maxAttempts} attempts</p>
                  <p>• After each guess, see:</p>
                  <p className="ml-2">- Distance to target</p>
                  <p className="ml-2">- Direction arrow</p>
                  <p className="ml-2">- Proximity percentage</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}