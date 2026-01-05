import { useState, useCallback } from 'react'
import { useDAWStore } from '@/store/dawStore'
import { downloadProject, downloadMidi, downloadWav } from '@/utils/fileExport'
import { audioEngine } from '@/audio/AudioEngine'
import { i18n } from '@/i18n'
import './Toolbar.css'

export function Toolbar() {
  const { view, setCurrentView, undo, redo, project } = useDAWStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleSave = () => {
    downloadProject(project)
  }

  const handleExportMidi = () => {
    downloadMidi(project.patterns, project.name, project.bpm)
  }

  const handleExportWav = useCallback(async () => {
    if (isExporting) return

    const hasNotes = project.tracks.some((t) =>
      t.clips.some((c) => {
        const pattern = project.patterns.find((p) => p.id === c.patternId)
        return pattern && pattern.notes.length > 0
      })
    )

    if (!hasNotes) {
      alert('工程中没有可导出的音符')
      return
    }

    setIsExporting(true)
    try {
      let maxEndTime = 0
      project.tracks.forEach((track) => {
        track.clips.forEach((clip) => {
          const pattern = project.patterns.find((p) => p.id === clip.patternId)
          if (pattern) {
            pattern.notes.forEach((note) => {
              const noteEnd = clip.startTime + note.startTime + note.duration
              if (noteEnd > maxEndTime) maxEndTime = noteEnd
            })
          }
        })
      })

      const durationSeconds = (60 / project.bpm) * (maxEndTime + 2)
      const buffer = await audioEngine.renderOffline(
        project.tracks,
        project.patterns,
        project.bpm,
        durationSeconds
      )

      downloadWav(buffer, project.name || '工程')
    } catch (error) {
      console.error('WAV export failed:', error)
      alert('导出 WAV 失败')
    } finally {
      setIsExporting(false)
    }
  }, [project, isExporting])

  const views = [
    { id: 'playlist' as const, label: i18n.views.playlist, icon: '📋' },
    { id: 'pianoroll' as const, label: i18n.views.pianoRoll, icon: '🎹' },
    { id: 'stepsequencer' as const, label: i18n.views.stepSequencer, icon: '🔲' },
    { id: 'mixer' as const, label: i18n.views.mixer, icon: '🎚️' },
    { id: 'browser' as const, label: i18n.views.browser, icon: '📁' },
  ]

  return (
    <div className="toolbar">
      <div className="toolbar-views">
        {views.map((v) => (
          <button
            key={v.id}
            className={`toolbar-btn ${view.currentView === v.id ? 'active' : ''}`}
            onClick={() => setCurrentView(v.id)}
            title={v.label}
          >
            <span className="toolbar-icon">{v.icon}</span>
            <span className="toolbar-label">{v.label}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-actions">
        <button className="toolbar-btn" title={i18n.toolbar.undo} onClick={undo}>
          <span className="toolbar-icon">↩️</span>
        </button>
        <button className="toolbar-btn" title={i18n.toolbar.redo} onClick={redo}>
          <span className="toolbar-icon">↪️</span>
        </button>
        <div className="toolbar-separator" />
        <button className="toolbar-btn" title={i18n.toolbar.save} onClick={handleSave}>
          <span className="toolbar-icon">💾</span>
        </button>
        <button className="toolbar-btn" title={i18n.toolbar.exportMidi} onClick={handleExportMidi}>
          <span className="toolbar-icon">📤</span>
        </button>
        <button
          className={`toolbar-btn ${isExporting ? 'disabled' : ''}`}
          title={i18n.toolbar.exportWav}
          onClick={handleExportWav}
          disabled={isExporting}
        >
          <span className="toolbar-icon">{isExporting ? '⏳' : '🎵'}</span>
        </button>
      </div>
    </div>
  )
}
