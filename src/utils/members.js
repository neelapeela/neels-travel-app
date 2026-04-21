export function normalizeMembersValue(value) {
  if (value == null) return null
  if (!Array.isArray(value)) return null
  const cleaned = value.map((v) => String(v || '').trim()).filter(Boolean)
  return cleaned.length ? Array.from(new Set(cleaned)).sort() : null
}

export function membersValueEqual(left, right) {
  const a = normalizeMembersValue(left)
  const b = normalizeMembersValue(right)
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  if (a.length !== b.length) return false
  return a.every((id, index) => id === b[index])
}

