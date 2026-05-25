import { readCoord } from '../../../utils/mapboxRoute'

/** Center distance (px) below which markers are grouped at the current zoom. */
export const STOP_MARKER_CLUSTER_THRESHOLD_PX = 34

export function stopHasMapPosition(stop) {
  const lat = readCoord(stop?.latitude)
  const lng = readCoord(stop?.longitude)
  return Number.isFinite(lat) && Number.isFinite(lng)
}

/**
 * Group stops whose screen positions overlap at the current map zoom.
 * @param {import('leaflet').Map} map
 * @param {object[]} stops
 * @param {number} thresholdPx
 * @returns {Array<{ kind: 'single', stop: object } | { kind: 'cluster', stops: object[], latitude: number, longitude: number }>}
 */
export function clusterStopsByPixelProximity(map, stops, thresholdPx = STOP_MARKER_CLUSTER_THRESHOLD_PX) {
  const valid = (stops || []).filter(stopHasMapPosition)
  if (valid.length === 0) return []
  if (valid.length === 1) {
    return [{ kind: 'single', stop: valid[0] }]
  }

  const entries = valid.map((stop) => {
    const lat = readCoord(stop.latitude)
    const lng = readCoord(stop.longitude)
    const point = map.latLngToContainerPoint([lat, lng])
    return { stop, lat, lng, x: point.x, y: point.y }
  })

  return groupEntriesByPixelProximity(entries, thresholdPx)
}

/**
 * @param {{ stop: object, lat: number, lng: number, x: number, y: number }[]} entries
 */
export function groupEntriesByPixelProximity(entries, thresholdPx = STOP_MARKER_CLUSTER_THRESHOLD_PX) {
  if (entries.length === 0) return []
  if (entries.length === 1) {
    return [{ kind: 'single', stop: entries[0].stop }]
  }

  const parent = entries.map((_, index) => index)
  const find = (index) => {
    if (parent[index] !== index) parent[index] = find(parent[index])
    return parent[index]
  }
  const union = (a, b) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent[rb] = ra
  }

  const thresholdSq = thresholdPx * thresholdPx
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const dx = entries[i].x - entries[j].x
      const dy = entries[i].y - entries[j].y
      if (dx * dx + dy * dy <= thresholdSq) union(i, j)
    }
  }

  const groups = new Map()
  for (let i = 0; i < entries.length; i += 1) {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(entries[i])
  }

  return groupsToMarkerGroups(groups)
}

function groupsToMarkerGroups(groups) {
  return Array.from(groups.values()).map((group) => {
    if (group.length === 1) {
      return { kind: 'single', stop: group[0].stop }
    }
    let latSum = 0
    let lngSum = 0
    for (const item of group) {
      latSum += item.lat
      lngSum += item.lng
    }
    return {
      kind: 'cluster',
      stops: group.map((item) => item.stop),
      latitude: latSum / group.length,
      longitude: lngSum / group.length
    }
  })
}

/** Diameter of each mini marker inside a cluster (px). */
export const CLUSTER_CHILD_SIZE_PX = 20
/** Minimum gap between mini marker edges (px). */
export const CLUSTER_CHILD_GAP_PX = 5
/** Padding from mini marker edge to outer halo edge (px). */
export const CLUSTER_OUTER_PADDING_PX = 6

/**
 * Layout mini markers evenly inside a true circle sized to fit all slots.
 * @param {number} slotCount — visible stops plus optional "+N" badge slot
 * @returns {{ outerSizePx: number, childSizePx: number, offsets: { x: number, y: number }[] }}
 */
export function computeClusterMarkerLayout(slotCount) {
  const n = Math.max(1, Math.min(slotCount, 6))
  const childSizePx = CLUSTER_CHILD_SIZE_PX
  const childHalf = childSizePx / 2

  if (n === 1) {
    const outerSizePx = childSizePx + 2 * CLUSTER_OUTER_PADDING_PX
    return { outerSizePx, childSizePx, offsets: [{ x: 0, y: 0 }] }
  }

  const minCenterDistance = childSizePx + CLUSTER_CHILD_GAP_PX
  const ringRadius =
    n === 2 ? minCenterDistance / 2 : minCenterDistance / (2 * Math.sin(Math.PI / n))

  const outerRadius = ringRadius + childHalf + CLUSTER_OUTER_PADDING_PX
  const outerSizePx = Math.ceil(outerRadius * 2)

  const offsets = Array.from({ length: n }, (_, index) => {
    const angle = (Math.PI * 2 * index) / n - Math.PI / 2
    return {
      x: Math.round(Math.cos(angle) * ringRadius * 10) / 10,
      y: Math.round(Math.sin(angle) * ringRadius * 10) / 10
    }
  })

  return { outerSizePx, childSizePx, offsets }
}

/** @deprecated Use computeClusterMarkerLayout */
export function innerClusterMarkerOffsets(count) {
  return computeClusterMarkerLayout(count).offsets
}

/** @deprecated Use computeClusterMarkerLayout */
export function clusterOuterSizePx(slotCount) {
  return computeClusterMarkerLayout(slotCount).outerSizePx
}
