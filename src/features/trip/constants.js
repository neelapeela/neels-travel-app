import { getMapboxAccessToken } from '../../utils/mapboxRoute'

/** How long “Code copied” / “Link copied” stays visible in the share menu. */
export const SHARE_FEEDBACK_CLEAR_MS = 1500

/** Delay before calling Mapbox Directions so Firestore snapshot churn does not stack redundant fetches. */
export const ROUTE_FETCH_DEBOUNCE_MS = 350

/**
 * Optional Mapbox Studio style (`mapbox://styles/user/id` or a style JSON URL).
 * When unset, the trip map uses the in-repo Voyager-inspired Mapbox style.
 */
export function getMapboxStyleOverride() {
  const raw = typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAPBOX_STYLE
  return typeof raw === 'string' ? raw.trim() : ''
}

/** Raster fallback when `VITE_MAPBOX_ACCESS_TOKEN` is missing. */
export const MAP_TILE_FALLBACK_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

/** Reference copy for Mapbox tiles + Directions; not shown on map. */
export const MAPBOX_ROUTE_ATTRIBUTION =
  '<a href="https://www.mapbox.com/about/maps/">© Mapbox</a> <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>'

export { getMapboxAccessToken }

/** Never leave the map pane blank while destination geocoding is pending/fails. */
export const MAP_FALLBACK_CENTER = { lat: 37.7749, lng: -122.4194 }

/** Stacked map ↔ timeline split (mobile); persisted height for the map band */
export const TRIP_MAP_BAND_STORAGE_KEY = 'tripMapBandHeightPx'
/** Layout height of split row (mobile); wider touch area via `.trip-timeline-split-handle::after` in trip.css. */
export const TRIP_TIMELINE_SPLIT_HANDLE_PX = 12
export const TRIP_MAP_BAND_MIN_PX = 132
export const TRIP_TIMELINE_MIN_PX = 140
/** Same breakpoint as `trip.css` mobile timeline rules */
export const TRIP_TIMELINE_SPLIT_MQ = '(max-width: 768px)'
