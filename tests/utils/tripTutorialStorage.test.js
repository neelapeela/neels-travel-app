import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hasSeenTripTutorial, markTripTutorialSeen } from '../../src/utils/tripTutorialStorage'

describe('tripTutorialStorage', () => {
  let store

  beforeEach(() => {
    store = {}
    globalThis.window = {
      localStorage: {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
        setItem: (k, v) => {
          store[k] = String(v)
        },
        clear: () => {
          store = {}
        }
      }
    }
  })

  afterEach(() => {
    delete globalThis.window
  })

  it('hasSeen is false without stored flag', () => {
    expect(hasSeenTripTutorial('user-1')).toBe(false)
  })

  it('mark + hasSeen', () => {
    markTripTutorialSeen('user-1')
    expect(hasSeenTripTutorial('user-1')).toBe(true)
  })

  it('hasSeen true without userId', () => {
    expect(hasSeenTripTutorial(undefined)).toBe(true)
  })

  it('scopes by user', () => {
    markTripTutorialSeen('a')
    expect(hasSeenTripTutorial('a')).toBe(true)
    expect(hasSeenTripTutorial('b')).toBe(false)
  })
})
