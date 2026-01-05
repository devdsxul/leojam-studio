import { useCallback, useEffect, useRef } from 'react'
import { useDAWStore } from '@/store/dawStore'
import { i18n } from '@/i18n'
import './Header.css'

export function Header() {
  const {
    project,
    transport,
    play,
    pause,
    stop,
    setBpm,
    setLoop,
    setMasterVolume,
    setProjectName,
    updateTransport,
    toggleRecording,
    toggleTheme,
    theme,
    saveProject,
    loadProject,
    newProject,
  } = useDAWStore()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const updateLoop = () => {
      updateTransport()
      animationRef.current = requestAnimationFrame(updateLoop)
    }

    if (transport.isPlaying) {
      animationRef.current = requestAnimationFrame(updateLoop)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [transport.isPlaying, updateTransport])

  const handlePlayPause = useCallback(() => {
    if (transport.isPlaying) {
      pause()
    } else {
      play()
    }
  }, [transport.isPlaying, play, pause])

  const handleStop = useCallback(() => {
    stop()
  }, [stop])

  const handleSaveProject = useCallback(() => {
    const jsonData = saveProject()
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name || '工程'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [saveProject, project.name])

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const jsonData = event.target?.result as string
      const success = loadProject(jsonData)
      if (!success) {
        alert('工程文件格式错误')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [loadProject])

  const handleNewProject = useCallback(() => {
    if (confirm('确定要新建工程吗？当前未保存的更改将丢失。')) {
      newProject()
    }
  }, [newProject])

  const formatTime = (beats: number): string => {
    const bars = Math.floor(beats / 4) + 1
    const beat = Math.floor(beats % 4) + 1
    const tick = Math.floor((beats % 1) * 100)
    return `${bars.toString().padStart(3, '0')}:${beat}:${tick.toString().padStart(2, '0')}`
  }

  return (
    <header className="header">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <div className="header-left">
        <div className="logo">{i18n.app.name}</div>
        <div className="project-actions">
          <button className="icon-btn" onClick={handleNewProject} title="新建工程">📄</button>
          <button className="icon-btn" onClick={handleImportClick} title="导入工程">📂</button>
          <button className="icon-btn" onClick={handleSaveProject} title="保存工程">💾</button>
        </div>
        <input
          type="text"
          className="project-name"
          value={project.name}
          onChange={(e) => setProjectName(e.target.value)}
        />
      </div>

      <div className="header-center">
        <div className="transport-controls">
          <button className="icon-btn" onClick={handleStop} title={i18n.transport.stop}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="3" width="10" height="10" />
            </svg>
          </button>

          <button
            className={`icon-btn play-btn ${transport.isPlaying ? 'playing' : ''}`}
            onClick={handlePlayPause}
            title={transport.isPlaying ? i18n.transport.pause : i18n.transport.play}
          >
            {transport.isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="3" y="2" width="4" height="12" />
                <rect x="9" y="2" width="4" height="12" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <polygon points="3,2 14,8 3,14" />
              </svg>
            )}
          </button>

          <button
            className={`icon-btn ${transport.isRecording ? 'recording' : ''}`}
            onClick={toggleRecording}
            title={i18n.transport.record}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="8" r="6" fill={transport.isRecording ? '#ef4444' : 'currentColor'} />
            </svg>
          </button>
        </div>

        <div className="time-display">
          <span className="time-value">{formatTime(transport.currentBeat)}</span>
        </div>

        <div className="bpm-control">
          <label>{i18n.transport.bpm}</label>
          <input
            type="number"
            className="bpm-input"
            value={project.bpm}
            min={20}
            max={999}
            onChange={(e) => setBpm(Number(e.target.value))}
          />
        </div>

        <div className="loop-control">
          <button
            className={`icon-btn ${transport.loopEnabled ? 'active' : ''}`}
            onClick={() => setLoop(!transport.loopEnabled, transport.loopStart, transport.loopEnd)}
            title={i18n.transport.loop}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13 4v5h-3l4 4 4-4h-3V4a2 2 0 0 0-2-2H5v2h8z" transform="scale(0.7) translate(1, 1)" />
              <path d="M3 12V7h3L2 3l-4 4h3v5a2 2 0 0 0 2 2h8v-2H3z" transform="scale(0.7) translate(7, 3)" />
            </svg>
          </button>
        </div>
      </div>

      <div className="header-right">
        <button
          className="icon-btn theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <div className="master-volume">
          <label>{i18n.mixer.master}</label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={project.masterVolume}
            onChange={(e) => setMasterVolume(Number(e.target.value))}
          />
          <span className="volume-value">{Math.round(project.masterVolume * 100)}%</span>
        </div>
      </div>
    </header>
  )
}
