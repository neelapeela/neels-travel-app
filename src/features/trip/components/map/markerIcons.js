import L from 'leaflet'

export const createStopIcon = (orderNumber) =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker">${orderNumber}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

export const createSpecialIcon = (symbol) =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker special">${symbol}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

export const createLodgingHomeIcon = () =>
  L.divIcon({
    className: 'custom-stop-marker-wrapper',
    html: `<div class="custom-stop-marker special lodging" title="Lodging"><svg class="lodging-marker-home" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })

/** 1-based order among non-flight/non-lodging stops up to and including `index`. */
export function numberedStopOrder(sortedStops, index) {
  return sortedStops.filter(
    (item, itemIndex) => item.stopType !== 'flight' && item.stopType !== 'lodging' && itemIndex <= index
  ).length
}
