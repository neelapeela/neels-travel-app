import { MapContainer, TileLayer, Polyline, FeatureGroup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { lazy, Suspense, useMemo } from 'react'
import { getSortMinutes } from '../../../utils/stopTime'
import { useDebouncedDrivingRoute } from '../hooks/useDebouncedDrivingRoute'
import { getMapboxAccessToken, MAP_TILE_FALLBACK_URL } from '../constants'
import { FitStopsToView, FlyToSelectedStop, ResizeHandler } from './map/leafletMapLayers'
import StopMarkersLayer from './map/StopMarkersLayer'

const MapboxVoyagerLayer = lazy(() => import('./map/MapboxVoyagerLayer'))
import '../trip.css'
import { colorForMembersKey, membersKey } from '../utils/stopMembers'

function RouteLayer({ stops, color, groupKey }) {
  const { regularRouteSegments, dottedFlightSegmentPositions, polylineKey } = useDebouncedDrivingRoute(stops)
  const baseKey = `${groupKey}#${polylineKey}`
  return (
    <>
      {regularRouteSegments.map((segment, index) => (
        <FeatureGroup key={`${baseKey}-solid-group-${index}`}>
          <Polyline
            positions={segment}
            pathOptions={{ color: '#F8FAFC', weight: 8, opacity: 0.55 }}
          />
          <Polyline
            positions={segment}
            pathOptions={{ color, weight: 5.5, opacity: 0.96 }}
          />
        </FeatureGroup>
      ))}
      {dottedFlightSegmentPositions.map((segment, index) => (
        <FeatureGroup key={`${baseKey}-flight-group-${index}`}>
          <Polyline
            positions={segment}
            pathOptions={{ color: '#F8FAFC', weight: 7, opacity: 0.45, dashArray: '8 9' }}
          />
          <Polyline
            positions={segment}
            pathOptions={{ color, weight: 4.5, opacity: 0.95, dashArray: '7 9' }}
          />
        </FeatureGroup>
      ))}
    </>
  )
}

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

function MapInner({
  coordinates,
  shouldResizeMap,
  layoutResizeKey,
  sortedStops,
  routeGroups,
  focusStop,
  focusLeftPaddingPx,
  fitViewKey,
  stopCalendarDate,
  participants = [],
  onSelectStop
}) {
  const mapboxToken = getMapboxAccessToken()
  return (
    <>
      {mapboxToken ? (
        <Suspense fallback={null}>
          <MapboxVoyagerLayer accessToken={mapboxToken} />
        </Suspense>
      ) : (
        <TileLayer attribution="" url={MAP_TILE_FALLBACK_URL} />
      )}
      {routeGroups.map((group) => (
        <RouteLayer key={group.key} stops={group.stops} color={group.color} groupKey={group.key} />
      ))}
      <StopMarkersLayer
        sortedStops={sortedStops}
        participants={participants}
        stopCalendarDate={stopCalendarDate}
        onSelectStop={onSelectStop}
      />
      <FitStopsToView coordinates={coordinates} stops={sortedStops} fitViewKey={fitViewKey} />
      <FlyToSelectedStop focusStop={focusStop} focusLeftPaddingPx={focusLeftPaddingPx} />
      <ResizeHandler shouldResizeMap={shouldResizeMap} layoutResizeKey={layoutResizeKey} />
    </>
  )
}

export default function MapView({
  coordinates,
  shouldResizeMap,
  layoutResizeKey,
  stops,
  focusStop,
  focusLeftPaddingPx = 0,
  fitViewKey = '',
  stopCalendarDate = '',
  participants = [],
  onSelectStop
}) {
  const sortedStops = useMemo(() => [...(stops || [])].sort((a, b) => getSortMinutes(a) - getSortMinutes(b)), [stops])
  const routeGroups = useMemo(() => {
    const allIds = participants || []
    const keyFor = (stop) => membersKey(stop?.members, allIds)
    const keys = new Set()
    for (const stop of stops || []) {
      keys.add(keyFor(stop))
    }
    if (keys.size === 0) keys.add('ALL')
    const unique = Array.from(keys.values())
    return unique.map((key) => {
      const includeShared = key !== 'ALL'
      const filtered = (stops || []).filter((s) => {
        const k = keyFor(s)
        return k === key || (includeShared && k === 'ALL')
      })

      // In non-ALL groups, shared "ALL members" stops are connector anchors only.
      // Collapse consecutive shared stops so ALL->ALL legs stay exclusively on the brown ALL route.
      const normalizedStops =
        key === 'ALL'
          ? filtered
          : filtered.filter((stop, index, arr) => {
              const curr = keyFor(stop)
              if (curr !== 'ALL') return true
              const prev = index > 0 ? keyFor(arr[index - 1]) : ''
              return prev !== 'ALL'
            })

      return { key, color: colorForMembersKey(key), stops: normalizedStops }
    })
  }, [stops, participants])

  return (
    <div className="map-view">
      <MapContainer
        center={coordinates}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        attributionControl={false}
      >
        <MapInner
          coordinates={coordinates}
          shouldResizeMap={shouldResizeMap}
          layoutResizeKey={layoutResizeKey}
          sortedStops={sortedStops}
          routeGroups={routeGroups}
          focusStop={focusStop}
          focusLeftPaddingPx={focusLeftPaddingPx}
          fitViewKey={fitViewKey}
          stopCalendarDate={stopCalendarDate}
          participants={participants}
          onSelectStop={onSelectStop}
        />
      </MapContainer>
    </div>
  )
}
