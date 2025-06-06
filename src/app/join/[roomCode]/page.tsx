'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabaseClient } from '@/lib/supabase-client'

export default function JoinRoomPage() {
  const { roomCode } = useParams()
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [roomExists, setRoomExists] = useState<boolean | null>(null)
  const [roomInfo, setRoomInfo] = useState<{ host_name: string; name: string } | null>(null)

  useEffect(() => {
    checkExistingSessionFirst()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode])

  const checkExistingSessionFirst = async () => {
    // First check if there's already a player session for this room
    const existingPlayerId = localStorage.getItem('playerId')
    if (existingPlayerId) {
      try {
        const { data: existingPlayer } = await supabaseClient.supabase
          .from('players')
          .select('*, room:rooms(*)')
          .eq('id', existingPlayerId)
          .single()
        
        if (existingPlayer && existingPlayer.room?.room_code === roomCode) {
          // Player already exists in this room, redirect directly
          router.push(`/room/${roomCode}`)
          return
        }
      } catch (error) {
        // Player not found or error, continue with normal flow
        console.log('No existing session found, proceeding with join flow')
      }
    }
    
    // No existing session, check if room exists
    checkRoomExists()
  }

  const checkRoomExists = async () => {
    try {
      const { data: room } = await supabaseClient.supabase
        .from('rooms')
        .select('host_name, name, status')
        .eq('room_code', roomCode)
        .single()

      if (room && room.status === 'waiting') {
        setRoomExists(true)
        setRoomInfo({ host_name: room.host_name, name: room.name })
      } else {
        setRoomExists(false)
      }
    } catch {
      setRoomExists(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setIsJoining(true)
    setError('')

    try {
      const { room, player } = await supabaseClient.joinRoom(roomCode as string, playerName.trim())
      
      localStorage.setItem('playerId', player.id)
      localStorage.setItem('playerName', player.name)
      router.push(`/room/${room.room_code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    } finally {
      setIsJoining(false)
    }
  }

  if (roomExists === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Checking room...</p>
        </div>
      </div>
    )
  }

  if (!roomExists) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Room Not Found</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Room <span className="font-mono font-bold">{roomCode}</span> doesn&apos;t exist or has already started.
          </p>
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/worldleparty-logo.svg" alt="WorldleParty Logo" width={96} height={96} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Join Room</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">You&apos;ve been invited to play!</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          {roomInfo && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Room Details</h3>
              <div className="space-y-1 text-sm">
                <p className="text-blue-800 dark:text-blue-200">
                  <span className="font-medium">Room Code:</span> <span className="font-mono font-bold">{roomCode}</span>
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  <span className="font-medium">Room:</span> {roomInfo.name}
                </p>
                <p className="text-blue-800 dark:text-blue-200">
                  <span className="font-medium">Host:</span> {roomInfo.host_name}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enter your name to join
              </label>
              <input
                id="playerName"
                type="text"
                placeholder="Your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
                disabled={isJoining}
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={!playerName.trim() || isJoining}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {isJoining && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isJoining ? 'Joining Room...' : 'Join Room'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
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