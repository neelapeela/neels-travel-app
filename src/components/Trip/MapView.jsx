import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { useEffect, useMemo, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import '../../App.css'

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function ResizeHandler({ shouldResizeMap }) {
  const map = useMap()
  useEffect(() => {
    map.invalidateSize()
  }, [map, shouldResizeMap])
  return null
}

/** Centers the map on the selected stop. `flyTo` places the lat/lng at the viewport center; we do not call `panInside` afterward — asymmetric padding there was shifting the pin off true vertical/horizontal center. */
function FlyToSelectedStop({ focusStop }) {
  const map = useMap()
  useEffect(() => {
    if (!focusStop || !Number.isFinite(focusStop.latitude) || !Number.isFinite(focusStop.longitude)) {
      return undefined
    }
    const latlng = L.latLng(focusStop.latitude, focusStop.longitude)

    let cancelled = false
    let rafOuter
    let rafInner

    const run = () => {
      if (cancelled) return
      map.invalidateSize()
      map.flyTo(latlng, 17, { duration: 0.55, animate: true })
    }

    rafOuter = requestAnimationFrame(() => {
      rafInner = requestAnimationFrame(run)
    })

    return () => {
      cancelled = true
      if (rafOuter != null) cancelAnimationFrame(rafOuter)
      if (rafInner != null) cancelAnimationFrame(rafInner)
    }
  }, [map, focusStop?.id, focusStop?.latitude, focusStop?.longitude])
  return null
}

const formatStopTime = (timeValue, fallbackHour = 9) => {
  const normalized = typeof timeValue === 'string' && /^\d{2}:\d{2}$/.test(timeValue)
    ? timeValue
    : `${String(fallbackHour).padStart(2, '0')}:00`
  const [hh, mm] = normalized.split(':').map(Number)
  const suffix = hh >= 12 ? 'PM' : 'AM'
  const hour12 = hh % 12 === 0 ? 12 : hh % 12
  return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`
}

const getSortMinutes = (stop) => {
  const value = stop?.stopTime
  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    const [hh, mm] = value.split(':').map(Number)
    return hh * 60 + mm
  }
  return Number(stop?.timestampHour || 0) * 60 + Number(stop?.timestampMinute || 0)
}

const createStopIcon = (orderNumber) =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker">${orderNumber}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

const createSpecialIcon = (symbol) =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker special">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

const createLodgingHomeIcon = () =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker special lodging" title="Lodging"><svg class="lodging-marker-home" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

export default function MapView({ coordinates, shouldResizeMap, stops, focusStop }) {
  const [routePoints, setRoutePoints] = useState([])
  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => getSortMinutes(a) - getSortMinutes(b)),
    [stops]
  )

  useEffect(() => {
    const fetchRoute = async () => {
      if (stops.length < 2) {
        setRoutePoints([])
        return
      }

      const path = sortedStops.map((stop) => `${stop.longitude},${stop.latitude}`).join(';')
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`
        )
        const data = await response.json()
        const points = data?.routes?.[0]?.geometry?.coordinates?.map(([lon, lat]) => [lat, lon]) || []
        setRoutePoints(points)
      } catch (error) {
        console.error('Failed to load route geometry', error)
        setRoutePoints([])
      }
    }

    fetchRoute()
  }, [sortedStops, stops.length])

  return (
    <div className="map-view">
      <MapContainer
        center={coordinates}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {sortedStops.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[stop.latitude, stop.longitude]}
            icon={
              stop.stopType === 'flight'
                ? createSpecialIcon('✈')
                : stop.stopType === 'lodging'
                  ? createLodgingHomeIcon()
                  : createStopIcon(
                      sortedStops.filter((item, itemIndex) => item.stopType !== 'flight' && item.stopType !== 'lodging' && itemIndex <= index).length
                    )
            }
          >
            <Popup>
              <div><strong>{stop.title}</strong></div>
              <div>{stop.location || 'Address not provided'}</div>
              <div>{formatStopTime(stop.stopTime, stop.timestampHour)}</div>
            </Popup>
          </Marker>
        ))}
        {routePoints.length > 0 && <Polyline positions={routePoints} color="#8B6F5A" weight={5} />}
        <FlyToSelectedStop focusStop={focusStop} />
        <ResizeHandler shouldResizeMap={shouldResizeMap} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
    </MapContainer>
    </div>
  )
}