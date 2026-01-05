import { useEffect, useState, useCallback } from 'react'
import { useDAWStore } from '@/store/dawStore'
import {
  Header,
  Toolbar,
  Playlist,
  PianoRoll,
  StepSequencer,
  Mixer,
  Browser,
  MobileNav,
  Automation,
} from '@/components'
import { i18n } from '@/i18n'
import './App.css'

function App() {
  const { view, initializeAudio, addInstrument, addTrack } = useDAWStore()
  const [showWelcome, setShowWelcome] = useState(true)

  const handleStart = useCallback(async () => {
    try {
      await initializeAudio()

      addInstrument({
        name: 'Default Synth',
        type: 'synth',
        settings: {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
        },
      })

      addInstrument({
        name: 'Bass Synth',
        type: 'synth',
        settings: {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.5 },
        },
      })

      addTrack('midi')
      addTrack('midi')

      setShowWelcome(false)
    } catch (error) {
      console.error('Failed to initialize audio:', error)
    }
  }, [initializeAudio, addInstrument, addTrack])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      if (isInputFocused) return

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault()
        const store = useDAWStore.getState()
        if (store.transport.isPlaying) {
          store.pause()
        } else {
          store.play()
        }
      }

      if (e.code === 'Enter' && !e.repeat) {
        e.preventDefault()
        useDAWStore.getState().stop()
      }

      if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.altKey) {
        const views = ['playlist', 'pianoroll', 'stepsequencer', 'mixer', 'browser', 'automation'] as const
        const viewIndex = parseInt(e.key) - 1
        if (viewIndex >= 0 && viewIndex < views.length) {
          useDAWStore.getState().setCurrentView(views[viewIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const renderMainView = () => {
    switch (view.currentView) {
      case 'playlist':
        return <Playlist />
      case 'pianoroll':
        return <PianoRoll />
      case 'stepsequencer':
        return <StepSequencer />
      case 'mixer':
        return <Mixer />
      case 'browser':
        return <Browser />
      case 'automation':
        return <Automation />
      default:
        return <Playlist />
    }
  }

  if (showWelcome) {
    return (
      <div className="welcome-screen">
        <div className="welcome-content">
          <div className="welcome-logo">🎵 {i18n.app.name}</div>
          <h1>{i18n.welcome.title}</h1>
          <p>{i18n.welcome.subtitle}</p>

          <div className="features-grid">
            <div className="feature">
              <span className="feature-icon">🎹</span>
              <h3>{i18n.welcome.features.pianoRoll.title}</h3>
              <p>{i18n.welcome.features.pianoRoll.desc}</p>
            </div>
            <div className="feature">
              <span className="feature-icon">🔲</span>
              <h3>{i18n.welcome.features.stepSequencer.title}</h3>
              <p>{i18n.welcome.features.stepSequencer.desc}</p>
            </div>
            <div className="feature">
              <span className="feature-icon">📋</span>
              <h3>{i18n.welcome.features.playlist.title}</h3>
              <p>{i18n.welcome.features.playlist.desc}</p>
            </div>
            <div className="feature">
              <span className="feature-icon">🎚️</span>
              <h3>{i18n.welcome.features.mixer.title}</h3>
              <p>{i18n.welcome.features.mixer.desc}</p>
            </div>
            <div className="feature">
              <span className="feature-icon">🎹</span>
              <h3>{i18n.welcome.features.instruments.title}</h3>
              <p>{i18n.welcome.features.instruments.desc}</p>
            </div>
            <div className="feature">
              <span className="feature-icon">🔊</span>
              <h3>{i18n.welcome.features.effects.title}</h3>
              <p>{i18n.welcome.features.effects.desc}</p>
            </div>
          </div>

          <button className="start-button" onClick={handleStart}>
            <span>{i18n.welcome.startButton}</span>
          </button>

          <div className="shortcuts-hint">
            <h4>{i18n.welcome.shortcuts.title}</h4>
            <div className="shortcuts-list">
              <span><kbd>Space</kbd> {i18n.welcome.shortcuts.space}</span>
              <span><kbd>Enter</kbd> {i18n.welcome.shortcuts.enter}</span>
              <span><kbd>1-6</kbd> {i18n.welcome.shortcuts.numbers}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <Header />
      <Toolbar />
      <div className="main-content">
        <div className="sidebar">
          <Browser />
        </div>
        <div className="workspace">
          {renderMainView()}
        </div>
      </div>
      <MobileNav />
    </div>
  )
}

export default App
