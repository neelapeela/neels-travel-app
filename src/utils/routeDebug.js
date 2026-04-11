/** Console `[route]` diagnostics when `DEV` or `VITE_ROUTE_DEBUG=true`. */

export function isRouteDebugEnabled() {
  return (
    (typeof import.meta !== 'undefined' && import.meta.env?.DEV) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ROUTE_DEBUG === 'true')
  )
}

export function routeDebugLog(label, detail) {
  if (!isRouteDebugEnabled()) return
  if (detail !== undefined) console.info('[route]', label, detail)
  else console.info('[route]', label)
}
