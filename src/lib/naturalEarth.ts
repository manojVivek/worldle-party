import { feature } from 'topojson-client'
import { geoPath, geoNaturalEarth1 } from 'd3-geo'
import type { Topology, GeometryObject } from 'topojson-specification'
import type { FeatureCollection, Feature, Geometry } from 'geojson'

interface CountryFeature extends Feature<Geometry> {
  properties: {
    NAME: string
    ISO_A2: string
    ISO_A3: string
    [key: string]: unknown
  }
}

interface WorldAtlasTopology extends Topology {
  objects: {
    countries: GeometryObject
  }
}

// Cache for country data
let countriesCache: CountryFeature[] | null = null
let cacheExpiry: number = 0
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

/**
 * Fetches Natural Earth country data from the world-atlas CDN
 */
async function fetchNaturalEarthData(): Promise<CountryFeature[]> {
  // Check cache first
  if (countriesCache && Date.now() < cacheExpiry) {
    return countriesCache
  }

  try {
    // Fetch TopoJSON data from CDN (110m resolution for good performance)
    const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Natural Earth data: ${response.status}`)
    }

    const world: WorldAtlasTopology = await response.json()
    
    // Convert TopoJSON to GeoJSON features
    const countries = feature(world, world.objects.countries) as FeatureCollection<Geometry, CountryFeature['properties']>
    
    // Cache the result
    countriesCache = countries.features as CountryFeature[]
    cacheExpiry = Date.now() + CACHE_DURATION
    
    return countriesCache
  } catch (error) {
    console.error('Error fetching Natural Earth data:', error)
    throw error
  }
}

/**
 * Converts a country feature to an SVG path string
 */
function featureToSVGPath(feature: CountryFeature): string {
  // Create a projection optimized for the country
  const projection = geoNaturalEarth1()
    .fitSize([400, 300], feature) // Fit to a reasonable viewport
  
  // Create path generator
  const pathGenerator = geoPath(projection)
  
  // Generate SVG path
  const pathData = pathGenerator(feature)
  
  return pathData || ''
}

/**
 * Gets the SVG path for a specific country by ISO code
 */
export async function getCountrySVGPath(countryCode: string): Promise<string> {
  try {
    const countries = await fetchNaturalEarthData()
    
    // Find country by ISO_A2 or ISO_A3 code
    const country = countries.find(c => 
      c.properties.ISO_A2 === countryCode.toUpperCase() ||
      c.properties.ISO_A3 === countryCode.toUpperCase()
    )
    
    if (!country) {
      console.warn(`Country not found for code: ${countryCode}`)
      return ''
    }
    
    return featureToSVGPath(country)
  } catch (error) {
    console.error(`Error generating SVG for country ${countryCode}:`, error)
    return ''
  }
}

/**
 * Gets country information including name and SVG path
 */
export async function getCountryInfo(countryCode: string): Promise<{
  name: string
  svgPath: string
  found: boolean
}> {
  try {
    const countries = await fetchNaturalEarthData()
    
    const country = countries.find(c => 
      c.properties.ISO_A2 === countryCode.toUpperCase() ||
      c.properties.ISO_A3 === countryCode.toUpperCase()
    )
    
    if (!country) {
      return {
        name: '',
        svgPath: '',
        found: false
      }
    }
    
    return {
      name: country.properties.NAME,
      svgPath: featureToSVGPath(country),
      found: true
    }
  } catch (error) {
    console.error(`Error getting country info for ${countryCode}:`, error)
    return {
      name: '',
      svgPath: '',
      found: false
    }
  }
}

/**
 * Preloads Natural Earth data for faster subsequent requests
 */
export async function preloadNaturalEarthData(): Promise<void> {
  try {
    await fetchNaturalEarthData()
    console.log('Natural Earth data preloaded successfully')
  } catch (error) {
    console.error('Failed to preload Natural Earth data:', error)
  }
}

/**
 * Gets a list of all available countries from Natural Earth data
 */
export async function getAvailableCountries(): Promise<Array<{
  code: string
  name: string
}>> {
  try {
    const countries = await fetchNaturalEarthData()
    
    return countries
      .filter(c => c.properties.ISO_A2 && c.properties.ISO_A2 !== '-99')
      .map(c => ({
        code: c.properties.ISO_A2,
        name: c.properties.NAME
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error getting available countries:', error)
    return []
  }
}