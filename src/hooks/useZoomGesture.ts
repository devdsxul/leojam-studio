import { useCallback, useRef, useEffect, RefObject } from 'react'
import { useDAWStore } from '@/store/dawStore'

interface ZoomGestureOptions {
  minZoom?: number
  maxZoom?: number
  zoomSensitivity?: number
}

/**
 * Custom hook for handling pinch-to-zoom and wheel zoom gestures
 * Works with both trackpad gestures and Ctrl+wheel
 */
export function useZoomGesture(
  containerRef: RefObject<HTMLElement>,
  options: ZoomGestureOptions = {}
) {
  const { minZoom = 0.1, maxZoom = 4, zoomSensitivity = 0.01 } = options
  const { view, setZoom } = useDAWStore()

  // Track touch points for pinch gesture
  const touchStartDistance = useRef<number | null>(null)
  const initialZoom = useRef<number>(view.zoom)

  const handleWheel = useCallback((e: WheelEvent) => {
    // Pinch-to-zoom on trackpad triggers wheel events with ctrlKey
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()

      const delta = -e.deltaY * zoomSensitivity
      const currentZoom = useDAWStore.getState().view.zoom
      const newZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + delta))

      setZoom(newZoom)
    }
  }, [minZoom, maxZoom, zoomSensitivity, setZoom])

  const getTouchDistance = (touches: TouchList): number => {
    if (touches.length < 2) return 0
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      touchStartDistance.current = getTouchDistance(e.touches)
      initialZoom.current = useDAWStore.getState().view.zoom
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistance.current !== null) {
      e.preventDefault()

      const currentDistance = getTouchDistance(e.touches)
      const scale = currentDistance / touchStartDistance.current
      const newZoom = Math.max(minZoom, Math.min(maxZoom, initialZoom.current * scale))

      setZoom(newZoom)
    }
  }, [minZoom, maxZoom, setZoom])

  const handleTouchEnd = useCallback(() => {
    touchStartDistance.current = null
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Add wheel listener with passive: false to allow preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false })
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      container.removeEventListener('wheel', handleWheel)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [containerRef, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    zoom: view.zoom,
    setZoom,
  }
}
