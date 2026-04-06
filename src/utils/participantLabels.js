/** Single string for trip roster / money UI (displayName, else email). */
export function buildParticipantLabel({ displayName, email } = {}) {
  const a = (displayName || '').trim()
  const b = (email || '').trim()
  return a || b || ''
}
