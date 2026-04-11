/** True when the browser reports a live network interface (not a guarantee of Firebase/API reachability). */
export function isBrowserOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}
