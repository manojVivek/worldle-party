'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { Room, Player } from '@/types/game.types'
import { getRandomCountries } from '@/data/countries'

export default function RoomPage() {
  const { roomCode } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    const playerId = localStorage.getItem('playerId')
    setCurrentPlayerId(playerId)

    if (!playerId) {
      router.push('/')
      return
    }

    loadRoomData()
  }, [roomCode, router])

  const loadRoomData = async () => {
    try {
      setLoading(true)
      const { data: rooms } = await supabaseClient.supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single()

      if (!rooms) {
        setError('Room not found')
        return
      }

      const { data: playersData } = await supabaseClient.supabase
        .from('players')
        .select('*')
        .eq('room_id', rooms.id)
        .order('joined_at')

      setRoom(rooms)
      setPlayers(playersData || [])

      const roomSubscription = supabaseClient.subscribeToRoom(rooms.id, () => {
        loadRoomData()
      })

      const playersSubscription = supabaseClient.subscribeToPlayers(rooms.id, () => {
        loadRoomData()
      })

      return () => {
        roomSubscription.unsubscribe()
        playersSubscription.unsubscribe()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  const handleStartGame = async () => {
    if (!room || !currentPlayerId) return

    setIsStarting(true)
    try {
      await supabaseClient.startGame(room.id)
      
      const countries = getRandomCountries(room.total_rounds)
      await supabaseClient.createGameRound(room.id, 1, countries[0])
      
      router.push(`/game/${room.room_code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start game')
    } finally {
      setIsStarting(false)
    }
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode as string)
  }

  const currentPlayer = players.find(p => p.id === currentPlayerId)
  const isHost = currentPlayer?.is_host

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Room Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (!room) return null

  if (room.status === 'playing') {
    router.push(`/game/${room.room_code}`)
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">🌍 Room Lobby</h1>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-2xl font-mono font-bold text-blue-600">{room.room_code}</span>
              <button
                onClick={copyRoomCode}
                className="text-blue-600 hover:text-blue-700 p-1"
                title="Copy room code"
              >
                📋
              </button>
            </div>
            <p className="text-gray-600">Share this code with your friends!</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Game Settings</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Rounds:</span>
                <span className="ml-2 font-medium">{room.total_rounds}</span>
              </div>
              <div>
                <span className="text-gray-600">Host:</span>
                <span className="ml-2 font-medium">{room.host_name}</span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">
              Players ({players.length})
            </h3>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.id === currentPlayerId
                      ? 'bg-blue-50 border-2 border-blue-200'
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.name}</span>
                    {player.is_host && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        Host
                      </span>
                    )}
                    {player.id === currentPlayerId && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="border-t pt-6">
              <button
                onClick={handleStartGame}
                disabled={players.length < 1 || isStarting}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isStarting && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isStarting ? 'Starting Game...' : 'Start Game'}
              </button>
              <p className="text-center text-sm text-gray-500 mt-2">
                Only the host can start the game
              </p>
            </div>
          )}

          {!isHost && (
            <div className="border-t pt-6 text-center">
              <p className="text-gray-600">Waiting for host to start the game...</p>
              <div className="flex justify-center mt-3">
                <div className="animate-pulse flex space-x-1">
                  <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                  <div className="h-2 w-2 bg-blue-600 rounded-full animation-delay-200"></div>
                  <div className="h-2 w-2 bg-blue-600 rounded-full animation-delay-400"></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-700 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}