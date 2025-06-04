'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import { Room, Player } from '@/types/game.types'

export default function ResultsPage() {
  const { roomCode } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)

  useEffect(() => {
    const playerId = localStorage.getItem('playerId')
    setCurrentPlayerId(playerId)

    if (!playerId) {
      router.push('/')
      return
    }

    loadResults()
  }, [roomCode, router])

  const loadResults = async () => {
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

      setRoom(rooms)
      setPlayers(playersData || [])
      setLoading(false)
    } catch (err) {
      console.error('Failed to load results:', err)
      setLoading(false)
    }
  }

  const handleNewGame = async () => {
    if (!room) return

    try {
      await supabaseClient.supabase
        .from('rooms')
        .update({
          status: 'waiting',
          current_round: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id)

      await supabaseClient.supabase
        .from('players')
        .update({ total_score: 0 })
        .eq('room_id', room.id)

      await supabaseClient.supabase
        .from('game_rounds')
        .delete()
        .eq('room_id', room.id)

      await supabaseClient.supabase
        .from('player_guesses')
        .delete()
        .in('round_id', (
          await supabaseClient.supabase
            .from('game_rounds')
            .select('id')
            .eq('room_id', room.id)
        ).data?.map((r: { id: string }) => r.id) || [])

      router.push(`/room/${room.room_code}`)
    } catch (err) {
      console.error('Failed to start new game:', err)
    }
  }

  const getRankSuffix = (rank: number) => {
    if (rank === 1) return 'st'
    if (rank === 2) return 'nd'
    if (rank === 3) return 'rd'
    return 'th'
  }

  const getMedalEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return '🏅'
  }

  const currentPlayer = players.find(p => p.id === currentPlayerId)
  const isHost = currentPlayer?.is_host

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Results not found</p>
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

  const winner = players[0]
  const currentPlayerRank = players.findIndex(p => p.id === currentPlayerId) + 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">🎉 Game Complete!</h1>
            <p className="text-lg text-gray-600">Room: {room.room_code}</p>
          </div>

          {winner && (
            <div className="bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-xl p-6 mb-6 text-center">
              <div className="text-6xl mb-2">🥇</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Winner!</h2>
              <p className="text-xl font-semibold text-yellow-800">{winner.name}</p>
              <p className="text-lg text-yellow-700">{winner.total_score} points</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Final Leaderboard</h3>
            <div className="space-y-3">
              {players.map((player, index) => {
                const rank = index + 1
                const isCurrentPlayer = player.id === currentPlayerId
                
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      isCurrentPlayer
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getMedalEmoji(rank)}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{player.name}</span>
                          {player.is_host && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                              Host
                            </span>
                          )}
                          {isCurrentPlayer && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {rank}{getRankSuffix(rank)} place
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {player.total_score}
                      </div>
                      <p className="text-sm text-gray-600">points</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-2">Game Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Rounds:</span>
                <span className="ml-2 font-medium">{room.total_rounds}</span>
              </div>
              <div>
                <span className="text-gray-600">Players:</span>
                <span className="ml-2 font-medium">{players.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Your Rank:</span>
                <span className="ml-2 font-medium">
                  {currentPlayerRank}{getRankSuffix(currentPlayerRank)} / {players.length}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Your Score:</span>
                <span className="ml-2 font-medium">{currentPlayer?.total_score || 0}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {isHost && (
              <button
                onClick={handleNewGame}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
              >
                Start New Game
              </button>
            )}
            
            <button
              onClick={() => router.push('/')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Back to Home
            </button>
          </div>

          {isHost && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Only the host can start a new game with the same players
            </p>
          )}
        </div>
      </div>
    </div>
  )
}