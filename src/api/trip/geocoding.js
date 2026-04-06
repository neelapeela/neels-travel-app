/**
 * Geocodes a location name to coordinates using Nominatim API
 * @param {string} locationName - Name of the location (e.g., "Paris, France")
 * @returns {Promise<{lat: number, lon: number} | null>} - Coordinates or null if not found
 */
export const geocodeLocation = async (locationName) => {
  if (!locationName) return null

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}&limit=1`,
      {
        headers: {
          'User-Agent': 'Travel App' // Required by Nominatim
        }
      }
    )

    const data = await response.json()

    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon)
      }
    }

    return null
  } catch (error) {
    console.error('Error geocoding location:', error)
    return null
  }
}

export const reverseGeocodeLocation = async (latitude, longitude) => {
  if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
        latitude
      )}&lon=${encodeURIComponent(longitude)}`,
      {
        headers: {
          'User-Agent': 'Travel App'
        }
      }
    )
    const data = await response.json()
    return data?.display_name || null
  } catch (error) {
    console.error('Error reverse geocoding location:', error)
    return null
  }
}
