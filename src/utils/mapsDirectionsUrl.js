/**
 * Open driving directions from the user’s current location to `lat`,`lng` in a new tab.
 * Relies on Apple/Google interpreting “Current Location” as the device position when permitted.
 */
export function openDrivingDirectionsFromCurrentLocation(provider, lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return
  const dest = `${lat},${lng}`
  let url
  if (provider === 'apple') {
    url = `https://maps.apple.com/?saddr=${encodeURIComponent('Current Location')}&daddr=${encodeURIComponent(dest)}&dirflg=d`
  } else {
    url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('Current Location')}&destination=${encodeURIComponent(dest)}&travelmode=driving`
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
