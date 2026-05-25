import { describe, expect, it } from 'vitest'
import {
  buildShortParticipantLabels,
  parsePersonName,
  shortLabelFromRawName
} from '../../src/utils/participantLabels'

describe('parsePersonName', () => {
  it('parses first and last from display name', () => {
    expect(parsePersonName('Jane Doe')).toEqual({ firstName: 'Jane', lastInitial: 'D' })
  })

  it('parses email local parts', () => {
    expect(parsePersonName('john.doe@example.com')).toEqual({ firstName: 'John', lastInitial: 'D' })
  })
})

describe('buildShortParticipantLabels', () => {
  it('uses first name only when unique', () => {
    const labels = buildShortParticipantLabels(['a', 'b'], {
      a: 'Jane Doe',
      b: 'Bob Smith'
    })
    expect(labels).toEqual({ a: 'Jane', b: 'Bob' })
  })

  it('adds last initial when first names duplicate', () => {
    const labels = buildShortParticipantLabels(['a', 'b'], {
      a: 'John Smith',
      b: 'John Adams'
    })
    expect(labels).toEqual({ a: 'John S.', b: 'John A.' })
  })
})

describe('shortLabelFromRawName', () => {
  it('returns first name only', () => {
    expect(shortLabelFromRawName('Maria Garcia')).toBe('Maria')
  })
})
