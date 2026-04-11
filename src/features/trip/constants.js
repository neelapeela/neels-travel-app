/** How long “Code copied” / “Link copied” stays visible in the share menu. */
export const SHARE_FEEDBACK_CLEAR_MS = 1500

/** Delay before calling Mapbox Directions so Firestore snapshot churn does not stack redundant fetches. */
export const ROUTE_FETCH_DEBOUNCE_MS = 350

/**
 * Raster basemap: Carto **Voyager** — softer and more “travel guide” than Positron (`light_all`),
 * still free for OSM-backed apps with attribution. Subdomains a–c.
 * @see https://carto.com/basemaps/
 */
export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

/** Reference copy for Carto/OSM — not shown on map (`MapView` uses `attributionControl={false}`). */
export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

/** Reference copy for Mapbox Directions (see `mapboxRoute.js`); not shown on map. */
export const MAPBOX_ROUTE_ATTRIBUTION =
  '<a href="https://www.mapbox.com/about/maps/">© Mapbox</a>'

/** Never leave the map pane blank while destination geocoding is pending/fails. */
export const MAP_FALLBACK_CENTER = { lat: 37.7749, lng: -122.4194 }

/** Stacked map ↔ timeline split (mobile); persisted height for the map band */
export const TRIP_MAP_BAND_STORAGE_KEY = 'tripMapBandHeightPx'
/** Large touch target (visual grip remains small via CSS pseudo-element). */
export const TRIP_TIMELINE_SPLIT_HANDLE_PX = 12
export const TRIP_MAP_BAND_MIN_PX = 132
export const TRIP_TIMELINE_MIN_PX = 140
/** Same breakpoint as `trip.css` mobile timeline rules */
export const TRIP_TIMELINE_SPLIT_MQ = '(max-width: 768px)'
