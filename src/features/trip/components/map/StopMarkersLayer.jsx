import { useCallback, useEffect, useMemo, useState } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import { formatStopTime, getSortMinutes } from '../../../../utils/stopTime'
import { readCoord } from '../../../../utils/mapboxRoute'
import { colorForMembersKey, membersKey } from '../../utils/stopMembers'
import { clusterStopsByPixelProximity } from '../../utils/stopMarkerClusters'
import { createClusterMarkerIcon } from './clusterMarkerIcon'
import {
  createLodgingHomeIcon,
  createSpecialIcon,
  createStopIcon
} from './markerIcons'

function StopPopupBody({ stop, stopCalendarDate, onSelectStop, leafletMap }) {
  const title = stop.title || 'Stop'
  const timeLine = formatStopTime(stop.stopTime, stop.timestampHour)

  if (!onSelectStop) {
    return (
      <div className="map-view__stop-popup">
        <div className="map-view__stop-popup__title">
          <strong>{title}</strong>
        </div>
        <div className="map-view__stop-popup__time">{timeLine}</div>
      </div>
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
      <span className="map-view__stop-popup-btn__title">
        <strong>{title}</strong>
      </span>
      <span className="map-view__stop-popup-btn__time">{timeLine}</span>
    </button>
  )
}

function ClusterPopupBody({ stops, stopCalendarDate, onSelectStop, leafletMap }) {
  const ordered = [...stops].sort((a, b) => getSortMinutes(a) - getSortMinutes(b))
  const countLabel = `${ordered.length} stop${ordered.length === 1 ? '' : 's'}`
  return (
    <div className="map-view__cluster-popup">
      <p className="map-view__cluster-popup__head">{countLabel}</p>
      <ul className="map-view__cluster-popup-list" role="list" aria-label="Stops at this location">
        {ordered.map((stop) => (
          <li key={stop.id}>
            <StopPopupBody
              stop={stop}
              stopCalendarDate={stopCalendarDate}
              onSelectStop={onSelectStop}
              leafletMap={leafletMap}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

function buildMarkerViewModels(sortedStops, participants) {
  const iconCache = new Map()
  let regularOrder = 0
  return sortedStops.map((stop, index) => {
    const memberKey = membersKey(stop?.members, participants)
    const color = colorForMembersKey(memberKey)
    let iconKey = ''
    let icon
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
    icon = iconCache.get(iconKey)
    return { stop: { ...stop, _clusterColor: color }, index, icon }
  })
}

export default function StopMarkersLayer({
  sortedStops,
  participants = [],
  stopCalendarDate = '',
  onSelectStop
}) {
  const map = useMap()
  const markerViewModels = useMemo(
    () => buildMarkerViewModels(sortedStops, participants),
    [sortedStops, participants]
  )

  const [markerGroups, setMarkerGroups] = useState([])

  const recluster = useCallback(() => {
    const stops = markerViewModels.map((vm) => vm.stop)
    setMarkerGroups(clusterStopsByPixelProximity(map, stops))
  }, [map, markerViewModels])

  useMapEvents({
    zoomend: recluster,
    moveend: recluster,
    zoom: recluster,
    resize: recluster
  })

  useEffect(() => {
    recluster()
  }, [recluster])

  const viewModelById = useMemo(() => {
    const mapById = new Map()
    for (const vm of markerViewModels) mapById.set(vm.stop.id, vm)
    return mapById
  }, [markerViewModels])

  return (
    <>
      {markerGroups.map((group) => {
        if (group.kind === 'single') {
          const vm = viewModelById.get(group.stop.id)
          if (!vm) return null
          const { stop, icon } = vm
          return (
            <Marker
              key={stop.id}
              position={[readCoord(stop.latitude), readCoord(stop.longitude)]}
              icon={icon}
            >
              <Popup className="map-view-stop-popup">
                <StopPopupBody
                  stop={stop}
                  stopCalendarDate={stopCalendarDate}
                  onSelectStop={onSelectStop}
                  leafletMap={map}
                />
              </Popup>
            </Marker>
          )
        }

        const clusterKey = group.stops
          .map((s) => s.id)
          .sort()
          .join('|')
        const icon = createClusterMarkerIcon(group.stops, sortedStops)
        return (
          <Marker
            key={`cluster-${clusterKey}`}
            position={[group.latitude, group.longitude]}
            icon={icon}
          >
            <Popup className="map-view-stop-popup map-view-stop-popup--cluster">
              <ClusterPopupBody
                stops={group.stops}
                stopCalendarDate={stopCalendarDate}
                onSelectStop={onSelectStop}
                leafletMap={map}
              />
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}
