import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/** Stop details use a centered modal on small viewports — no map “band” inset. */
const MOBILE_MODAL_MQ = '(max-width: 768px)'

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
 * Measures the stop sheet for UI (island offset) and map overlap for map centering.
 * With desktop floating card, we care about horizontal overlap (left inset).
 */
export function useStopSheetHeight(mapPaneRef, selectedStop, isEditingStop) {
  const stopSheetRef = useRef(null)
  const [stopSheetHeight, setStopSheetHeight] = useState(0)
  const [mapLeftInsetPx, setMapLeftInsetPx] = useState(0)
  const rafRef = useRef(null)
  const isMobileStopModal = useMobileStopModal()

  useLayoutEffect(() => {
    const sheet = stopSheetRef.current
    const pane = mapPaneRef?.current
    if (!sheet || !selectedStop) {
      setStopSheetHeight(0)
      setMapLeftInsetPx(0)
      return undefined
    }

    if (isMobileStopModal) {
      setStopSheetHeight(0)
      setMapLeftInsetPx(0)
      return undefined
    }

    const measureAndSet = () => {
      const sheetRect = sheet.getBoundingClientRect()
      const fullH = Math.max(sheet.offsetHeight, sheetRect.height)

      let inset = 0
      if (pane) {
        const mapRect = pane.getBoundingClientRect()
        const left = Math.max(mapRect.left, sheetRect.left)
        const right = Math.min(mapRect.right, sheetRect.right)
        inset = Math.max(0, Math.round(right - left))
      }

      const fallback = Math.min(Math.round(window.innerWidth * 0.52), 360)
      if (inset === 0 && fullH > 16) {
        // fallback width for floating card when overlap reads 0 during animation frames
        inset = fallback
      } else if (inset === 0) {
        inset = pane
          ? Math.min(fallback, Math.round(pane.getBoundingClientRect().width * 0.56))
          : fallback
      }
      // Keep horizontal inset bounded so markers don't get pushed too far right.
      if (pane) {
        const paneW = pane.getBoundingClientRect().width
        inset = Math.min(inset, Math.round(paneW * 0.7))
      }

      setStopSheetHeight((prev) => (prev === fullH ? prev : fullH))
      setMapLeftInsetPx((prev) => (prev === inset ? prev : inset))
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

  return { stopSheetRef, stopSheetHeight, mapLeftInsetPx }
}
