const KEY_PREFIX = 'travel-app-trip-tutorial-seen'

/**
 * @param {string | undefined} userId
 * @returns {boolean} true if this user has finished the trip tutorial before (or we should not show it).
 */
export function hasSeenTripTutorial(userId) {
  if (!userId) return true
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(`${KEY_PREFIX}:${userId}`) === '1'
  } catch {
    return false
  }
}

/**
 * @param {string | undefined} userId
 */
export function markTripTutorialSeen(userId) {
  if (!userId || typeof window === 'undefined') return
  try {
    window.localStorage.setItem(`${KEY_PREFIX}:${userId}`, '1')
  } catch {
    /* quota / private mode */
  }
}
