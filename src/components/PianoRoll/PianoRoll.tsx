import { useCallback, useRef, useState, useMemo, useEffect } from 'react'
import { useDAWStore } from '@/store/dawStore'
import { useZoomGesture } from '@/hooks'
import { i18n } from '@/i18n'
import type { Note, MidiNote } from '@/types'
import './PianoRoll.css'

const NOTE_HEIGHT = 16
const BEAT_WIDTH = 40
const OCTAVES = 7
const NOTES_PER_OCTAVE = 12
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const RESIZE_HANDLE_WIDTH = 8

const isBlackKey = (noteIndex: number): boolean => {
  const blackKeyIndices = [1, 3, 6, 8, 10]
  return blackKeyIndices.includes(noteIndex % 12)
}

interface DragState {
  type: 'move' | 'resize' | 'velocity' | null
  noteId: string | null
  startX: number
  startY: number
  originalNote: MidiNote | null
}

export function PianoRoll() {
  const {
    project,
    view,
    transport,
    addNote,
    removeNote,
    updateNote,
    selectPattern,
    playNote,
    triggerAttack,
    triggerRelease,
  } = useDAWStore()

  const containerRef = useRef<HTMLDivElement>(null)

  // Enable pinch-to-zoom gesture
  useZoomGesture(containerRef)

  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [tool, setTool] = useState<'pencil' | 'select' | 'eraser'>('pencil')
  const [snapValue, setSnapValue] = useState<string>('1/4')
  const [dragState, setDragState] = useState<DragState>({
    type: null,
    noteId: null,
    startX: 0,
    startY: 0,
    originalNote: null,
  })

  const selectedPattern = useMemo(() => {
    return project.patterns.find((p) => p.id === view.selectedPatternId)
  }, [project.patterns, view.selectedPatternId])

  const zoom = view.zoom
  const beatWidth = BEAT_WIDTH * zoom
  const totalNotes = OCTAVES * NOTES_PER_OCTAVE
  const patternLength = selectedPattern?.length || 16
  const totalWidth = patternLength * beatWidth

  const allNotes = useMemo(() => {
    const notes: { note: Note; octave: number; index: number }[] = []
    for (let octave = OCTAVES; octave >= 1; octave--) {
      for (let i = NOTES_PER_OCTAVE - 1; i >= 0; i--) {
        notes.push({
          note: `${NOTE_NAMES[i]}${octave}` as Note,
          octave,
          index: (octave * NOTES_PER_OCTAVE) + i,
        })
      }
    }
    return notes
  }, [])

  const getNoteFromY = useCallback((y: number): Note => {
    const noteIndex = Math.floor(y / NOTE_HEIGHT)
    if (noteIndex >= 0 && noteIndex < allNotes.length) {
      return allNotes[noteIndex].note
    }
    return 'C4'
  }, [allNotes])

  const getYFromNote = useCallback((note: Note): number => {
    const index = allNotes.findIndex((n) => n.note === note)
    return index >= 0 ? index * NOTE_HEIGHT : 0
  }, [allNotes])

  const getSnapBeats = useCallback((): number => {
    const snapMap: Record<string, number> = {
      '1/1': 4,
      '1/2': 2,
      '1/4': 1,
      '1/8': 0.5,
      '1/16': 0.25,
    }
    return snapMap[snapValue] || 1
  }, [snapValue])

  const handleGridClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedPattern) return
    const target = e.target as HTMLElement
    if (target.classList.contains('midi-note')) return

    const rect = e.currentTarget.getBoundingClientRect()
    const scrollLeft = containerRef.current?.scrollLeft || 0
    const scrollTop = containerRef.current?.scrollTop || 0
    const x = e.clientX - rect.left + scrollLeft
    const y = e.clientY - rect.top + scrollTop

    if (tool === 'pencil') {
      const snapBeats = getSnapBeats()
      const rawBeat = x / beatWidth
      const startBeat = Math.floor(rawBeat / snapBeats) * snapBeats
      const note = getNoteFromY(y)
      const instrument = project.instruments.find((i) => i.id === selectedPattern.instrumentId)

      addNote(selectedPattern.id, {
        note,
        startTime: startBeat,
        duration: snapBeats,
        velocity: 100,
      })

      if (instrument) {
        playNote(instrument.id, note, snapBeats, 0.8)
      }
    }
  }, [selectedPattern, beatWidth, getNoteFromY, project.instruments, addNote, playNote, tool, getSnapBeats])

  const handleNoteClick = useCallback((e: React.MouseEvent, noteData: MidiNote) => {
    e.stopPropagation()
    if (!selectedPattern) return

    if (tool === 'eraser') {
      removeNote(selectedPattern.id, noteData.id)
    } else if (tool === 'select') {
      if (e.shiftKey) {
        setSelectedNotes((prev) => {
          const next = new Set(prev)
          if (next.has(noteData.id)) {
            next.delete(noteData.id)
          } else {
            next.add(noteData.id)
          }
          return next
        })
      } else {
        setSelectedNotes(new Set([noteData.id]))
      }
    }
  }, [selectedPattern, removeNote, tool])

  const handleNoteMouseDown = useCallback((e: React.MouseEvent, noteData: MidiNote) => {
    e.stopPropagation()
    if (!selectedPattern || tool === 'eraser') return

    const target = e.target as HTMLElement
    const rect = target.getBoundingClientRect()
    const isResizeHandle = e.clientX > rect.right - RESIZE_HANDLE_WIDTH

    setDragState({
      type: isResizeHandle ? 'resize' : 'move',
      noteId: noteData.id,
      startX: e.clientX,
      startY: e.clientY,
      originalNote: { ...noteData },
    })
  }, [selectedPattern, tool])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.type || !dragState.originalNote || !selectedPattern) return

    const deltaX = e.clientX - dragState.startX
    const deltaY = e.clientY - dragState.startY
    const snapBeats = getSnapBeats()

    if (dragState.type === 'move') {
      const deltaBeat = Math.round((deltaX / beatWidth) / snapBeats) * snapBeats
      const deltaNote = Math.round(deltaY / NOTE_HEIGHT)
      const newStartTime = Math.max(0, dragState.originalNote.startTime + deltaBeat)
      const noteIndex = allNotes.findIndex((n) => n.note === dragState.originalNote!.note)
      const newNoteIndex = Math.max(0, Math.min(allNotes.length - 1, noteIndex + deltaNote))
      const newNote = allNotes[newNoteIndex].note

      updateNote(selectedPattern.id, dragState.noteId!, {
        startTime: newStartTime,
        note: newNote,
      })
    } else if (dragState.type === 'resize') {
      const deltaDuration = Math.round((deltaX / beatWidth) / snapBeats) * snapBeats
      const newDuration = Math.max(snapBeats, dragState.originalNote.duration + deltaDuration)

      updateNote(selectedPattern.id, dragState.noteId!, {
        duration: newDuration,
      })
    }
  }, [dragState, selectedPattern, beatWidth, allNotes, updateNote, getSnapBeats])

  const handleMouseUp = useCallback(() => {
    setDragState({
      type: null,
      noteId: null,
      startX: 0,
      startY: 0,
      originalNote: null,
    })
  }, [])

  useEffect(() => {
    const handleGlobalMouseUp = () => handleMouseUp()
    window.addEventListener('mouseup', handleGlobalMouseUp)
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
  }, [handleMouseUp])

  const handleVelocityMouseDown = useCallback((e: React.MouseEvent, noteData: MidiNote) => {
    e.stopPropagation()
    if (!selectedPattern) return

    setDragState({
      type: 'velocity',
      noteId: noteData.id,
      startX: e.clientX,
      startY: e.clientY,
      originalNote: { ...noteData },
    })
  }, [selectedPattern])

  const handleVelocityMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragState.type !== 'velocity' || !dragState.originalNote || !selectedPattern) return

    const deltaY = dragState.startY - e.clientY
    const newVelocity = Math.max(1, Math.min(127, dragState.originalNote.velocity + deltaY))

    updateNote(selectedPattern.id, dragState.noteId!, {
      velocity: Math.round(newVelocity),
    })
  }, [dragState, selectedPattern, updateNote])

  const handlePianoKeyDown = useCallback((note: Note) => {
    if (!selectedPattern) return
    const instrument = project.instruments.find((i) => i.id === selectedPattern.instrumentId)
    if (instrument) {
      triggerAttack(instrument.id, note, 0.8)
    }
  }, [selectedPattern, project.instruments, triggerAttack])

  const handlePianoKeyUp = useCallback((note: Note) => {
    if (!selectedPattern) return
    const instrument = project.instruments.find((i) => i.id === selectedPattern.instrumentId)
    if (instrument) {
      triggerRelease(instrument.id, note)
    }
  }, [selectedPattern, project.instruments, triggerRelease])

  const renderBeatGrid = useCallback(() => {
    const lines = []
    const totalBeats = patternLength
    for (let i = 0; i <= totalBeats * 4; i++) {
      const isBar = i % 16 === 0
      const isBeat = i % 4 === 0
      lines.push(
        <div
          key={i}
          className={`grid-line ${isBar ? 'bar' : isBeat ? 'beat' : 'sub'}`}
          style={{ left: (i / 4) * beatWidth }}
        />
      )
    }
    return lines
  }, [beatWidth, patternLength])

  if (!selectedPattern) {
    return (
      <div className="piano-roll empty">
        <div className="empty-message">
          <h3>未选择 Pattern</h3>
          <p>从编曲页面选择一个 Pattern 或创建新的</p>
          <button
            onClick={() => {
              if (project.instruments.length > 0) {
                const patternId = useDAWStore.getState().addPattern(project.instruments[0].id)
                selectPattern(patternId)
              }
            }}
            disabled={project.instruments.length === 0}
          >
            创建 Pattern
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="piano-roll">
      <div className="piano-roll-toolbar">
        <div className="pattern-info">
          <input
            type="text"
            value={selectedPattern.name}
            onChange={(e) => useDAWStore.getState().updatePattern(selectedPattern.id, { name: e.target.value })}
            className="pattern-name-input"
          />
          <span className="pattern-length">{selectedPattern.length} 拍</span>
        </div>

        <div className="tool-buttons">
          <button
            className={`tool-btn ${tool === 'pencil' ? 'active' : ''}`}
            onClick={() => setTool('pencil')}
            title={i18n.pianoRoll.tool.pencil}
          >
            ✏️
          </button>
          <button
            className={`tool-btn ${tool === 'select' ? 'active' : ''}`}
            onClick={() => setTool('select')}
            title={i18n.pianoRoll.tool.select}
          >
            ⬚
          </button>
          <button
            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
            onClick={() => setTool('eraser')}
            title={i18n.pianoRoll.tool.erase}
          >
            🗑️
          </button>
        </div>

        <div className="snap-controls">
          <label>{i18n.pianoRoll.snap}:</label>
          <select value={snapValue} onChange={(e) => setSnapValue(e.target.value)}>
            <option value="1/1">1/1</option>
            <option value="1/2">1/2</option>
            <option value="1/4">1/4</option>
            <option value="1/8">1/8</option>
            <option value="1/16">1/16</option>
          </select>
        </div>
      </div>

      <div className="piano-roll-content" ref={containerRef}>
        <div className="piano-keys">
          {allNotes.map(({ note }, index) => (
            <div
              key={note}
              className={`piano-key ${isBlackKey(index) ? 'black' : 'white'}`}
              style={{ height: NOTE_HEIGHT }}
              onMouseDown={() => handlePianoKeyDown(note)}
              onMouseUp={() => handlePianoKeyUp(note)}
              onMouseLeave={() => handlePianoKeyUp(note)}
            >
              <span className="key-label">{note}</span>
            </div>
          ))}
        </div>

        <div className="note-grid-container">
          <div
            className={`note-grid ${dragState.type ? 'dragging' : ''}`}
            style={{ width: totalWidth, height: totalNotes * NOTE_HEIGHT }}
            onClick={handleGridClick}
            onMouseMove={handleMouseMove}
          >
            {renderBeatGrid()}

            {allNotes.map(({ note }, index) => (
              <div
                key={note}
                className={`grid-row ${isBlackKey(index) ? 'black' : 'white'}`}
                style={{ top: index * NOTE_HEIGHT, height: NOTE_HEIGHT }}
              />
            ))}

            {selectedPattern.notes.map((noteData) => (
              <div
                key={noteData.id}
                className={`midi-note ${selectedNotes.has(noteData.id) ? 'selected' : ''} ${dragState.noteId === noteData.id ? 'dragging' : ''}`}
                style={{
                  left: noteData.startTime * beatWidth,
                  top: getYFromNote(noteData.note),
                  width: noteData.duration * beatWidth - 2,
                  height: NOTE_HEIGHT - 2,
                  opacity: noteData.velocity / 127,
                }}
                onClick={(e) => handleNoteClick(e, noteData)}
                onMouseDown={(e) => handleNoteMouseDown(e, noteData)}
              >
                <div className="note-resize-handle" />
              </div>
            ))}

            <div
              className="playhead"
              style={{ left: transport.currentBeat * beatWidth }}
            />
          </div>
        </div>
      </div>

      <div className="velocity-lane" onMouseMove={handleVelocityMouseMove}>
        <div className="velocity-label">{i18n.pianoRoll.velocity}</div>
        <div className="velocity-bars" style={{ width: totalWidth }}>
          {selectedPattern.notes.map((noteData) => (
            <div
              key={noteData.id}
              className={`velocity-bar ${dragState.noteId === noteData.id && dragState.type === 'velocity' ? 'dragging' : ''}`}
              style={{
                left: noteData.startTime * beatWidth,
                width: noteData.duration * beatWidth - 2,
                height: `${(noteData.velocity / 127) * 100}%`,
              }}
              onMouseDown={(e) => handleVelocityMouseDown(e, noteData)}
              title={`力度: ${noteData.velocity}`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
