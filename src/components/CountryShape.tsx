import React, { useState, useEffect } from 'react'
import { getCountryShapeSVG } from '@/lib/countryShapes'
import '@/styles/country-shapes.css'

interface CountryShapeProps {
  countryCode: string
  className?: string
  gameState?: 'normal' | 'correct' | 'incorrect' | 'revealed'
  animate?: boolean
}

export default function CountryShape({
  countryCode,
  className = '',
  gameState = 'normal',
  animate = false
}: CountryShapeProps) {
  const [svgContent, setSvgContent] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingText, setLoadingText] = useState('Loading country shape...')

  useEffect(() => {
    let mounted = true

    const loadCountryShape = async () => {
      setLoading(true)
      setLoadingText('Loading country shape...')

      try {
        const svgData = await getCountryShapeSVG(countryCode)

        if (!mounted) return

        if (svgData) {
          setSvgContent(svgData)
        } else {
          console.error(`Country shape not found for ${countryCode}`)
          setSvgContent('') // Ensure empty content for error state
        }

      } catch (error) {
        console.error(`Error loading country shape for ${countryCode}:`, error)
        setSvgContent('') // Ensure empty content for error state
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadCountryShape()

    return () => {
      mounted = false
    }
  }, [countryCode])

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-full h-full max-w-sm max-h-80 min-h-48 bg-gray-200 rounded-lg animate-pulse flex flex-col items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <div className="text-gray-500 text-xs text-center">{loadingText}</div>
        </div>
      </div>
    )
  }

  // If no SVG content loaded, show error state
  if (!svgContent) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="w-full h-full max-w-sm max-h-80 min-h-48 bg-red-50 border-2 border-red-200 rounded-lg flex flex-col items-center justify-center p-4">
          <div className="text-red-500 text-2xl mb-2">⚠️</div>
          <div className="text-red-600 text-xs text-center">
            Country shape not available for {countryCode}
          </div>
        </div>
      </div>
    )
  }

  const containerClasses = [
    'flex items-center justify-center relative',
    className,
    'w-full h-full max-w-sm max-h-80 min-h-48 country-shape-container',
    gameState !== 'normal' ? gameState : '',
    animate ? 'animate-reveal' : ''
  ].filter(Boolean).join(' ')

  return (
    <div className={containerClasses}>
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))' }}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  )
}
