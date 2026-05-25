import { normalizeMembersValue } from './members'

const normalizeIdList = (value) => normalizeMembersValue(value) || []

/**
 * Who shares the cost of a payment.
 * - `splitMembers` on the payment: null/empty => all current trip participants
 * - explicit id list => only those participants (filtered to current roster)
 * - missing on legacy rows => all current trip participants (not stop members)
 */
export function resolvePaymentSplitMembers(splitMembers, tripParticipants, payerId) {
  const all = normalizeIdList(tripParticipants)
  const explicit = normalizeIdList(splitMembers)

  if (splitMembers == null || explicit.length === 0) {
    if (all.length > 0) return all
    return payerId ? [payerId] : []
  }

  if (all.length === 0) return explicit
  const allSet = new Set(all)
  const filtered = explicit.filter((id) => allSet.has(id))
  if (filtered.length > 0) return filtered
  return all
}

export function formatPaymentSplitMembersLabel(splitMembers, tripParticipants, nameForId) {
  const resolved = resolvePaymentSplitMembers(splitMembers, tripParticipants, '')
  const all = normalizeIdList(tripParticipants)
  if (resolved.length === 0) return '—'
  if (all.length > 0 && resolved.length === all.length && resolved.every((id, i) => id === all[i])) {
    return 'Everyone'
  }
  const labels = resolved.map((id) => {
    const name = (nameForId?.(id) || '').trim()
    return name || 'Member'
  })
  return labels.join(', ')
}
