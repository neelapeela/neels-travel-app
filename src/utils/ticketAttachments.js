/** @typedef {{ id: string, url: string, publicId?: string, createdAt?: string }} TicketPhoto */
/** @typedef {{ id: string, url: string, title?: string, label?: string, createdAt?: string }} TicketLink */

/**
 * @param {unknown} stop
 * @returns {{ photos: TicketPhoto[], links: TicketLink[] }}
 */
export function getTicketsFromStop(stop) {
  const raw = stop?.metadata?.tickets
  const photos = Array.isArray(raw?.photos) ? raw.photos.filter((p) => p && typeof p.url === 'string' && p.id) : []
  const links = Array.isArray(raw?.links) ? raw.links.filter((l) => l && typeof l.url === 'string' && l.id) : []
  return { photos, links }
}

/**
 * Normalize user-typed URL (add https if scheme missing).
 * @param {string} raw
 * @returns {string|null} null if empty or invalid
 */
export function normalizeTicketLinkUrl(raw) {
  const trimmed = (raw || '').trim()
  if (!trimmed) return null
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  if (typeof URL !== 'undefined' && typeof URL.canParse === 'function') {
    return URL.canParse(candidate) ? candidate : null
  }
  try {
    return new URL(candidate).href
  } catch {
    return null
  }
}

const MAX_LINK_TITLE_LEN = 120

/**
 * @param {string} raw
 * @returns {string|undefined} undefined if empty after trim
 */
export function normalizeTicketLinkTitle(raw) {
  const t = (raw || '').trim()
  if (!t) return undefined
  return t.length > MAX_LINK_TITLE_LEN ? t.slice(0, MAX_LINK_TITLE_LEN) : t
}

/**
 * Visible text for a ticket link anchor (title, legacy label, or URL).
 * @param {TicketLink} link
 */
export function getTicketLinkLabel(link) {
  const title = typeof link?.title === 'string' ? link.title.trim() : ''
  if (title) return title
  const legacy = typeof link?.label === 'string' ? link.label.trim() : ''
  if (legacy) return legacy
  return typeof link?.url === 'string' ? link.url : ''
}
