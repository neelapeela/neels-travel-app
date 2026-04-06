import { describe, expect, it } from 'vitest'
import {
  SETTLEMENT_EPS,
  computeGreedySettlementTransfers,
  netSettlementBetweenUserAndOther
} from '../../src/utils/paymentSettlement'

describe('computeGreedySettlementTransfers', () => {
  it('settles two-person equal split', () => {
    const transfers = computeGreedySettlementTransfers({ a: 10, b: -10 })
    expect(transfers).toEqual([{ from: 'b', to: 'a', amount: 10 }])
  })

  it('handles three-way zero-sum balances', () => {
    const transfers = computeGreedySettlementTransfers({
      a: 20,
      b: -10,
      c: -10
    })
    const totalFromB = transfers.filter((t) => t.from === 'b').reduce((s, t) => s + t.amount, 0)
    const totalFromC = transfers.filter((t) => t.from === 'c').reduce((s, t) => s + t.amount, 0)
    expect(totalFromB + totalFromC).toBeCloseTo(20, 5)
    expect(transfers.every((t) => t.amount > 0)).toBe(true)
  })

  it('ignores near-zero dust', () => {
    const transfers = computeGreedySettlementTransfers({
      a: SETTLEMENT_EPS / 2,
      b: -SETTLEMENT_EPS / 2
    })
    expect(transfers).toEqual([])
  })
})

describe('netSettlementBetweenUserAndOther', () => {
  it('sums flows toward user', () => {
    const transfers = [
      { from: 'b', to: 'a', amount: 5 },
      { from: 'a', to: 'b', amount: 2 }
    ]
    expect(netSettlementBetweenUserAndOther(transfers, 'a', 'b')).toBe(3)
  })
})
