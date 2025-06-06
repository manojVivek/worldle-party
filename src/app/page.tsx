'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image src="/worldleparty-logo.svg" alt="WorldleParty Logo" width={96} height={96} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">WorldleParty</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">Multiplayer Country Guessing Game</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create a Room</h2>
            <form onSubmit={handleCreateRoom} className="space-y-3">
              <input
                type="text"
                placeholder="Enter your name"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">OR</span>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-600 text-lg">🔗</span>
              <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">Got an invite link?</h2>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm mb-3">
              If you have a WorldleParty room link, just click it! It will bring you directly to the room.
            </p>
            <div className="text-xs text-green-600 dark:text-green-400 font-mono bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded">
              Example: worldleparty.com/join/ABC123
            </div>
          </div>

          {/* Manual code entry - now less prominent */}
          <details className="group">
            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 list-none">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <span>Don&apos;t have a link? Enter room code manually</span>
                <span className="transform transition-transform group-open:rotate-180">▼</span>
              </div>
            </summary>
            <div className="mt-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
              <form onSubmit={handleJoinRoom} className="space-y-3">
                <input
                  type="text"
                  placeholder="Room code (e.g., ABC123)"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
                  maxLength={6}
                  disabled={isJoining}
                />
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={50}
                  disabled={isJoining}
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim() || !playerName.trim() || isJoining}
                  className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {isJoining && (
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isJoining ? 'Joining Room...' : 'Join with Code'}
                </button>
              </form>
            </div>
          </details>
        </div>

        <div className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>Guess countries by their shape with your friends in real-time!</p>
        </div>
      </div>
      </div>
    </>
  )
}