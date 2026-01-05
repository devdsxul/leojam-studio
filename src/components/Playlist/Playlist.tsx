import { useCallback, useRef } from 'react'
import { useDAWStore } from '@/store/dawStore'
import { useZoomGesture } from '@/hooks'
import { i18n } from '@/i18n'
import './Playlist.css'

const BEAT_WIDTH = 40
const TRACK_HEIGHT = 60

export function Playlist() {
  const {
    project,
    transport,
    view,
    addTrack,
    updateTrack,
    selectTrack,
    addClip,
    setPosition,
    toggleTrackMute,
    toggleTrackSolo,
  } = useDAWStore()

  const containerRef = useRef<HTMLDivElement>(null)

  // Enable pinch-to-zoom gesture
  useZoomGesture(containerRef)

  const zoom = view.zoom
  const beatWidth = BEAT_WIDTH * zoom
  const totalBeats = 128
  const totalWidth = totalBeats * beatWidth

  const handleTrackHeaderClick = useCallback((trackId: string) => {
    selectTrack(trackId)
  }, [selectTrack])

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget !== e.target) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0)
    const beat = x / beatWidth
    setPosition(beat)
  }, [beatWidth, setPosition])

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>, trackId: string) => {
    if (e.target !== e.currentTarget) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + (containerRef.current?.scrollLeft || 0)
    const startBeat = Math.floor(x / beatWidth)

    const pattern = project.patterns[0]
    if (pattern) {
      addClip(trackId, {
        patternId: pattern.id,
        startTime: startBeat,
        duration: pattern.length,
        offset: 0,
        color: pattern.color,
        name: pattern.name,
      })
    }
  }, [beatWidth, project.patterns, addClip])

  const handleClipDoubleClick = useCallback((clipId: string) => {
    const pattern = project.patterns.find((p) =>
      project.tracks.some((t) => t.clips.some((c) => c.id === clipId && c.patternId === p.id))
    )
    if (pattern) {
      useDAWStore.getState().selectPattern(pattern.id)
      useDAWStore.getState().setCurrentView('pianoroll')
    }
  }, [project.patterns, project.tracks])

  const renderBeatGrid = useCallback(() => {
    const lines = []
    for (let i = 0; i <= totalBeats; i++) {
      const isBar = i % 4 === 0
      lines.push(
        <div
          key={i}
          className={`grid-line ${isBar ? 'bar' : ''}`}
          style={{ left: i * beatWidth }}
        />
      )
    }
    return lines
  }, [beatWidth, totalBeats])

  const renderTimeline = useCallback(() => {
    const markers = []
    for (let i = 0; i <= totalBeats; i += 4) {
      markers.push(
        <div
          key={i}
          className="timeline-marker"
          style={{ left: i * beatWidth }}
        >
          {Math.floor(i / 4) + 1}
        </div>
      )
    }
    return markers
  }, [beatWidth, totalBeats])

  return (
    <div className="playlist">
      <div className="playlist-header">
        <div className="track-headers">
          <div className="track-header-spacer">
            <button className="add-track-btn" onClick={() => addTrack('midi')}>
              + 轨道
            </button>
          </div>
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className={`track-header ${view.selectedTrackId === track.id ? 'selected' : ''}`}
              style={{ height: TRACK_HEIGHT, borderLeftColor: track.color }}
              onClick={() => handleTrackHeaderClick(track.id)}
            >
              <div className="track-info">
                <input
                  type="text"
                  className="track-name"
                  value={track.name}
                  onChange={(e) => updateTrack(track.id, { name: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="track-controls">
                  <button
                    className={`track-btn ${track.mute ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleTrackMute(track.id) }}
                    title={i18n.playlist.muteTrack}
                  >
                    M
                  </button>
                  <button
                    className={`track-btn ${track.solo ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleTrackSolo(track.id) }}
                    title={i18n.playlist.soloTrack}
                  >
                    S
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="timeline" onClick={handleTimelineClick}>
          <div className="timeline-content" style={{ width: totalWidth }}>
            {renderTimeline()}
            <div
              className="playhead"
              style={{ left: transport.currentBeat * beatWidth }}
            />
          </div>
        </div>
      </div>

      <div className="playlist-content" ref={containerRef}>
        <div className="track-headers-scroll">
          {project.tracks.map((track) => (
            <div
              key={track.id}
              className="track-header-placeholder"
              style={{ height: TRACK_HEIGHT }}
            />
          ))}
        </div>

        <div className="tracks-area">
          <div className="tracks-container" style={{ width: totalWidth }}>
            <div className="grid-overlay">
              {renderBeatGrid()}
            </div>

            {project.tracks.map((track, trackIndex) => (
              <div
                key={track.id}
                className={`track-lane ${view.selectedTrackId === track.id ? 'selected' : ''}`}
                style={{ height: TRACK_HEIGHT, top: trackIndex * TRACK_HEIGHT }}
                onClick={(e) => handleGridClick(e, track.id)}
              >
                {track.clips.map((clip) => {
                  const pattern = project.patterns.find((p) => p.id === clip.patternId)
                  return (
                    <div
                      key={clip.id}
                      className="clip"
                      style={{
                        left: clip.startTime * beatWidth,
                        width: clip.duration * beatWidth - 2,
                        backgroundColor: clip.color || pattern?.color || '#6366f1',
                      }}
                      onDoubleClick={() => handleClipDoubleClick(clip.id)}
                    >
                      <span className="clip-name">{clip.name || pattern?.name}</span>
                      {pattern && pattern.notes.length > 0 && (
                        <div className="clip-preview">
                          {pattern.notes.slice(0, 20).map((note, i) => (
                            <div
                              key={i}
                              className="clip-note"
                              style={{
                                left: `${(note.startTime / pattern.length) * 100}%`,
                                width: `${(note.duration / pattern.length) * 100}%`,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}

            <div
              className="playhead"
              style={{ left: transport.currentBeat * beatWidth }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
