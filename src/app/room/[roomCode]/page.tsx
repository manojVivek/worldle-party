'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabaseClient } from '@/lib/supabase-client'
import { Room, Player, Round, RoundCreationData } from '@/types/game.types'

interface RoundCardProps {
  round: Round
  isHost: boolean
  onStartRound: (roundId: string) => void
  onUpdateRound: (roundId: string, updates: Partial<RoundCreationData>) => void
}

function RoundCard({ round, isHost, onStartRound, onUpdateRound }: RoundCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: round.name || '',
    games_per_round: round.games_per_round,
    time_limit_seconds: round.time_limit_seconds,
    max_attempts_per_game: round.max_attempts_per_game
  })

  const handleSave = async () => {
    await onUpdateRound(round.id, editForm)
    await onStartRound(round.id)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditForm({
      name: round.name || '',
      games_per_round: round.games_per_round,
      time_limit_seconds: round.time_limit_seconds,
      max_attempts_per_game: round.max_attempts_per_game
    })
    setIsEditing(false)
  }

  if (round.status === 'waiting' && isHost) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-2 border-blue-200 dark:border-blue-800">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Round Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Games
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={editForm.games_per_round}
                  onChange={(e) => setEditForm({...editForm, games_per_round: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={editForm.max_attempts_per_game}
                  onChange={(e) => setEditForm({...editForm, max_attempts_per_game: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Time (s)
                </label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={editForm.time_limit_seconds}
                  onChange={(e) => setEditForm({...editForm, time_limit_seconds: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Round
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-900 dark:text-white">{round.name}</h4>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                Ready to start
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {round.games_per_round} games • {round.max_attempts_per_game} attempts • {round.time_limit_seconds}s timer
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onStartRound(round.id)}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Start Round
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // For non-waiting rounds or non-host users
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white">{round.name}</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {round.games_per_round} games • {round.max_attempts_per_game} attempts • {round.time_limit_seconds}s timer
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs ${
          round.status === 'waiting' 
            ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            : round.status === 'active'
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
        }`}>
          {round.status}
        </span>
      </div>
    </div>
  )
}

export default function RoomPage() {
  const { roomCode } = useParams()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [rounds, setRounds] = useState<Round[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null)
  const [isCreatingRound, setIsCreatingRound] = useState(false)
  const [showRoundForm, setShowRoundForm] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [subscriptions, setSubscriptions] = useState<{ unsubscribe: () => void }[]>([])
  const [roomId, setRoomId] = useState<string | null>(null)
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
  
  // Round creation form state
  const [roundForm, setRoundForm] = useState<RoundCreationData>({
    name: '',
    games_per_round: 10,
    time_limit_seconds: 60,
    max_attempts_per_game: 5
  })

  const fetchRoomData = useCallback(async () => {
    try {
      const { data: rooms } = await supabaseClient.supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .single()

      if (!rooms) {
        setError('Room not found')
        return null
      }

      const { data: playersData } = await supabaseClient.supabase
        .from('players')
        .select('*')
        .eq('room_id', rooms.id)
        .order('joined_at')

      const { data: roundsData } = await supabaseClient.supabase
        .from('rounds')
        .select('*')
        .eq('room_id', rooms.id)
        .order('round_number')

      setRounds(roundsData || [])

      setRoom(rooms)
      setPlayers(playersData || [])
      setRoomId(rooms.id)
      return rooms
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room')
      return null
    }
  }, [roomCode])

  const loadRoomData = async () => {
    try {
      setLoading(true)
      await fetchRoomData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const playerId = localStorage.getItem('playerId')
    setCurrentPlayerId(playerId)

    if (!playerId) {
      // If no player ID, redirect to join page for this room
      router.push(`/join/${roomCode}`)
      return
    }

    loadRoomData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode, router])

  useEffect(() => {
    if (roomId && subscriptions.length === 0) {
      // Set up combined real-time subscription
      const subscription = supabaseClient.subscribeToRoomUpdates(roomId, () => {
        fetchRoomData()
      })

      setSubscriptions([subscription])

      // Set up polling as fallback (every 5 seconds)
      const interval = setInterval(() => {
        fetchRoomData()
      }, 5000)
      
      setPollingInterval(interval)
    }
  }, [roomId, subscriptions.length, fetchRoomData])

  useEffect(() => {
    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [subscriptions, pollingInterval])

  const handleCreateRound = async () => {
    if (!room || !currentPlayerId) return

    setIsCreatingRound(true)
    try {
      const roundData: RoundCreationData = {
        ...roundForm,
        name: roundForm.name || `Round ${rounds.length + 1}`
      }
      
      await supabaseClient.createRound(room.id, roundData)
      await fetchRoomData()
      
      // Reset form
      setRoundForm({
        name: '',
        games_per_round: 10,
        time_limit_seconds: 60,
        max_attempts_per_game: 5
      })
      setShowRoundForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create round')
    } finally {
      setIsCreatingRound(false)
    }
  }

  const handleStartRound = async (roundId: string) => {
    if (!room || !currentPlayerId) return

    try {
      await supabaseClient.startRound(roundId)
      router.push(`/game/${room.room_code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start round')
    }
  }

  const handleUpdateRound = async (roundId: string, updates: Partial<RoundCreationData>) => {
    try {
      await supabaseClient.supabase
        .from('rounds')
        .update(updates)
        .eq('id', roundId)
      
      await fetchRoomData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update round')
    }
  }

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode as string)
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy room code:', err)
    }
  }

  const copyRoomLink = async () => {
    try {
      const roomUrl = `${window.location.origin}/join/${roomCode}`
      await navigator.clipboard.writeText(roomUrl)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy room link:', err)
    }
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

  if (room.status === 'playing' && room.active_round_id) {
    router.push(`/game/${room.room_code}`)
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Image src="/worldleparty-icon.svg" alt="WorldleParty" width={40} height={40} />
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{room.name}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">WorldleParty Room</p>
              </div>
            </div>
            
            {/* Primary sharing method - Link */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">📤 Invite Friends</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">Share this link for instant room access</p>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-lg p-3">
                <code className="flex-1 text-sm text-gray-700 dark:text-gray-300 break-all">
                  {typeof window !== 'undefined' ? `${window.location.origin}/join/${room.room_code}` : `worldleparty.com/join/${room.room_code}`}
                </code>
                <button
                  onClick={copyRoomLink}
                  className={`px-3 py-1 rounded text-sm transition-all duration-200 flex items-center gap-1 ${
                    linkCopied 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                  title={linkCopied ? "Copied!" : "Copy room link"}
                >
                  {linkCopied ? '✓ Copied!' : '📋 Copy'}
                </button>
              </div>
            </div>

            {/* Secondary sharing method - Code */}
            <details className="text-left">
              <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mb-2">
                Or share room code manually
              </summary>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-lg font-mono font-bold text-gray-700 dark:text-gray-300">{room.room_code}</span>
                  <button
                    onClick={copyRoomCode}
                    className={`p-1 transition-all duration-200 ${
                      codeCopied 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title={codeCopied ? "Copied!" : "Copy room code"}
                  >
                    {codeCopied ? '✓' : '📋'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">Friends can enter this code manually</p>
              </div>
            </details>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">Round Settings</h3>
              {isHost && (
                <>
                  {rounds.length === 0 && (
                    <button
                      onClick={() => setShowRoundForm(!showRoundForm)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Create First Round
                    </button>
                  )}
                  {rounds.length > 0 && rounds[0].status !== 'waiting' && (
                    <button
                      onClick={() => setShowRoundForm(!showRoundForm)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                    >
                      + New Round
                    </button>
                  )}
                </>
              )}
            </div>
            
            {showRoundForm && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border-2 border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Create New Round</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Round Name (optional)
                    </label>
                    <input
                      type="text"
                      value={roundForm.name}
                      onChange={(e) => setRoundForm({...roundForm, name: e.target.value})}
                      placeholder={`Round ${rounds.length + 1}`}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Games per Round
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={roundForm.games_per_round}
                        onChange={(e) => setRoundForm({...roundForm, games_per_round: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Attempts
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={roundForm.max_attempts_per_game}
                        onChange={(e) => setRoundForm({...roundForm, max_attempts_per_game: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Time Limit (seconds)
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="300"
                      value={roundForm.time_limit_seconds}
                      onChange={(e) => setRoundForm({...roundForm, time_limit_seconds: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateRound}
                      disabled={isCreatingRound}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {isCreatingRound ? 'Creating...' : 'Create Round'}
                    </button>
                    <button
                      onClick={() => setShowRoundForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {rounds.length > 0 ? (
              <div className="space-y-3">
                {rounds.map((round) => (
                  <RoundCard 
                    key={round.id} 
                    round={round} 
                    isHost={isHost} 
                    onStartRound={handleStartRound}
                    onUpdateRound={handleUpdateRound}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No rounds created yet. {isHost ? 'Click "Create First Round" to get started!' : 'Waiting for host to create a round...'}
                </p>
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Players ({players.length})
            </h3>
            <div className="space-y-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.id === currentPlayerId
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                      : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
                    {player.is_host && (
                      <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 text-xs px-2 py-1 rounded-full">
                        Host
                      </span>
                    )}
                    {player.id === currentPlayerId && (
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs px-2 py-1 rounded-full">
                        You
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        <div className="text-center">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}