import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMapboxStyleOverride } from '../../../src/features/trip/constants.js'
import { createVoyagerStyle, VOYAGER_LAND_COLOR } from '../../../src/features/trip/map/voyagerStyle.js'

describe('createVoyagerStyle', () => {
  const style = createVoyagerStyle()

  it('is a Mapbox GL style using Streets v8', () => {
    expect(style.version).toBe(8)
    expect(style.sources.composite.url).toBe('mapbox://mapbox.mapbox-streets-v8')
    expect(style.layers[0]).toMatchObject({ id: 'background', paint: { 'background-color': VOYAGER_LAND_COLOR } })
  })

  it('omits POI, transit, and house-number layers', () => {
    const ids = style.layers.map((layer) => layer.id).join(' ')
    expect(ids).not.toMatch(/poi|transit|housenum/i)
  })
})

describe('getMapboxStyleOverride', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns a trimmed Studio style when VITE_MAPBOX_STYLE is set', () => {
    vi.stubEnv('VITE_MAPBOX_STYLE', ' mapbox://styles/demo/custom ')
    expect(getMapboxStyleOverride()).toBe('mapbox://styles/demo/custom')
  })
})
