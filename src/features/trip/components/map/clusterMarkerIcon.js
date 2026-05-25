import L from 'leaflet'
import { computeClusterMarkerLayout } from '../../utils/stopMarkerClusters'
import { numberedStopOrder } from './markerIcons'

const markerStyleAttr = (color) => (color ? ` style="background:${color};"` : '')

const MAX_INNER_MARKERS = 5

function childMarkerHtml(stop, sortedStops, indexInSorted) {
  const color = stop._clusterColor || ''
  if (stop.stopType === 'flight') {
    return `<div class="stop-cluster-marker__child special"${markerStyleAttr(color)}>✈</div>`
  }
  if (stop.stopType === 'lodging') {
    return `<div class="stop-cluster-marker__child special lodging"${markerStyleAttr(
      color
    )}><svg class="lodging-marker-home" width="11" height="11" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>`
  }
  const order = numberedStopOrder(sortedStops, indexInSorted)
  return `<div class="stop-cluster-marker__child"${markerStyleAttr(color)}>${order}</div>`
}

function childWrapHtml(dx, dy, innerHtml) {
  return `<div class="stop-cluster-marker__child-wrap" style="--dx:${dx}px;--dy:${dy}px">${innerHtml}</div>`
}

function buildInnerMarkersHtml(stops, sortedStops) {
  const visible = stops.slice(0, MAX_INNER_MARKERS)
  const extra = stops.length - visible.length
  const slotCount = visible.length + (extra > 0 ? 1 : 0)
  const { offsets } = computeClusterMarkerLayout(slotCount)

  const parts = visible.map((stop, index) => {
    const stopIndex = sortedStops.findIndex((s) => s.id === stop.id)
    const offset = offsets[index] || { x: 0, y: 0 }
    return childWrapHtml(
      offset.x,
      offset.y,
      childMarkerHtml(stop, sortedStops, stopIndex >= 0 ? stopIndex : index)
    )
  })

  if (extra > 0) {
    const offset = offsets[visible.length] || offsets[offsets.length - 1] || { x: 0, y: 0 }
    parts.push(
      childWrapHtml(
        offset.x,
        offset.y,
        `<div class="stop-cluster-marker__child stop-cluster-marker__child--more">+${extra}</div>`
      )
    )
  }

  return parts.join('')
}

export function createClusterMarkerIcon(stops, sortedStops) {
  const visible = stops.slice(0, MAX_INNER_MARKERS)
  const extra = stops.length - visible.length
  const slotCount = visible.length + (extra > 0 ? 1 : 0)
  const { outerSizePx, childSizePx } = computeClusterMarkerLayout(slotCount)
  const inner = buildInnerMarkersHtml(stops, sortedStops)

  return L.divIcon({
    className: 'custom-stop-marker-wrapper stop-cluster-wrapper',
    html: `<div class="stop-cluster-marker" style="--cluster-size:${outerSizePx}px;--cluster-child-size:${childSizePx}px" aria-label="${stops.length} stops grouped">
      <div class="stop-cluster-marker__outer">${inner}</div>
    </div>`,
    iconSize: [outerSizePx, outerSizePx],
    iconAnchor: [outerSizePx / 2, outerSizePx / 2]
  })
}
