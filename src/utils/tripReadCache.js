/**
 * Read-only trip snapshots in IndexedDB for offline viewing.
 * Does not queue Firestore writes — only mirrors last server-backed data.
 */

const DB_NAME = 'travel-app-trip-read-cache'
const DB_VERSION = 1
const STORE = 'tripSnapshots'

/** @param {unknown} value */
function isFirestoreTimestampLike(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.toDate === 'function' &&
    Number.isFinite(value.seconds)
  )
}

/** @param {string} _key @param {unknown} value */
export function tripJsonReplacer(_key, value) {
  if (isFirestoreTimestampLike(value)) {
    return { __travelTsIso: value.toDate().toISOString() }
  }
  return value
}

/** @param {string} _key @param {unknown} value */
export function tripJsonReviver(_key, value) {
  if (value && typeof value === 'object' && typeof value.__travelTsIso === 'string') {
    return value.__travelTsIso
  }
  return value
}

export function tripToCacheJson(trip) {
  return JSON.stringify(trip, tripJsonReplacer)
}

export function tripFromCacheJson(json) {
  return JSON.parse(json, tripJsonReviver)
}

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'tripId' })
      }
    }
  })
}

/**
 * @param {string} tripId
 * @param {object} trip — normalized trip object from subscribeToTripById
 */
export async function putTripSnapshot(tripId, trip) {
  if (!tripId || !trip || typeof indexedDB === 'undefined') return
  try {
    const db = await openDb()
    if (!db) return
    const row = {
      tripId,
      json: tripToCacheJson(trip),
      savedAt: Date.now()
    }
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.objectStore(STORE).put(row)
    })
    db.close()
  } catch (e) {
    console.warn('[tripReadCache] put failed', e)
  }
}

/**
 * @param {string} tripId
 * @returns {Promise<object|null>}
 */
export async function getTripSnapshot(tripId) {
  if (!tripId || typeof indexedDB === 'undefined') return null
  try {
    const db = await openDb()
    if (!db) return null
    const row = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).get(tripId)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
    db.close()
    if (!row?.json) return null
    return tripFromCacheJson(row.json)
  } catch (e) {
    console.warn('[tripReadCache] get failed', e)
    return null
  }
}

/**
 * @param {string} tripId
 */
export async function deleteTripSnapshot(tripId) {
  if (!tripId || typeof indexedDB === 'undefined') return
  try {
    const db = await openDb()
    if (!db) return
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.objectStore(STORE).delete(tripId)
    })
    db.close()
  } catch (e) {
    console.warn('[tripReadCache] delete failed', e)
  }
}
