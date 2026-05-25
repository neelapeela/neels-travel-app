import { describe, expect, it } from 'vitest'
import {
  formatPaymentSplitMembersLabel,
  resolvePaymentSplitMembers
} from '../../src/utils/paymentSplitMembers'

describe('resolvePaymentSplitMembers', () => {
  const participants = ['a', 'b', 'c']

  it('uses all participants when splitMembers is null', () => {
    expect(resolvePaymentSplitMembers(null, participants, 'a')).toEqual(['a', 'b', 'c'])
  })

  it('uses explicit ids when provided', () => {
    expect(resolvePaymentSplitMembers(['a', 'b'], participants, 'a')).toEqual(['a', 'b'])
  })

  it('ignores stop members (legacy payments without splitMembers)', () => {
    expect(resolvePaymentSplitMembers(undefined, participants, 'a')).toEqual(['a', 'b', 'c'])
  })

  it('filters explicit ids to current participants', () => {
    expect(resolvePaymentSplitMembers(['a', 'gone'], participants, 'a')).toEqual(['a'])
  })
})

describe('formatPaymentSplitMembersLabel', () => {
  it('labels everyone when all participants split', () => {
    const label = formatPaymentSplitMembersLabel(null, ['a', 'b'], (id) => `User ${id}`)
    expect(label).toBe('Everyone')
  })

  it('lists names for a subset', () => {
    const label = formatPaymentSplitMembersLabel(['a', 'b'], ['a', 'b', 'c'], (id) =>
      id === 'a' ? 'Alex' : 'Blake'
    )
    expect(label).toBe('Alex, Blake')
  })
})
