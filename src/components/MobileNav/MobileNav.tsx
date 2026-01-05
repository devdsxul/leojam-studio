import { useDAWStore } from '@/store/dawStore'
import { i18n } from '@/i18n'
import './MobileNav.css'

type ViewType = 'playlist' | 'pianoroll' | 'stepsequencer' | 'mixer' | 'browser'

const navItems: { id: ViewType; label: string; icon: string }[] = [
  { id: 'playlist', label: i18n.views.playlist, icon: '📋' },
  { id: 'pianoroll', label: i18n.views.pianoRoll, icon: '🎹' },
  { id: 'stepsequencer', label: i18n.views.stepSequencer, icon: '🔲' },
  { id: 'mixer', label: i18n.views.mixer, icon: '🎚️' },
  { id: 'browser', label: i18n.views.browser, icon: '📁' },
]

export function MobileNav() {
  const { view, setCurrentView } = useDAWStore()

  return (
    <nav className="mobile-nav">
      {navItems.map((item) => (
        <button
          key={item.id}
          className={`nav-item ${view.currentView === item.id ? 'active' : ''}`}
          onClick={() => setCurrentView(item.id)}
        >
          <span className="nav-icon">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
