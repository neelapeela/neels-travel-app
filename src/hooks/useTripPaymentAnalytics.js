import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  computeGreedySettlementTransfers,
  netSettlementBetweenUserAndOther
} from '../utils/paymentSettlement'
import { getParticipantDisplayNamesByIds } from '../api/user'
import { normalizeMembersValue } from '../utils/members'

/** Stored payerName fallbacks that should not beat trip/profile labels. */
const GENERIC_PAYER_LABELS = new Set(['traveler', 'unknown', 'member', ''])

const EMPTY_PARTICIPANTS = []

const normalizeIdList = (value) => {
  return normalizeMembersValue(value) || []
}

const resolveStopSplitMembers = (stopMembers, tripParticipants, payerId) => {
  const all = normalizeIdList(tripParticipants)
  const explicit = normalizeIdList(stopMembers)

  // null/empty stop members => all current trip members
  if (stopMembers == null || explicit.length === 0) {
    if (all.length > 0) return all
    return payerId ? [payerId] : []
  }

  if (all.length === 0) return explicit
  const allSet = new Set(all)
  const filtered = explicit.filter((id) => allSet.has(id))
  if (filtered.length > 0) return filtered
  // Explicit members no longer overlap current participants: default to all current trip members.
  return all
}

/**
 * Flat payment list + stop-member-aware settlement overview vs current user.
 * Labels prefer `trip.participantNames` (every participant can read the trip), then
 * `users/{uid}` when rules allow, then non-generic `payerName` on the payment row.
 */
export function useTripPaymentAnalytics(trip, userId) {
  const [profileNamesById, setProfileNamesById] = useState({})

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
                stopMembers: stop.members ?? null,
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

  const participantIds = useMemo(
    () => trip?.participants ?? EMPTY_PARTICIPANTS,
    [trip?.participants]
  )
  const participantIdsKey = useMemo(() => [...participantIds].sort().join(','), [participantIds])
  const namesOnTrip = useMemo(
    () =>
      trip?.participantNames && typeof trip.participantNames === 'object' ? trip.participantNames : {},
    [trip?.participantNames]
  )

  useEffect(() => {
    if (participantIds.length === 0) {
      setProfileNamesById({})
      return undefined
    }
    let cancelled = false
    getParticipantDisplayNamesByIds(participantIds).then((map) => {
      if (!cancelled) setProfileNamesById(map)
    })
    return () => {
      cancelled = true
    }
  }, [participantIds, participantIdsKey])

  const labelForPayerId = useCallback(
    (payerId, payerNameOnPayment) => {
      const fromTrip = (namesOnTrip[payerId] || '').trim()
      if (fromTrip) return fromTrip
      const fromProfile = (profileNamesById[payerId] || '').trim()
      if (fromProfile) return fromProfile
      const fromPayment = (payerNameOnPayment || '').trim()
      const paymentKey = fromPayment.toLowerCase()
      if (fromPayment && !GENERIC_PAYER_LABELS.has(paymentKey)) return fromPayment
      return 'Member'
    },
    [namesOnTrip, profileNamesById]
  )

  const stopSplitBalances = useMemo(() => {
    const participants = normalizeIdList(trip?.participants)
    const balances = Object.fromEntries(participants.map((id) => [id, 0]))
    const payerTotals = {}
    let total = 0
    let userAssignedShare = 0

    for (const payment of flatPayments) {
      const amount = Number(payment.amount || 0)
      if (!Number.isFinite(amount) || amount <= 0) continue
      const payerId = String(payment.payerId || '').trim()
      const splitMembers = resolveStopSplitMembers(payment.stopMembers, participants, payerId)
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
      const name = (payment.payerName || '').trim()
      if (name) map[id] = name
    }
    return map
  }, [flatPayments])

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
  }, [
    stopSplitBalances,
    paymentPayerDisplayNames,
    labelForPayerId,
    userId
  ])

  const allPayments = useMemo(
    () =>
      flatPayments.map((p) => ({
        ...p,
        payerDisplayName: labelForPayerId(p.payerId, p.payerName)
      })),
    [flatPayments, labelForPayerId]
  )

  return {
    allPayments,
    paymentTotals,
    paymentPayerDisplayNames,
    paymentOverviewVsYou
  }
}
