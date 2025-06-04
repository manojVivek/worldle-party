'use client'

import { useEffect } from 'react'
import { preloadNaturalEarthData } from '@/lib/naturalEarth'

export default function NaturalEarthPreloader() {
  useEffect(() => {
    // Preload Natural Earth data when the app starts
    // This runs in the background and doesn't block the UI
    preloadNaturalEarthData().catch(error => {
      console.warn('Failed to preload Natural Earth data:', error)
    })
  }, [])

  return null // This component doesn't render anything
}