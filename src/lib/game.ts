import { Country, GuessResult } from '@/types/game.types'

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Haversine formula to calculate distance between two points on Earth
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Calculate bearing/direction from one point to another
export function calculateDirection(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = (lon2 - lon1) * Math.PI / 180
  const lat1Rad = lat1 * Math.PI / 180
  const lat2Rad = lat2 * Math.PI / 180
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad)
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon)
  
  const bearing = Math.atan2(y, x) * 180 / Math.PI
  return (bearing + 360) % 360 // Normalize to 0-360
}

// Calculate proximity percentage based on distance
export function calculateProximity(distance: number): number {
  const maxDistance = 20000 // Maximum distance in km (roughly half Earth's circumference)
  const proximity = Math.max(0, (maxDistance - distance) / maxDistance * 100)
  return Math.round(proximity)
}

// Get direction arrow based on bearing
export function getDirectionArrow(bearing: number): string {
  const directions = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
  const index = Math.round(bearing / 45) % 8
  return directions[index]
}

// Evaluate a guess in Worldle style
export function evaluateGuess(guessedCountry: Country, targetCountry: Country): GuessResult {
  const isCorrect = guessedCountry.code === targetCountry.code
  
  if (isCorrect) {
    return {
      guess: guessedCountry.name,
      distance: 0,
      direction: 0,
      proximity: 100,
      isCorrect: true
    }
  }
  
  const distance = calculateDistance(
    guessedCountry.latitude,
    guessedCountry.longitude,
    targetCountry.latitude,
    targetCountry.longitude
  )
  
  const direction = calculateDirection(
    guessedCountry.latitude,
    guessedCountry.longitude,
    targetCountry.latitude,
    targetCountry.longitude
  )
  
  const proximity = calculateProximity(distance)
  
  return {
    guess: guessedCountry.name,
    distance: Math.round(distance),
    direction,
    proximity,
    isCorrect: false
  }
}

// Calculate score based on number of attempts (Worldle style)
export function calculateWorldleScore(attemptNumber: number, isCorrect: boolean): number {
  if (!isCorrect) return 0
  
  const baseScore = 1000
  const attemptPenalty = (attemptNumber - 1) * 150 // Lose 150 points per attempt
  return Math.max(100, baseScore - attemptPenalty)
}

// Get proximity color for UI
export function getProximityColor(proximity: number): string {
  if (proximity >= 80) return 'bg-green-500'
  if (proximity >= 60) return 'bg-yellow-500'
  if (proximity >= 40) return 'bg-orange-500'
  if (proximity >= 20) return 'bg-red-400'
  return 'bg-red-600'
}

// Format distance for display
export function formatDistance(distance: number): string {
  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)}k km`
  }
  return `${distance} km`
}

// Constants for Worldle game
export function getWorldleSettings() {
  return {
    maxAttempts: 5,
    totalRounds: 10,
    baseScore: 1000
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function getHint(country: Country, hintLevel: number): string {
  switch (hintLevel) {
    case 1:
      return `Continent: ${country.continent}`
    case 2:
      return `Capital: ${country.capital}`
    case 3:
      return `Population: ${country.population.toLocaleString()}`
    case 4:
      return `Area: ${country.area.toLocaleString()} km²`
    default:
      return ''
  }
}