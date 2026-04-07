import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Stop details use a centered modal on small viewports — no map “band” inset. */
const MOBILE_MODAL_MQ = '(max-width: 768px)'

/** Matches `.stop-view-sheet { max-height: min(42vh, 360px) }` when geometry is unreliable. */
function sheetMaxHeightFallbackPx() {
  if (typeof window === 'undefined') return 320
  return Math.min(Math.round(window.innerHeight * 0.42), 360)
}

/** Same breakpoint as trip mobile layout — stop details render as a centered modal. */
export function useMobileStopModal() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MODAL_MQ).matches : false
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MODAL_MQ)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

/**
 * Measures the stop sheet for UI (island offset) and the overlap between the sheet and the map pane
 * for map centering. Overlap is the correct “bottom padding” for the visible map band; raw sheet height
 * can exceed the map or read as 0 while the slide-up animation runs.
 */
export function useStopSheetHeight(mapPaneRef, selectedStop, isEditingStop) {
  const stopSheetRef = useRef(null)
  const [stopSheetHeight, setStopSheetHeight] = useState(0)
  const [mapBottomInsetPx, setMapBottomInsetPx] = useState(0)
  const rafRef = useRef(null)
  const isMobileStopModal = useMobileStopModal()

  useLayoutEffect(() => {
    const sheet = stopSheetRef.current
    const pane = mapPaneRef?.current
    if (!sheet || !selectedStop) {
      setStopSheetHeight(0)
      setMapBottomInsetPx(0)
      return undefined
    }

    if (isMobileStopModal) {
      setStopSheetHeight(0)
      setMapBottomInsetPx(0)
      return undefined
    }

    const measureAndSet = () => {
      const sheetRect = sheet.getBoundingClientRect()
      const fullH = Math.max(sheet.offsetHeight, sheetRect.height)

      let inset = 0
      if (pane) {
        const mapRect = pane.getBoundingClientRect()
        const top = Math.max(mapRect.top, sheetRect.top)
        const bottom = Math.min(mapRect.bottom, sheetRect.bottom)
        inset = Math.max(0, Math.round(bottom - top))
      }

      const fallback = sheetMaxHeightFallbackPx()
      if (inset === 0 && fullH > 16) {
        inset = Math.min(fallback, fullH)
      } else if (inset === 0) {
        inset = pane
          ? Math.min(fallback, Math.round(pane.getBoundingClientRect().height * 0.42))
          : fallback
      }
      // Do not cap overlap vs map height — a tall sheet on a short map can cover >58% of the pane;
      // capping made `mapBottomInsetPx` too small so the pin stayed visually low behind the overlay.

      setStopSheetHeight((prev) => (prev === fullH ? prev : fullH))
      setMapBottomInsetPx((prev) => (prev === inset ? prev : inset))
    }

    measureAndSet()

    const onAnimationEnd = () => measureAndSet()
    sheet.addEventListener('animationend', onAnimationEnd)

    const ro = new ResizeObserver(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        measureAndSet()
      })
    })
    ro.observe(sheet)

    return () => {
      sheet.removeEventListener('animationend', onAnimationEnd)
      ro.disconnect()
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [mapPaneRef, selectedStop, isEditingStop, isMobileStopModal])

  return { stopSheetRef, stopSheetHeight, mapBottomInsetPx }
}
