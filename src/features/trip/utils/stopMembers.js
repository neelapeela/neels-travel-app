export function normalizeMembersValue(value) {
  if (value == null) return null
  if (!Array.isArray(value)) return null
  const cleaned = value.map((v) => String(v || '').trim()).filter(Boolean)
  return cleaned.length ? Array.from(new Set(cleaned)).sort() : null
}

export function normalizeMembersForParticipants(members, allParticipants) {
  const all = normalizeMembersValue(allParticipants) || []
  if (!all.length) return null
  const selected = normalizeMembersValue(members)
  if (selected == null) return null
  const allSet = new Set(all)
  const filtered = selected.filter((id) => allSet.has(id))
  if (!filtered.length) return null
  if (filtered.length === all.length && filtered.every((id, idx) => id === all[idx])) return null
  return filtered
}

export function membersKey(members, allParticipants) {
  const selected = normalizeMembersValue(members)
  if (selected == null) return 'ALL'

  const all = normalizeMembersValue(allParticipants) || []
  if (!all.length) return `SET:${selected.join(',')}`

  const allSet = new Set(all)
  const filtered = selected.filter((id) => allSet.has(id))
  if (!filtered.length) {
    // Keep a stable non-ALL key for legacy/non-overlapping IDs so routes don't collapse to brown.
    return `SET:${selected.join(',')}`
  }
  if (filtered.length === all.length && filtered.every((id, index) => id === all[index])) return 'ALL'
  return `SET:${filtered.join(',')}`
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function colorForMembersKey(key) {
  if (key === 'ALL') return '#8B6F5A' // default trip brown for "everyone together"
  const hash = hashString(key)
  const hue = hash % 360
  const saturation = 68 + (Math.floor(hash / 360) % 14) // 68-81
  const lightness = 38 + (Math.floor(hash / (360 * 14)) % 12) // 38-49
  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

