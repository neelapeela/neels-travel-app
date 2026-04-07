/** How long “Code copied” / “Link copied” stays visible in the share menu. */
export const SHARE_FEEDBACK_CLEAR_MS = 1500

/** Delay before calling OSRM so Firestore snapshot churn does not abort every in-flight route request. */
export const OSRM_FETCH_DEBOUNCE_MS = 350

/**
 * Raster basemap: Carto **Voyager** — softer and more “travel guide” than Positron (`light_all`),
 * still free for OSM-backed apps with attribution. Subdomains a–c.
 * @see https://carto.com/basemaps/
 */
export const MAP_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

export const MAP_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
