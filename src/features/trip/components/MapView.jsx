import { MapContainer, TileLayer, Marker, Popup, Polyline, FeatureGroup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useMemo } from 'react'
import { formatStopTime, getSortMinutes } from '../../../utils/stopTime'
import { formatFlightTimeZoneAtStop } from '../../../utils/stopTimezone'
import { readCoord } from '../../../utils/mapboxRoute'
import { useDebouncedDrivingRoute } from '../hooks/useDebouncedDrivingRoute'
import { MAP_TILE_URL } from '../constants'
import { FitStopsToView, FlyToSelectedStop, ResizeHandler } from './map/leafletMapLayers'
import {
  createLodgingHomeIcon,
  createSpecialIcon,
  createStopIcon
} from './map/markerIcons'
import '../trip.css'
import { colorForMembersKey, membersKey } from '../utils/stopMembers'

/**
 * Popup content is portaled outside React-Leaflet context, so the map is passed from `MapInner`
 * (which calls `useMap()` under `MapContainer`).
 */
function StopPopupBody({ stop, stopCalendarDate, onSelectStop, leafletMap }) {
  const title = stop.title || 'Stop'
  const tz =
    stop.stopType === 'flight' ? formatFlightTimeZoneAtStop(stop, stopCalendarDate, 'full') : ''
  const timeLine =
    formatStopTime(stop.stopTime, stop.timestampHour) + (tz ? ` · ${tz}` : '')
  const locationLine = stop.location || 'Address not provided'

  if (!onSelectStop) {
    return (
      <>
        <div><strong>{title}</strong></div>
        <div>{locationLine}</div>
        <div>{timeLine}</div>
      </>
    )
  }

  return (
    <button
      type="button"
      className="map-view__stop-popup-btn"
      aria-label={`Open details for ${title}`}
      onClick={() => {
        onSelectStop(stop.id)
        leafletMap?.closePopup()
      }}
    >
      <span className="map-view__stop-popup-btn__title"><strong>{title}</strong></span>
      <span className="map-view__stop-popup-btn__meta">{locationLine}</span>
      <span className="map-view__stop-popup-btn__meta">{timeLine}</span>
    </button>
  )
}

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
  const leafletMap = useMap()
  const markerViewModels = useMemo(() => {
    const iconCache = new Map()
    let regularOrder = 0
    return sortedStops.map((stop, index) => {
      const memberKey = membersKey(stop?.members, participants)
      const color = colorForMembersKey(memberKey)
      let iconKey = ''
      if (stop.stopType === 'flight') {
        iconKey = `flight:${color}`
        if (!iconCache.has(iconKey)) iconCache.set(iconKey, createSpecialIcon('✈', color))
      } else if (stop.stopType === 'lodging') {
        iconKey = `lodging:${color}`
        if (!iconCache.has(iconKey)) iconCache.set(iconKey, createLodgingHomeIcon(color))
      } else {
        regularOrder += 1
        iconKey = `regular:${regularOrder}:${color}`
        if (!iconCache.has(iconKey)) iconCache.set(iconKey, createStopIcon(regularOrder, color))
      }
      return { stop, index, icon: iconCache.get(iconKey) }
    })
  }, [sortedStops, participants])

  return (
    <>
      <TileLayer attribution="" url={MAP_TILE_URL} />
      {routeGroups.map((group) => (
        <RouteLayer key={group.key} stops={group.stops} color={group.color} groupKey={group.key} />
      ))}
      {markerViewModels.map(({ stop, icon }) => (
        <Marker
          key={stop.id}
          position={[readCoord(stop.latitude), readCoord(stop.longitude)]}
          icon={icon}
        >
          <Popup>
            <StopPopupBody
              stop={stop}
              stopCalendarDate={stopCalendarDate}
              onSelectStop={onSelectStop}
              leafletMap={leafletMap}
            />
          </Popup>
        </Marker>
      ))}
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
