import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { v4 as uuidv4 } from 'uuid'
import type {
  Project,
  Track,
  Pattern,
  Instrument,
  Effect,
  Clip,
  MidiNote,
  TransportState,
  ViewState,
  StepSequencerPattern,
  StepSequencerRow,
  Note,
  AutomationLane,
  AutomationPoint,
  AutomationTarget,
} from '@/types'
import { audioEngine } from '@/audio/AudioEngine'

interface DAWState {
  project: Project
  transport: TransportState
  view: ViewState
  stepSequencerPatterns: StepSequencerPattern[]
  samples: { id: string; name: string; buffer: AudioBuffer }[]
  theme: 'dark' | 'light'

  initializeAudio: () => Promise<void>

  // Transport
  play: () => void
  pause: () => void
  stop: () => void
  setPosition: (beats: number) => void
  setBpm: (bpm: number) => void
  setLoop: (enabled: boolean, start: number, end: number) => void
  updateTransport: () => void
  toggleRecording: () => void

  // Project
  setProjectName: (name: string) => void
  setMasterVolume: (volume: number) => void
  saveProject: () => string
  loadProject: (jsonData: string) => boolean
  loadTemplate: (templateFn: () => import('@/templates/trapTemplate').ProjectTemplate) => void
  newProject: () => void

  // Undo/Redo
  undo: () => void
  redo: () => void

  // Theme
  toggleTheme: () => void

  // Samples
  loadSample: (file: File) => Promise<string | null>
  removeSample: (sampleId: string) => void

  // Tracks
  addTrack: (type: 'audio' | 'midi') => void
  removeTrack: (trackId: string) => void
  updateTrack: (trackId: string, updates: Partial<Track>) => void
  setTrackVolume: (trackId: string, volume: number) => void
  setTrackPan: (trackId: string, pan: number) => void
  toggleTrackMute: (trackId: string) => void
  toggleTrackSolo: (trackId: string) => void

  // Patterns
  addPattern: (instrumentId: string) => string
  removePattern: (patternId: string) => void
  updatePattern: (patternId: string, updates: Partial<Pattern>) => void

  // Notes
  addNote: (patternId: string, note: Omit<MidiNote, 'id'>) => void
  removeNote: (patternId: string, noteId: string) => void
  updateNote: (patternId: string, noteId: string, updates: Partial<MidiNote>) => void

  // Clips
  addClip: (trackId: string, clip: Omit<Clip, 'id'>) => void
  removeClip: (trackId: string, clipId: string) => void
  updateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => void
  addAudioClipFromSample: (sampleId: string, trackId?: string, startTime?: number) => void

  // Instruments
  addInstrument: (instrument: Omit<Instrument, 'id'>) => string
  removeInstrument: (instrumentId: string) => void
  updateInstrument: (instrumentId: string, updates: Partial<Instrument>) => void

  // Effects
  addEffect: (effect: Omit<Effect, 'id'>) => string
  removeEffect: (effectId: string) => void
  updateEffect: (effectId: string, updates: Partial<Effect>) => void
  addEffectToTrack: (trackId: string, effectId: string) => void
  removeEffectFromTrack: (trackId: string, effectId: string) => void

  // Step Sequencer
  addStepSequencerPattern: (instrumentId: string, steps?: number) => string
  updateStepSequencerStep: (patternId: string, rowIndex: number, stepIndex: number, active: boolean, velocity?: number, roll?: 1 | 2 | 3 | 4) => void
  setStepSequencerSwing: (patternId: string, swing: number) => void
  addStepSequencerRow: (patternId: string, note: Note, name: string) => void
  removeStepSequencerRow: (patternId: string, rowIndex: number) => void

  // View
  setCurrentView: (view: ViewState['currentView']) => void
  selectTrack: (trackId: string | null) => void
  selectPattern: (patternId: string | null) => void
  selectClip: (clipId: string | null) => void
  setZoom: (zoom: number) => void
  setScroll: (x: number, y: number) => void

  // Playback
  playNote: (instrumentId: string, note: Note, duration: number, velocity?: number) => void
  triggerAttack: (instrumentId: string, note: Note, velocity?: number) => void
  triggerRelease: (instrumentId: string, note: Note) => void

  // Automation
  addAutomationLane: (targetTrackId: string, targetParam: AutomationTarget, targetEffectId?: string, targetEffectParam?: string) => string
  removeAutomationLane: (laneId: string) => void
  addAutomationPoint: (laneId: string, time: number, value: number, curve?: 'linear' | 'exponential' | 'step') => string
  removeAutomationPoint: (laneId: string, pointId: string) => void
  updateAutomationPoint: (laneId: string, pointId: string, updates: Partial<AutomationPoint>) => void
  toggleAutomationLane: (laneId: string) => void
}

const DEFAULT_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#dfe6e9', '#fd79a8', '#a29bfe', '#6c5ce7', '#00b894',
]

const getRandomColor = () => DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]

interface HistoryState {
  project: Project
  stepSequencerPatterns: StepSequencerPattern[]
}

class HistoryManager {
  private undoStack: HistoryState[] = []
  private redoStack: HistoryState[] = []
  private maxHistorySize = 50

  saveState(state: HistoryState): void {
    this.undoStack.push(JSON.parse(JSON.stringify(state)))
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift()
    }
    this.redoStack = []
  }

  undo(currentState: HistoryState): HistoryState | null {
    if (this.undoStack.length === 0) return null
    this.redoStack.push(JSON.parse(JSON.stringify(currentState)))
    return this.undoStack.pop()!
  }

  redo(currentState: HistoryState): HistoryState | null {
    if (this.redoStack.length === 0) return null
    this.undoStack.push(JSON.parse(JSON.stringify(currentState)))
    return this.redoStack.pop()!
  }

  clear(): void {
    this.undoStack = []
    this.redoStack = []
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }
}

const historyManager = new HistoryManager()

const saveHistory = () => {
  const state = useDAWStore.getState()
  historyManager.saveState({
    project: state.project,
    stepSequencerPatterns: state.stepSequencerPatterns,
  })
}

const createDefaultProject = (): Project => ({
  id: uuidv4(),
  name: 'Untitled Project',
  bpm: 120,
  timeSignature: [4, 4],
  tracks: [],
  patterns: [],
  instruments: [],
  effects: [],
  masterVolume: 0.8,
  automationLanes: [],
})

const createDefaultTransport = (): TransportState => ({
  isPlaying: false,
  isRecording: false,
  currentBeat: 0,
  loopStart: 0,
  loopEnd: 16,
  loopEnabled: false,
})

const createDefaultView = (): ViewState => ({
  currentView: 'playlist',
  selectedTrackId: null,
  selectedPatternId: null,
  selectedClipId: null,
  zoom: 1,
  scrollX: 0,
  scrollY: 0,
})

export const useDAWStore = create<DAWState>()(
  immer((set, get) => ({
    project: createDefaultProject(),
    transport: createDefaultTransport(),
    view: createDefaultView(),
    stepSequencerPatterns: [],
    samples: [],
    theme: 'dark',

    initializeAudio: async () => {
      await audioEngine.initialize()
      audioEngine.setBpm(get().project.bpm)

      get().project.instruments.forEach((inst) => {
        audioEngine.createInstrument(inst)
      })

      get().project.effects.forEach((effect) => {
        audioEngine.createEffect(effect)
      })

      get().project.tracks.forEach((track) => {
        audioEngine.createTrackChannel(track)
      })
    },

    toggleTheme: () => {
      set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark'
        state.theme = newTheme
        document.documentElement.setAttribute('data-theme', newTheme)
      })
    },

    play: () => {
      const state = get()
      audioEngine.schedulePlaylist(state.project.tracks, state.project.patterns, state.project.bpm)
      audioEngine.scheduleAutomation(state.project.automationLanes, state.project.tracks, state.project.bpm)
      audioEngine.play()
      set((state) => {
        state.transport.isPlaying = true
      })
    },

    pause: () => {
      audioEngine.pause()
      set((state) => {
        state.transport.isPlaying = false
      })
    },

    stop: () => {
      audioEngine.stop()
      audioEngine.clearPlaylist()
      set((state) => {
        state.transport.isPlaying = false
        state.transport.currentBeat = 0
      })
    },

    setPosition: (beats: number) => {
      audioEngine.setPosition(beats)
      set((state) => {
        state.transport.currentBeat = beats
      })
    },

    setBpm: (bpm: number) => {
      audioEngine.setBpm(bpm)
      set((state) => {
        state.project.bpm = bpm
      })
    },

    setLoop: (enabled: boolean, start: number, end: number) => {
      audioEngine.setLoop(enabled, start, end)
      set((state) => {
        state.transport.loopEnabled = enabled
        state.transport.loopStart = start
        state.transport.loopEnd = end
      })
    },

    updateTransport: () => {
      const transportState = audioEngine.getTransportState()
      set((state) => {
        state.transport.currentBeat = transportState.currentBeat
        state.transport.isPlaying = transportState.isPlaying
      })
    },

    setProjectName: (name: string) => {
      set((state) => {
        state.project.name = name
      })
    },

    setMasterVolume: (volume: number) => {
      audioEngine.setMasterVolume(volume)
      set((state) => {
        state.project.masterVolume = volume
      })
    },

    saveProject: () => {
      const state = get()
      const projectData = {
        version: '1.0.0',
        project: state.project,
        stepSequencerPatterns: state.stepSequencerPatterns,
      }
      return JSON.stringify(projectData, null, 2)
    },

    loadProject: (jsonData: string) => {
      try {
        const data = JSON.parse(jsonData)
        if (!data.project) return false

        audioEngine.reset()

        data.project.instruments?.forEach((instrument: Instrument) => {
          audioEngine.createInstrument(instrument)
        })

        data.project.effects?.forEach((effect: Effect) => {
          audioEngine.createEffect(effect)
        })

        data.project.tracks?.forEach((track: Track) => {
          audioEngine.createTrackChannel(track)
          if (track.instrumentId) {
            audioEngine.connectInstrumentToTrack(track.instrumentId, track.id, track.effectIds)
          }
        })

        audioEngine.setBpm(data.project.bpm || 120)
        audioEngine.setMasterVolume(data.project.masterVolume || 0.8)

        set((state) => {
          state.project = data.project
          state.stepSequencerPatterns = data.stepSequencerPatterns || []
        })

        return true
      } catch {
        return false
      }
    },

    newProject: () => {
      // 清理现有资源
      audioEngine.dispose()

      const defaultProject: Project = {
        id: uuidv4(),
        name: '未命名工程',
        bpm: 120,
        timeSignature: [4, 4],
        tracks: [],
        patterns: [],
        instruments: [],
        effects: [],
        masterVolume: 0.8,
        automationLanes: [],
      }

      set((state) => {
        state.project = defaultProject
        state.stepSequencerPatterns = []
        state.transport = {
          isPlaying: false,
          isRecording: false,
          currentBeat: 0,
          loopStart: 0,
          loopEnd: 16,
          loopEnabled: false,
        }
      })
    },

    loadTemplate: (templateFn) => {
      const template = templateFn()

      // 清理现有资源
      audioEngine.dispose()

      const project: Project = {
        id: uuidv4(),
        ...template.project,
      }

      // 重建音频引擎资源
      project.instruments.forEach((instrument) => {
        audioEngine.createInstrument(instrument)
      })

      project.effects.forEach((effect) => {
        audioEngine.createEffect(effect)
      })

      project.tracks.forEach((track) => {
        audioEngine.createTrackChannel(track)
        if (track.instrumentId) {
          audioEngine.connectInstrumentToTrack(track.instrumentId, track.id, track.effectIds)
        }
      })

      audioEngine.setBpm(project.bpm)
      audioEngine.setMasterVolume(project.masterVolume)

      set((state) => {
        state.project = project
        state.stepSequencerPatterns = template.stepSequencerPatterns
        state.transport = {
          isPlaying: false,
          isRecording: false,
          currentBeat: 0,
          loopStart: 0,
          loopEnd: 16,
          loopEnabled: false,
        }
      })
    },

    toggleRecording: () => {
      set((state) => {
        state.transport.isRecording = !state.transport.isRecording
      })
    },

    undo: () => {
      const state = get()
      const previousState = historyManager.undo({
        project: state.project,
        stepSequencerPatterns: state.stepSequencerPatterns,
      })
      if (previousState) {
        set((s) => {
          s.project = previousState.project
          s.stepSequencerPatterns = previousState.stepSequencerPatterns
        })
      }
    },

    redo: () => {
      const state = get()
      const nextState = historyManager.redo({
        project: state.project,
        stepSequencerPatterns: state.stepSequencerPatterns,
      })
      if (nextState) {
        set((s) => {
          s.project = nextState.project
          s.stepSequencerPatterns = nextState.stepSequencerPatterns
        })
      }
    },

    loadSample: async (file: File): Promise<string | null> => {
      try {
        const buffer = await audioEngine.loadAudioFile(file)
        const id = uuidv4()
        audioEngine.registerAudioBuffer(id, buffer)
        set((state) => {
          state.samples.push({ id, name: file.name, buffer })
        })
        return id
      } catch (error) {
        console.error('Failed to load sample:', error)
        return null
      }
    },

    removeSample: (sampleId: string) => {
      audioEngine.removeAudioBuffer(sampleId)
      set((state) => {
        state.samples = state.samples.filter((s) => s.id !== sampleId)
      })
    },

    addTrack: (type: 'audio' | 'midi') => {
      saveHistory()
      const trackId = uuidv4()
      let instrumentId: string | undefined

      // 为 MIDI 轨道自动创建默认乐器
      if (type === 'midi') {
        instrumentId = uuidv4()
        const instrument: Instrument = {
          id: instrumentId,
          name: `Synth ${get().project.instruments.length + 1}`,
          type: 'synth',
          settings: {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
          },
        }
        audioEngine.createInstrument(instrument)
        set((state) => {
          state.project.instruments.push(instrument)
        })
      }

      const track: Track = {
        id: trackId,
        name: `Track ${get().project.tracks.length + 1}`,
        type,
        color: getRandomColor(),
        volume: 0.8,
        pan: 0,
        mute: false,
        solo: false,
        armed: false,
        clips: [],
        effectIds: [],
        instrumentId,
      }

      audioEngine.createTrackChannel(track)

      // 连接乐器到轨道通道
      if (instrumentId) {
        audioEngine.connectInstrumentToTrack(instrumentId, trackId, [])
      }

      set((state) => {
        state.project.tracks.push(track)
        state.view.selectedTrackId = track.id
      })
    },

    removeTrack: (trackId: string) => {
      saveHistory()
      audioEngine.removeTrackChannel(trackId)
      set((state) => {
        state.project.tracks = state.project.tracks.filter((t) => t.id !== trackId)
        if (state.view.selectedTrackId === trackId) {
          state.view.selectedTrackId = null
        }
      })
    },

    updateTrack: (trackId: string, updates: Partial<Track>) => {
      saveHistory()
      set((state) => {
        const track = state.project.tracks.find((t) => t.id === trackId)
        if (track) {
          Object.assign(track, updates)
          audioEngine.updateTrackChannel(track as Track)
        }
      })
    },

    setTrackVolume: (trackId: string, volume: number) => {
      get().updateTrack(trackId, { volume })
    },

    setTrackPan: (trackId: string, pan: number) => {
      get().updateTrack(trackId, { pan })
    },

    toggleTrackMute: (trackId: string) => {
      const track = get().project.tracks.find((t) => t.id === trackId)
      if (track) {
        get().updateTrack(trackId, { mute: !track.mute })
      }
    },

    toggleTrackSolo: (trackId: string) => {
      const track = get().project.tracks.find((t) => t.id === trackId)
      if (track) {
        get().updateTrack(trackId, { solo: !track.solo })
      }
    },

    addPattern: (instrumentId: string) => {
      saveHistory()
      const id = uuidv4()
      const pattern: Pattern = {
        id,
        name: `Pattern ${get().project.patterns.length + 1}`,
        color: getRandomColor(),
        length: 16,
        notes: [],
        instrumentId,
      }

      set((state) => {
        state.project.patterns.push(pattern)
        state.view.selectedPatternId = id
      })

      return id
    },

    removePattern: (patternId: string) => {
      saveHistory()
      set((state) => {
        state.project.patterns = state.project.patterns.filter((p) => p.id !== patternId)
        state.project.tracks.forEach((track) => {
          track.clips = track.clips.filter((c) => c.patternId !== patternId)
        })
        if (state.view.selectedPatternId === patternId) {
          state.view.selectedPatternId = null
        }
      })
    },

    updatePattern: (patternId: string, updates: Partial<Pattern>) => {
      saveHistory()
      set((state) => {
        const pattern = state.project.patterns.find((p) => p.id === patternId)
        if (pattern) {
          Object.assign(pattern, updates)
        }
      })
    },

    addNote: (patternId: string, note: Omit<MidiNote, 'id'>) => {
      saveHistory()
      set((state) => {
        const pattern = state.project.patterns.find((p) => p.id === patternId)
        if (pattern) {
          pattern.notes.push({
            ...note,
            id: uuidv4(),
          })
        }
      })
    },

    removeNote: (patternId: string, noteId: string) => {
      saveHistory()
      set((state) => {
        const pattern = state.project.patterns.find((p) => p.id === patternId)
        if (pattern) {
          pattern.notes = pattern.notes.filter((n) => n.id !== noteId)
        }
      })
    },

    updateNote: (patternId: string, noteId: string, updates: Partial<MidiNote>) => {
      saveHistory()
      set((state) => {
        const pattern = state.project.patterns.find((p) => p.id === patternId)
        if (pattern) {
          const note = pattern.notes.find((n) => n.id === noteId)
          if (note) {
            Object.assign(note, updates)
          }
        }
      })
    },

    addClip: (trackId: string, clip: Omit<Clip, 'id'>) => {
      saveHistory()
      set((state) => {
        const track = state.project.tracks.find((t) => t.id === trackId)
        if (track) {
          const newClip: Clip = {
            ...clip,
            id: uuidv4(),
          }
          track.clips.push(newClip)
        }
      })
    },

    removeClip: (trackId: string, clipId: string) => {
      saveHistory()
      set((state) => {
        const track = state.project.tracks.find((t) => t.id === trackId)
        if (track) {
          track.clips = track.clips.filter((c) => c.id !== clipId)
        }
      })
    },

    updateClip: (trackId: string, clipId: string, updates: Partial<Clip>) => {
      saveHistory()
      set((state) => {
        const track = state.project.tracks.find((t) => t.id === trackId)
        if (track) {
          const clip = track.clips.find((c) => c.id === clipId)
          if (clip) {
            Object.assign(clip, updates)
          }
        }
      })
    },

    addAudioClipFromSample: (sampleId: string, trackId?: string, startTime = 0) => {
      const state = get()
      const sample = state.samples.find((s) => s.id === sampleId)
      if (!sample) return

      let targetTrackId = trackId
      if (!targetTrackId) {
        const audioTrack = state.project.tracks.find((t) => t.type === 'audio')
        if (!audioTrack) {
          const newTrackId = uuidv4()
          const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
          const color = colors[state.project.tracks.length % colors.length]

          const newTrack: Track = {
            id: newTrackId,
            name: '音频轨道',
            type: 'audio',
            color,
            volume: 0.8,
            pan: 0,
            mute: false,
            solo: false,
            armed: false,
            clips: [],
            effectIds: [],
          }

          audioEngine.createTrackChannel(newTrack)

          set((s) => {
            s.project.tracks.push(newTrack)
          })

          targetTrackId = newTrackId
        } else {
          targetTrackId = audioTrack.id
        }
      }

      const bpm = state.project.bpm
      const durationInSeconds = sample.buffer.duration
      const durationInBeats = (durationInSeconds / 60) * bpm

      set((s) => {
        const track = s.project.tracks.find((t) => t.id === targetTrackId)
        if (track) {
          const clip: Clip = {
            id: uuidv4(),
            audioBufferId: sampleId,
            startTime,
            duration: durationInBeats,
            offset: 0,
            color: track.color,
            name: sample.name,
          }
          track.clips.push(clip)
        }
      })
    },

    addInstrument: (instrument: Omit<Instrument, 'id'>) => {
      saveHistory()
      const id = uuidv4()
      const newInstrument: Instrument = { ...instrument, id }

      audioEngine.createInstrument(newInstrument)

      set((state) => {
        state.project.instruments.push(newInstrument)
      })

      return id
    },

    removeInstrument: (instrumentId: string) => {
      saveHistory()
      audioEngine.removeInstrument(instrumentId)
      set((state) => {
        state.project.instruments = state.project.instruments.filter((i) => i.id !== instrumentId)
        state.project.patterns = state.project.patterns.filter((p) => p.instrumentId !== instrumentId)
        state.project.tracks.forEach((track) => {
          if (track.instrumentId === instrumentId) {
            track.instrumentId = undefined
          }
        })
      })
    },

    updateInstrument: (instrumentId: string, updates: Partial<Instrument>) => {
      saveHistory()
      set((state) => {
        const instrument = state.project.instruments.find((i) => i.id === instrumentId)
        if (instrument) {
          Object.assign(instrument, updates)
        }
      })
    },

    addEffect: (effect: Omit<Effect, 'id'>) => {
      saveHistory()
      const id = uuidv4()
      const newEffect: Effect = { ...effect, id }

      audioEngine.createEffect(newEffect)

      set((state) => {
        state.project.effects.push(newEffect)
      })

      return id
    },

    removeEffect: (effectId: string) => {
      saveHistory()
      audioEngine.removeEffect(effectId)
      set((state) => {
        state.project.effects = state.project.effects.filter((e) => e.id !== effectId)
        state.project.tracks.forEach((track) => {
          track.effectIds = track.effectIds.filter((id) => id !== effectId)
        })
      })
    },

    updateEffect: (effectId: string, updates: Partial<Effect>) => {
      saveHistory()
      set((state) => {
        const effect = state.project.effects.find((e) => e.id === effectId)
        if (effect) {
          Object.assign(effect, updates)
        }
      })
    },

    addEffectToTrack: (trackId: string, effectId: string) => {
      set((state) => {
        const track = state.project.tracks.find((t) => t.id === trackId)
        if (track && !track.effectIds.includes(effectId)) {
          track.effectIds.push(effectId)
          if (track.instrumentId) {
            audioEngine.connectInstrumentToTrack(track.instrumentId, trackId, track.effectIds)
          }
        }
      })
    },

    removeEffectFromTrack: (trackId: string, effectId: string) => {
      set((state) => {
        const track = state.project.tracks.find((t) => t.id === trackId)
        if (track) {
          track.effectIds = track.effectIds.filter((id) => id !== effectId)
          if (track.instrumentId) {
            audioEngine.connectInstrumentToTrack(track.instrumentId, trackId, track.effectIds)
          }
        }
      })
    },

    addStepSequencerPattern: (instrumentId: string, steps = 16) => {
      const id = uuidv4()
      const defaultNotes: Note[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5']

      const rows: StepSequencerRow[] = defaultNotes.map((note) => ({
        id: uuidv4(),
        name: note,
        note,
        steps: Array.from({ length: steps }, () => ({
          active: false,
          velocity: 100,
          note,
        })),
      }))

      const pattern: StepSequencerPattern = {
        id,
        name: `Step Pattern ${get().stepSequencerPatterns.length + 1}`,
        steps,
        rows,
        instrumentId,
        swing: 0,
      }

      set((state) => {
        state.stepSequencerPatterns.push(pattern)
      })

      return id
    },

    updateStepSequencerStep: (patternId: string, rowIndex: number, stepIndex: number, active: boolean, velocity = 100, roll?: 1 | 2 | 3 | 4) => {
      set((state) => {
        const pattern = state.stepSequencerPatterns.find((p) => p.id === patternId)
        if (pattern && pattern.rows[rowIndex] && pattern.rows[rowIndex].steps[stepIndex]) {
          pattern.rows[rowIndex].steps[stepIndex].active = active
          pattern.rows[rowIndex].steps[stepIndex].velocity = velocity
          if (roll !== undefined) {
            pattern.rows[rowIndex].steps[stepIndex].roll = roll
          }
        }
      })
    },

    setStepSequencerSwing: (patternId: string, swing: number) => {
      set((state) => {
        const pattern = state.stepSequencerPatterns.find((p) => p.id === patternId)
        if (pattern) {
          pattern.swing = Math.max(0, Math.min(100, swing))
        }
      })
    },

    addStepSequencerRow: (patternId: string, note: Note, name: string) => {
      set((state) => {
        const pattern = state.stepSequencerPatterns.find((p) => p.id === patternId)
        if (pattern) {
          pattern.rows.push({
            id: uuidv4(),
            name,
            note,
            steps: Array.from({ length: pattern.steps }, () => ({
              active: false,
              velocity: 100,
              note,
            })),
          })
        }
      })
    },

    removeStepSequencerRow: (patternId: string, rowIndex: number) => {
      set((state) => {
        const pattern = state.stepSequencerPatterns.find((p) => p.id === patternId)
        if (pattern) {
          pattern.rows.splice(rowIndex, 1)
        }
      })
    },

    setCurrentView: (view: ViewState['currentView']) => {
      set((state) => {
        state.view.currentView = view
      })
    },

    selectTrack: (trackId: string | null) => {
      set((state) => {
        state.view.selectedTrackId = trackId
      })
    },

    selectPattern: (patternId: string | null) => {
      set((state) => {
        state.view.selectedPatternId = patternId
      })
    },

    selectClip: (clipId: string | null) => {
      set((state) => {
        state.view.selectedClipId = clipId
      })
    },

    setZoom: (zoom: number) => {
      set((state) => {
        state.view.zoom = Math.max(0.1, Math.min(4, zoom))
      })
    },

    setScroll: (x: number, y: number) => {
      set((state) => {
        state.view.scrollX = x
        state.view.scrollY = y
      })
    },

    playNote: (instrumentId: string, note: Note, duration: number, velocity = 0.8) => {
      audioEngine.playNote(instrumentId, note, duration, undefined, velocity)
    },

    triggerAttack: (instrumentId: string, note: Note, velocity = 0.8) => {
      audioEngine.triggerAttack(instrumentId, note, velocity)
    },

    triggerRelease: (instrumentId: string, note: Note) => {
      audioEngine.triggerRelease(instrumentId, note)
    },

    // Automation Actions
    addAutomationLane: (targetTrackId: string, targetParam: AutomationTarget, targetEffectId?: string, targetEffectParam?: string) => {
      const id = uuidv4()
      const lane: AutomationLane = {
        id,
        targetTrackId,
        targetParam,
        targetEffectId,
        targetEffectParam,
        points: [],
        enabled: true,
        color: getRandomColor(),
      }

      set((state) => {
        state.project.automationLanes.push(lane)
      })

      return id
    },

    removeAutomationLane: (laneId: string) => {
      set((state) => {
        state.project.automationLanes = state.project.automationLanes.filter((l) => l.id !== laneId)
      })
    },

    addAutomationPoint: (laneId: string, time: number, value: number, curve: 'linear' | 'exponential' | 'step' = 'linear') => {
      const id = uuidv4()
      const point: AutomationPoint = {
        id,
        time,
        value: Math.max(0, Math.min(1, value)),
        curve,
      }

      set((state) => {
        const lane = state.project.automationLanes.find((l) => l.id === laneId)
        if (lane) {
          lane.points.push(point)
          lane.points.sort((a, b) => a.time - b.time)
        }
      })

      return id
    },

    removeAutomationPoint: (laneId: string, pointId: string) => {
      set((state) => {
        const lane = state.project.automationLanes.find((l) => l.id === laneId)
        if (lane) {
          lane.points = lane.points.filter((p) => p.id !== pointId)
        }
      })
    },

    updateAutomationPoint: (laneId: string, pointId: string, updates: Partial<AutomationPoint>) => {
      set((state) => {
        const lane = state.project.automationLanes.find((l) => l.id === laneId)
        if (lane) {
          const point = lane.points.find((p) => p.id === pointId)
          if (point) {
            Object.assign(point, updates)
            if (updates.value !== undefined) {
              point.value = Math.max(0, Math.min(1, point.value))
            }
            lane.points.sort((a, b) => a.time - b.time)
          }
        }
      })
    },

    toggleAutomationLane: (laneId: string) => {
      set((state) => {
        const lane = state.project.automationLanes.find((l) => l.id === laneId)
        if (lane) {
          lane.enabled = !lane.enabled
        }
      })
    },
  }))
)
