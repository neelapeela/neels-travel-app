/**
 * Participant display names: first name only; last initial when first names collide.
 */

/** Single string for trip roster storage (displayName, else email). */
export function buildParticipantLabel({ displayName, email } = {}) {
  const a = (displayName || '').trim()
  const b = (email || '').trim()
  return a || b || ''
}

/**
 * @param {string} raw
 * @returns {{ firstName: string, lastInitial: string }}
 */
export function parsePersonName(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) return { firstName: '', lastInitial: '' }

  if (trimmed.includes('@')) {
    const local = trimmed.split('@')[0] || ''
    const tokens = local.replace(/[._+-]+/g, ' ').split(/\s+/).filter(Boolean)
    if (tokens.length === 0) return { firstName: '', lastInitial: '' }
    if (tokens.length === 1) return { firstName: capitalizeToken(tokens[0]), lastInitial: '' }
    const firstName = capitalizeToken(tokens[0])
    const last = tokens[tokens.length - 1]
    const lastInitial = last.length > 0 ? last[0].toUpperCase() : ''
    return { firstName, lastInitial }
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return { firstName: '', lastInitial: '' }
  if (tokens.length === 1) {
    return { firstName: capitalizeToken(tokens[0]), lastInitial: '' }
  }

  const firstName = capitalizeToken(tokens[0])
  const last = tokens[tokens.length - 1]
  const lastInitial = last.length > 0 ? last[0].toUpperCase() : ''
  return { firstName, lastInitial }
}

function capitalizeToken(token) {
  if (!token) return ''
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase()
}

/**
 * First-name label for one person (no duplicate disambiguation).
 */
export function shortLabelFromRawName(raw) {
  const { firstName, lastInitial } = parsePersonName(raw)
  if (!firstName) {
    const fallback = String(raw || '').trim()
    return fallback || ''
  }
  return firstName
}

function firstNameKey({ firstName, raw }) {
  const base = (firstName || '').trim().toLowerCase()
  if (base) return base
  return String(raw || '').trim().toLowerCase() || 'member'
}

function labelFromParts(parts, useLastInitial) {
  const { firstName, lastInitial } = parts
  if (!firstName) return ''
  if (useLastInitial && lastInitial) return `${firstName} ${lastInitial}.`
  return firstName
}

/**
 * @param {string[]} participantIds
 * @param {Record<string, string | null | undefined>} rawNamesById
 * @returns {Record<string, string>}
 */
export function buildShortParticipantLabels(participantIds, rawNamesById = {}) {
  const ids = Array.from(new Set((participantIds || []).filter(Boolean).map(String)))
  const entries = ids.map((id) => {
    const raw = String(rawNamesById[id] ?? '').trim()
    return { id, raw, ...parsePersonName(raw) }
  })

  const counts = new Map()
  for (const entry of entries) {
    const key = firstNameKey(entry)
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const result = {}
  for (const entry of entries) {
    const duplicate = (counts.get(firstNameKey(entry)) || 0) > 1
    let label = labelFromParts(entry, duplicate)
    if (!label) label = 'Member'
    result[entry.id] = label
  }
  return result
}

/**
 * Resolve a display label for one id when a full roster map may already exist.
 */
export function shortLabelForParticipantId(id, rawNamesById, participantIds) {
  const key = String(id || '').trim()
  if (!key) return 'Member'
  const ids = participantIds?.length ? participantIds : [key]
  const labels = buildShortParticipantLabels(ids, rawNamesById)
  return labels[key] || 'Member'
}
