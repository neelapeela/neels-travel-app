import { describe, expect, it } from 'vitest'
import {
  CLUSTER_CHILD_GAP_PX,
  CLUSTER_CHILD_SIZE_PX,
  CLUSTER_OUTER_PADDING_PX,
  computeClusterMarkerLayout,
  groupEntriesByPixelProximity,
  STOP_MARKER_CLUSTER_THRESHOLD_PX
} from '../../../src/features/trip/utils/stopMarkerClusters'

describe('groupEntriesByPixelProximity', () => {
  const entry = (id, x, y) => ({
    stop: { id },
    lat: 0,
    lng: 0,
    x,
    y
  })

  it('returns a single marker when only one stop', () => {
    const groups = groupEntriesByPixelProximity([entry('a', 10, 10)])
    expect(groups).toEqual([{ kind: 'single', stop: { id: 'a' } }])
  })

  it('clusters stops within threshold pixels', () => {
    const groups = groupEntriesByPixelProximity(
      [entry('a', 0, 0), entry('b', 20, 0)],
      STOP_MARKER_CLUSTER_THRESHOLD_PX
    )
    expect(groups).toHaveLength(1)
    expect(groups[0].kind).toBe('cluster')
    expect(groups[0].stops).toHaveLength(2)
  })

  it('keeps distant stops separate', () => {
    const groups = groupEntriesByPixelProximity(
      [entry('a', 0, 0), entry('b', 200, 0)],
      STOP_MARKER_CLUSTER_THRESHOLD_PX
    )
    expect(groups).toHaveLength(2)
    expect(groups.every((g) => g.kind === 'single')).toBe(true)
  })
})

describe('computeClusterMarkerLayout', () => {
  it('returns a square outer size that fits one child', () => {
    const layout = computeClusterMarkerLayout(1)
    expect(layout.outerSizePx).toBe(CLUSTER_CHILD_SIZE_PX + 2 * CLUSTER_OUTER_PADDING_PX)
    expect(layout.offsets).toEqual([{ x: 0, y: 0 }])
  })

  it('spaces two children with gap inside the outer circle', () => {
    const layout = computeClusterMarkerLayout(2)
    const centerDist = Math.hypot(
      layout.offsets[0].x - layout.offsets[1].x,
      layout.offsets[0].y - layout.offsets[1].y
    )
    expect(centerDist).toBeGreaterThanOrEqual(CLUSTER_CHILD_SIZE_PX + CLUSTER_CHILD_GAP_PX - 0.1)
    const outerRadius = layout.outerSizePx / 2
    const maxChildReach =
      centerDist / 2 + CLUSTER_CHILD_SIZE_PX / 2 + CLUSTER_OUTER_PADDING_PX
    expect(outerRadius).toBeGreaterThanOrEqual(maxChildReach - 1)
  })

  it('grows outer circle as more slots are added', () => {
    const two = computeClusterMarkerLayout(2).outerSizePx
    const four = computeClusterMarkerLayout(4).outerSizePx
    const six = computeClusterMarkerLayout(6).outerSizePx
    expect(four).toBeGreaterThan(two)
    expect(six).toBeGreaterThan(four)
  })

  it('places offsets on a ring for three or more slots', () => {
    const layout = computeClusterMarkerLayout(3)
    expect(layout.offsets).toHaveLength(3)
    const radii = layout.offsets.map((o) => Math.hypot(o.x, o.y))
    const avg = radii.reduce((a, b) => a + b, 0) / radii.length
    radii.forEach((r) => expect(Math.abs(r - avg)).toBeLessThan(0.5))
  })
})
