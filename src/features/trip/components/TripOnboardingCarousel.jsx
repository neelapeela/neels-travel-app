import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

const GAP = 14
const VIEW_PAD = 12
const POPOVER_W = 300

const STEPS = [
  {
    title: 'Bear with me, please. Lock in.',
    body: 'You need to understand why you NEED this',
    target: null
  },
  {
    title: 'Toolbar',
    body: 'Add stops, edit the day title, open settings for notes and participants, share the invite code or link, and toggle the clock panel for the hourly timeline.',
    target: 'trip-toolbar'
  },
  {
    title: 'Map & stops',
    body: 'Pins show stops with a location. Tap a pin or a timeline pill to open the stop card andview details, edit, or attach expenses.',
    target: 'trip-map'
  },
  {
    title: 'Timeline',
    body: 'Hours for the selected day live here. Tap a time to add a stop. Drag to reorder.',
    target: 'trip-timeline'
  },
  {
    title: 'Flights, lodging & money',
    body: 'These shortcuts open flights, lodging, and the money overview so the group can track shared costs next to the itinerary.',
    target: 'trip-island'
  }
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function readBorderRadiusPx(el) {
  const raw = window.getComputedStyle(el).borderRadius
  if (!raw || raw === '0px') return 0
  const first = raw.split(/[\s/]+/)[0]
  const n = parseFloat(first)
  return Number.isFinite(n) ? n : 0
}

function clampCornerRadius(rx, w, h) {
  if (!Number.isFinite(rx) || rx <= 0) return 0
  return Math.min(rx, w / 2, h / 2)
}

/**
 * Dims the viewport with a rounded-rect hole matching the target (same rx as the highlight ring).
 * Avoids “bright corners” from a rectangular four-panel mask.
 */
function TutorialSvgDim({ ring, onDismiss }) {
  const reactId = useId()
  const maskId = `tutorial-spot-${reactId.replace(/:/g, '')}`
  const vw = window.innerWidth
  const vh = window.innerHeight

  if (!ring || ring.width <= 0 || ring.height <= 0) {
    return (
      <button
        type="button"
        className="trip-tutorial-backdrop"
        aria-label="Close tutorial"
        onClick={onDismiss}
      />
    )
  }

  const { top, left, width, height } = ring
  const rx = clampCornerRadius(ring.radius, width, height)

  return (
    <svg
      className="trip-tutorial-svg-dim"
      width={vw}
      height={vh}
      aria-hidden
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x={0} y={0} width={vw} height={vh}>
          <rect x={0} y={0} width={vw} height={vh} fill="white" />
          <rect x={left} y={top} width={width} height={height} rx={rx} ry={rx} fill="black" />
        </mask>
      </defs>
      <rect
        x={0}
        y={0}
        width={vw}
        height={vh}
        fill="rgba(31, 53, 50, 0.55)"
        mask={`url(#${maskId})`}
        className="trip-tutorial-svg-dim__hit"
        onClick={onDismiss}
      />
    </svg>
  )
}

export default function TripOnboardingCarousel({ open, onDismiss, showTimePanel }) {
  const [index, setIndex] = useState(0)
  const [layout, setLayout] = useState({
    placement: 'center',
    popTop: 0,
    popLeft: 0,
    popW: POPOVER_W,
    popH: 200,
    arrowX: 0,
    arrowY: 0,
    showArrow: false,
    ring: null
  })
  const titleId = 'trip-onboarding-title'
  const popoverRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setIndex(0)
  }, [open])

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= STEPS.length - 1) {
        queueMicrotask(onDismiss)
        return i
      }
      return i + 1
    })
  }, [onDismiss])

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1))
  }, [])

  useLayoutEffect(() => {
    if (!open) return

    const measure = () => {
      const slide = STEPS[index]
      const vw = window.innerWidth
      const vh = window.innerHeight

      if (!slide?.target) {
        const el = popoverRef.current
        const w = Math.min(POPOVER_W, vw - VIEW_PAD * 2)
        const h = el?.offsetHeight ?? 280
        setLayout({
          placement: 'center',
          popTop: (vh - h) / 2,
          popLeft: (vw - w) / 2,
          popW: w,
          popH: h,
          arrowX: w / 2,
          arrowY: 0,
          showArrow: false,
          ring: null
        })
        return
      }

      const targetEl = document.querySelector(`[data-trip-tutorial="${slide.target}"]`)
      if (!targetEl || (slide.target === 'trip-timeline' && !showTimePanel)) {
        const el = popoverRef.current
        const w = Math.min(POPOVER_W, vw - VIEW_PAD * 2)
        const h = el?.offsetHeight ?? 280
        setLayout({
          placement: 'center',
          popTop: (vh - h) / 2,
          popLeft: (vw - w) / 2,
          popW: w,
          popH: h,
          arrowX: w / 2,
          arrowY: 0,
          showArrow: false,
          ring: null
        })
        return
      }

      const r = targetEl.getBoundingClientRect()
      const radius = readBorderRadiusPx(targetEl)
      const ring = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
        radius: clampCornerRadius(radius, r.width, r.height)
      }

      const el = popoverRef.current
      const popW = Math.min(POPOVER_W, vw - VIEW_PAD * 2)
      const popH = el?.offsetHeight ?? 240

      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const spaceBelow = vh - r.bottom - GAP - VIEW_PAD
      const spaceAbove = r.top - GAP - VIEW_PAD
      const spaceRight = vw - r.right - GAP - VIEW_PAD
      const spaceLeft = r.left - GAP - VIEW_PAD

      let placement = 'bottom'
      let top = r.bottom + GAP
      let left = cx - popW / 2
      let arrowX = cx - left
      let arrowY = 0

      if (spaceBelow < popH && spaceAbove > spaceBelow) {
        placement = 'top'
        top = r.top - GAP - popH
        arrowX = cx - left
      } else if (spaceBelow < popH && spaceRight >= popW) {
        placement = 'right'
        top = cy - popH / 2
        left = r.right + GAP
        arrowX = 0
        arrowY = cy - top
      } else if (spaceBelow < popH && spaceLeft >= popW) {
        placement = 'left'
        top = cy - popH / 2
        left = r.left - GAP - popW
        arrowX = popW
        arrowY = cy - top
      }

      left = clamp(left, VIEW_PAD, vw - popW - VIEW_PAD)
      top = clamp(top, VIEW_PAD, vh - popH - VIEW_PAD)

      if (placement === 'bottom' || placement === 'top') {
        arrowX = clamp(cx - left, 24, popW - 24)
      } else {
        arrowY = clamp(cy - top, 24, popH - 24)
      }

      setLayout({
        placement,
        popTop: top,
        popLeft: left,
        popW,
        popH,
        arrowX,
        arrowY,
        showArrow: true,
        ring
      })
    }

    measure()
    const ro = new ResizeObserver(() => measure())
    if (popoverRef.current) ro.observe(popoverRef.current)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open, index, showTimePanel])

  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onDismiss()
      }
      if (event.key === 'ArrowRight') goNext()
      if (event.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onDismiss, goNext, goPrev])

  useEffect(() => {
    if (!open || !popoverRef.current) return
    const root = popoverRef.current
    const focusable = root.querySelector('button')
    focusable?.focus()
  }, [open, index, layout.popTop])

  if (!open) return null

  const slide = STEPS[index]
  const isLast = index === STEPS.length - 1

  return (
    <div className="trip-tutorial-root" role="presentation">
      <TutorialSvgDim ring={layout.ring} onDismiss={onDismiss} />
      {layout.ring && (
        <div
          className="trip-tutorial-ring"
          aria-hidden
          style={{
            top: layout.ring.top,
            left: layout.ring.left,
            width: layout.ring.width,
            height: layout.ring.height,
            borderRadius: layout.ring.radius > 0 ? `${layout.ring.radius}px` : '0'
          }}
        />
      )}
      <div
        ref={popoverRef}
        className={`trip-onboarding-card trip-onboarding-popover trip-onboarding-popover--${layout.placement}`}
        style={{
          position: 'fixed',
          top: layout.popTop,
          left: layout.popLeft,
          width: layout.popW,
          zIndex: 1602,
          '--trip-onboarding-arrow-x': `${layout.arrowX}px`,
          '--trip-onboarding-arrow-y': `${layout.arrowY}px`
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {layout.showArrow && (
          <span className="trip-onboarding-popover__arrow" aria-hidden />
        )}
        <div className="trip-onboarding-header">
          <span className="trip-onboarding-step">
            {index + 1} / {STEPS.length}
          </span>
          <button type="button" className="trip-onboarding-skip" onClick={onDismiss}>
            Skip
          </button>
        </div>
        <h2 id={titleId} className="trip-onboarding-title">
          {slide.title}
        </h2>
        <p className="trip-onboarding-body">{slide.body}</p>
        <div className="trip-onboarding-dots" role="tablist" aria-label="Tutorial steps">
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              className={`trip-onboarding-dot${i === index ? ' trip-onboarding-dot--active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>
        <div className="trip-onboarding-actions">
          <button
            type="button"
            className="trip-onboarding-btn trip-onboarding-btn--secondary"
            onClick={goPrev}
            disabled={index === 0}
          >
            Back
          </button>
          <button type="button" className="trip-onboarding-btn trip-onboarding-btn--primary" onClick={goNext}>
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
