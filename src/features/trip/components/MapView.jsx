import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { formatStopTime } from '../../../utils/stopTime'
import { readCoord } from '../../../utils/mapboxRoute'
import { useDebouncedDrivingRoute } from '../hooks/useDebouncedDrivingRoute'
import {
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_URL,
  MAPBOX_ROUTE_ATTRIBUTION
} from '../constants'
import { FitStopsToView, FlyToSelectedStop, ResizeHandler } from './map/leafletMapLayers'
import {
  createLodgingHomeIcon,
  createSpecialIcon,
  createStopIcon,
  numberedStopOrder
} from './map/markerIcons'
import '../trip.css'

/**
 * Popup content is portaled outside React-Leaflet context, so the map is passed from `MapInner`
 * (which calls `useMap()` under `MapContainer`).
 */
function StopPopupBody({ stop, onSelectStop, leafletMap }) {
  const title = stop.title || 'Stop'
  const timeLine = formatStopTime(stop.stopTime, stop.timestampHour)
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
  routeToDraw,
  polylineKey,
  focusStop,
  focusLeftPaddingPx,
  fitViewKey,
  onSelectStop
}) {
  const leafletMap = useMap()

  return (
    <>
      <TileLayer
        attribution={`${MAP_TILE_ATTRIBUTION} · ${MAPBOX_ROUTE_ATTRIBUTION}`}
        url={MAP_TILE_URL}
      />
      {routeToDraw.length > 1 && (
        <Polyline
          key={polylineKey}
          positions={routeToDraw}
          pathOptions={{ color: '#8B6F5A', weight: 5, opacity: 0.92 }}
        />
      )}
      {sortedStops.map((stop, index) => (
        <Marker
          key={stop.id}
          position={[readCoord(stop.latitude), readCoord(stop.longitude)]}
          icon={
            stop.stopType === 'flight'
              ? createSpecialIcon('✈')
              : stop.stopType === 'lodging'
                ? createLodgingHomeIcon()
                : createStopIcon(numberedStopOrder(sortedStops, index))
          }
        >
          <Popup>
            <StopPopupBody stop={stop} onSelectStop={onSelectStop} leafletMap={leafletMap} />
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
  onSelectStop
}) {
  const { sortedStops, routeToDraw, polylineKey } = useDebouncedDrivingRoute(stops)

  return (
    <div className="map-view">
      <MapContainer
        center={coordinates}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <MapInner
          coordinates={coordinates}
          shouldResizeMap={shouldResizeMap}
          layoutResizeKey={layoutResizeKey}
          sortedStops={sortedStops}
          routeToDraw={routeToDraw}
          polylineKey={polylineKey}
          focusStop={focusStop}
          focusLeftPaddingPx={focusLeftPaddingPx}
          fitViewKey={fitViewKey}
          onSelectStop={onSelectStop}
        />
      </MapContainer>
    </div>
  )
}
