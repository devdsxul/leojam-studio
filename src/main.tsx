import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Force enable mobile scrolling - fix for iOS Safari and other mobile browsers
if (typeof window !== 'undefined') {
  const isMobile = window.innerWidth <= 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  if (isMobile) {
    // Remove any touch event listeners that might block scrolling
    document.documentElement.style.cssText += `
      overflow-y: scroll !important;
      -webkit-overflow-scrolling: touch !important;
      touch-action: pan-y !important;
      height: 100% !important;
    `
    document.body.style.cssText += `
      overflow: visible !important;
      touch-action: pan-y !important;
      min-height: 100% !important;
      height: auto !important;
      position: relative !important;
    `

    // Prevent any accidental preventDefault on touchmove
    document.addEventListener('touchmove', (e) => {
      // Only prevent if it's a pinch gesture (2+ fingers)
      if (e.touches.length < 2) {
        // Allow single finger scroll
        return
      }
    }, { passive: true })

    // Log for debugging
    console.log('[Mobile] Scroll fix applied')
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
