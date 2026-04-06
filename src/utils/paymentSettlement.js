/** Equal-split settlement: greedy debtor→creditor transfers; net between two users from that plan. */

export const SETTLEMENT_EPS = 0.005

export function computeGreedySettlementTransfers(balancesById) {
  const debtors = []
  const creditors = []
  for (const [id, b] of Object.entries(balancesById)) {
    if (b < -SETTLEMENT_EPS) debtors.push({ id, remaining: -b })
    else if (b > SETTLEMENT_EPS) creditors.push({ id, remaining: b })
  }
  const transfers = []
  let di = 0
  let ci = 0
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di]
    const c = creditors[ci]
    const amt = Math.round(Math.min(d.remaining, c.remaining) * 100) / 100
    if (amt > 0) transfers.push({ from: d.id, to: c.id, amount: amt })
    d.remaining = Math.round((d.remaining - amt) * 100) / 100
    c.remaining = Math.round((c.remaining - amt) * 100) / 100
    if (d.remaining < SETTLEMENT_EPS) di++
    if (c.remaining < SETTLEMENT_EPS) ci++
  }
  return transfers
}

/** Net amount that `otherId` pays `userId` in the settlement (positive = money toward you). */
export function netSettlementBetweenUserAndOther(transfers, userId, otherId) {
  let net = 0
  for (const t of transfers) {
    if (t.from === otherId && t.to === userId) net += t.amount
    if (t.from === userId && t.to === otherId) net -= t.amount
  }
  return net
}
