import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'mapbox-gl-leaflet'
import { createVoyagerStyle } from '../../map/voyagerStyle'
import { getMapboxStyleOverride } from '../../constants'

export default function MapboxVoyagerLayer({ accessToken }) {
  const map = useMap()

  useEffect(() => {
    if (!accessToken) return undefined

    mapboxgl.accessToken = accessToken
    const style = getMapboxStyleOverride() || createVoyagerStyle()
    const layer = L.mapboxGL({
      accessToken,
      style,
      interactive: false
    })
    layer.addTo(map)

    return () => {
      if (map.hasLayer(layer)) map.removeLayer(layer)
      const glMap = typeof layer.getMapboxMap === 'function' ? layer.getMapboxMap() : null
      if (glMap && typeof glMap.remove === 'function') {
        try {
          glMap.remove()
        } catch {
          /* already torn down */
        }
      }
    }
  }, [map, accessToken])

  return null
}
