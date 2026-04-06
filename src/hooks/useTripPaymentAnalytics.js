import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  computeGreedySettlementTransfers,
  netSettlementBetweenUserAndOther
} from '../utils/paymentSettlement'
import { getParticipantDisplayNamesByIds } from '../api/user'

/** Stored payerName fallbacks that should not beat trip/profile labels. */
const GENERIC_PAYER_LABELS = new Set(['traveler', 'unknown', 'member', ''])

const EMPTY_PARTICIPANTS = []

/**
 * Flat payment list, per-payer totals, equal-split overview vs current user.
 * Labels prefer `trip.participantNames` (every participant can read the trip), then
 * `users/{uid}` when rules allow, then non-generic `payerName` on the payment row.
 */
export function useTripPaymentAnalytics(trip, userId) {
  const [profileNamesById, setProfileNamesById] = useState({})

  const flatPayments = useMemo(
    () =>
      (trip?.itinerary || []).flatMap((day) =>
        (day.stops || []).flatMap((stop) =>
          (stop.payments || []).map((payment) => ({
            ...payment,
            stopTitle: stop.title,
            dayDate: day.date
          }))
        )
      ),
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

  const paymentTotals = useMemo(() => {
    const totals = {}
    for (const payment of flatPayments) {
      totals[payment.payerId] = (totals[payment.payerId] || 0) + Number(payment.amount || 0)
    }
    const participants = trip?.participants || []
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0)
    const share = participants.length > 0 ? total / participants.length : 0
    const userTotal = totals[userId] || 0
    return { totals, total, share, userNet: userTotal - share }
  }, [flatPayments, trip?.participants, userId])

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
    const participants = trip?.participants || []
    const uid = userId
    const { totals, share } = paymentTotals

    if (participants.length === 0) {
      return { kind: 'empty', rows: [], yourNetVsShare: 0 }
    }

    const balances = {}
    for (const id of participants) {
      balances[id] = (totals[id] || 0) - share
    }
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
    trip?.participants,
    paymentTotals,
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
