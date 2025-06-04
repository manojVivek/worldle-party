'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '@/lib/supabase-client'
import NaturalEarthPreloader from '@/components/NaturalEarthPreloader'

export default function Home() {
  const [hostName, setHostName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!hostName.trim()) return

    setIsCreating(true)
    setError('')

    try {
      const room = await supabaseClient.createRoom(hostName.trim())
      const { player } = await supabaseClient.joinRoom(room.room_code, hostName.trim())
      
      localStorage.setItem('playerId', player.id)
      localStorage.setItem('playerName', player.name)
      router.push(`/room/${room.room_code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim() || !playerName.trim()) return

    setIsJoining(true)
    setError('')

    try {
      const { room, player } = await supabaseClient.joinRoom(joinCode.trim().toUpperCase(), playerName.trim())
      
      localStorage.setItem('playerId', player.id)
      localStorage.setItem('playerName', player.name)
      router.push(`/room/${room.room_code}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <>
      <NaturalEarthPreloader />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">🌍 Worldle</h1>
          <p className="text-lg text-gray-600">Multiplayer Country Guessing Game</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Create a Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <input
                type="text"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
                disabled={isCreating}
              />
              <button
                type="submit"
                disabled={!hostName.trim() || isCreating}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {isCreating && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isCreating ? 'Creating Room...' : 'Create Room'}
              </button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Join a Room</h2>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                type="text"
                placeholder="Room code (e.g., ABC123)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
                maxLength={6}
                disabled={isJoining}
              />
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                maxLength={50}
                disabled={isJoining}
              />
              <button
                type="submit"
                disabled={!joinCode.trim() || !playerName.trim() || isJoining}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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
        </div>

        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Guess countries by their shape with your friends in real-time!</p>
        </div>
      </div>
      </div>
    </>
  )
}