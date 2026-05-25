import { useCallback, useMemo } from 'react'
import {
  computeGreedySettlementTransfers,
  netSettlementBetweenUserAndOther
} from '../utils/paymentSettlement'
import { normalizeMembersValue } from '../utils/members'
import {
  formatPaymentSplitMembersLabel,
  resolvePaymentSplitMembers
} from '../utils/paymentSplitMembers'
import { shortLabelFromRawName } from '../utils/participantLabels'

/** Stored payerName fallbacks that should not beat trip/profile labels. */
const GENERIC_PAYER_LABELS = new Set(['traveler', 'unknown', 'member', ''])

const EMPTY_PARTICIPANTS = []

/**
 * Flat payment list + per-payment split-member settlement overview vs current user.
 * Display labels use `shortLabelsById` (first name, disambiguated with last initial).
 */
export function useTripPaymentAnalytics(trip, userId, shortLabelsById = {}) {
  const flatPayments = useMemo(
    () => {
      const seenPaymentIds = new Set()
      return (trip?.itinerary || []).flatMap((day) =>
        (day.stops || []).flatMap((stop) =>
          (stop.payments || []).flatMap((payment) => {
            const pid = String(payment?.id || '').trim()
            if (pid) {
              if (seenPaymentIds.has(pid)) return []
              seenPaymentIds.add(pid)
            }
            return [
              {
                ...payment,
                splitMembers: payment.splitMembers ?? null,
                stopId: stop.id,
                stopTitle: stop.title,
                dayDate: day.date
              }
            ]
          })
        )
      )
    },
    [trip]
  )

  const labelForPayerId = useCallback(
    (payerId, payerNameOnPayment) => {
      const id = String(payerId || '').trim()
      if (id && shortLabelsById[id]) return shortLabelsById[id]
      const fromPayment = (payerNameOnPayment || '').trim()
      const paymentKey = fromPayment.toLowerCase()
      if (fromPayment && !GENERIC_PAYER_LABELS.has(paymentKey)) {
        return shortLabelFromRawName(fromPayment) || fromPayment
      }
      return 'Member'
    },
    [shortLabelsById]
  )

  const stopSplitBalances = useMemo(() => {
    const participants = normalizeMembersValue(trip?.participants) || []
    const balances = Object.fromEntries(participants.map((id) => [id, 0]))
    const payerTotals = {}
    let total = 0
    let userAssignedShare = 0

    for (const payment of flatPayments) {
      const amount = Number(payment.amount || 0)
      if (!Number.isFinite(amount) || amount <= 0) continue
      const payerId = String(payment.payerId || '').trim()
      const splitMembers = resolvePaymentSplitMembers(payment.splitMembers, participants, payerId)
      if (splitMembers.length === 0) continue
      const shareEach = amount / splitMembers.length

      total += amount
      if (payerId) {
        payerTotals[payerId] = (payerTotals[payerId] || 0) + amount
        balances[payerId] = (balances[payerId] || 0) + amount
      }
      for (const memberId of splitMembers) {
        balances[memberId] = (balances[memberId] || 0) - shareEach
      }
      if (userId && splitMembers.includes(userId)) {
        userAssignedShare += shareEach
      }
    }

    return {
      participants,
      balances,
      payerTotals,
      total,
      userAssignedShare
    }
  }, [flatPayments, trip?.participants, userId])

  const paymentTotals = useMemo(
    () => ({
      totals: stopSplitBalances.payerTotals,
      total: stopSplitBalances.total,
      assignedShare: stopSplitBalances.userAssignedShare,
      // backward-compatible alias; prefer `assignedShare`.
      share: stopSplitBalances.userAssignedShare,
      userNet: userId ? stopSplitBalances.balances[userId] || 0 : 0
    }),
    [stopSplitBalances, userId]
  )

  const paymentPayerDisplayNames = useMemo(() => {
    const map = {}
    for (const payment of flatPayments) {
      const id = payment.payerId
      if (!id || map[id]) continue
      map[id] = labelForPayerId(id, payment.payerName)
    }
    return map
  }, [flatPayments, labelForPayerId])

  const paymentOverviewVsYou = useMemo(() => {
    const participants = stopSplitBalances.participants
    const uid = userId

    if (participants.length === 0) {
      return { kind: 'empty', rows: [], yourNetVsShare: 0 }
    }

    const balances = Object.fromEntries(participants.map((id) => [id, stopSplitBalances.balances[id] || 0]))
    const transfers = computeGreedySettlementTransfers(balances)
    const yourNetVsShare = uid != null ? balances[uid] ?? 0 : 0

    if (!uid) {
      return { kind: 'no_user', rows: [], yourNetVsShare: 0, transfers }
    }
    if (!participants.includes(uid)) {
      return { kind: 'not_in_trip', rows: [], yourNetVsShare: 0, transfers }
    }

    const others = participants.filter((id) => id !== uid)
    const rows = others.map((otherId) => {
      const net = netSettlementBetweenUserAndOther(transfers, uid, otherId)
      const label = labelForPayerId(otherId, paymentPayerDisplayNames[otherId])
      return { otherId, label, net }
    })

    return { kind: 'ok', rows, yourNetVsShare, transfers }
  }, [stopSplitBalances, paymentPayerDisplayNames, labelForPayerId, userId])

  const allPayments = useMemo(
    () =>
      flatPayments.map((p) => ({
        ...p,
        payerDisplayName: labelForPayerId(p.payerId, p.payerName),
        splitMembersDisplay: formatPaymentSplitMembersLabel(
          p.splitMembers,
          trip?.participants,
          (id) => labelForPayerId(id, paymentPayerDisplayNames[id])
        )
      })),
    [flatPayments, labelForPayerId, trip?.participants, paymentPayerDisplayNames]
  )

  return {
    allPayments,
    paymentTotals,
    paymentPayerDisplayNames,
    paymentOverviewVsYou
  }
}
