/**
 * Utility functions for handling country shape SVGs
 */

/**
 * Gets the URL path for a country's SVG shape file
 */
export function getCountryShapeUrl(countryCode: string): string {
  return `/country-shapes/${countryCode.toLowerCase()}.svg`
}

/**
 * Checks if a country has an available SVG shape file
 */
export async function hasCountryShape(countryCode: string): Promise<boolean> {
  try {
    const response = await fetch(getCountryShapeUrl(countryCode), { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Fetches the SVG content for a country and ensures proper sizing
 */
export async function getCountryShapeSVG(countryCode: string): Promise<string | null> {
  try {
    const response = await fetch(getCountryShapeUrl(countryCode))
    if (!response.ok) {
      return null
    }
    let svgContent = await response.text()
    
    // Ensure the SVG has proper attributes for responsive sizing
    if (svgContent.includes('<svg')) {
      svgContent = svgContent.replace(
        /<svg([^>]*)>/,
        (match, attributes) => {
          // Remove fixed width/height attributes and ensure viewBox exists
          let newAttributes = attributes
            .replace(/width="[^"]*"/g, '')
            .replace(/height="[^"]*"/g, '')
            .replace(/\s+/g, ' ')
            .trim()
          
          // Add responsive attributes for proper scaling
          if (!newAttributes.includes('viewBox')) {
            newAttributes += ' viewBox="0 0 1000 1000"'
          }
          // Use 'meet' to ensure entire SVG is visible within container
          newAttributes += ' preserveAspectRatio="xMidYMid meet" width="100%" height="100%"'
          
          return `<svg ${newAttributes}>`
        }
      )
    }
    
    return svgContent
  } catch {
    return null
  }
}

/**
 * Preloads country shape SVGs for better performance
 */
export function preloadCountryShapes(countryCodes: string[]): void {
  if (typeof window !== 'undefined') {
    countryCodes.forEach(code => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.href = getCountryShapeUrl(code)
      document.head.appendChild(link)
    })
  }
}

interface DownloadResult {
  code: string
  status: string
}

/**
 * Gets a list of all available country shape codes from the download results
 */
export async function getAvailableCountryShapes(): Promise<string[]> {
  try {
    const response = await fetch('/country-shapes/download-results.json')
    if (!response.ok) {
      return []
    }
    const results: DownloadResult[] = await response.json()
    return results
      .filter((result) => result.status === 'downloaded' || result.status === 'exists')
      .map((result) => result.code)
  } catch {
    return []
  }
}