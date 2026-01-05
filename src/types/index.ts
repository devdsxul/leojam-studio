export type NoteValue = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'
export type Octave = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
export type Note = `${NoteValue}${Octave}`

export interface MidiNote {
  id: string
  note: Note
  startTime: number // in beats
  duration: number // in beats
  velocity: number // 0-127
}

export interface Pattern {
  id: string
  name: string
  color: string
  length: number // in beats
  notes: MidiNote[]
  instrumentId: string
}

export interface Track {
  id: string
  name: string
  type: 'audio' | 'midi' | 'automation'
  color: string
  volume: number // 0-1
  pan: number // -1 to 1
  mute: boolean
  solo: boolean
  armed: boolean
  clips: Clip[]
  effectIds: string[]
  instrumentId?: string
  automationLanes?: AutomationLane[]
}

export interface Clip {
  id: string
  patternId?: string
  audioBufferId?: string
  startTime: number // in beats
  duration: number // in beats
  offset: number // offset within the pattern/audio
  color: string
  name: string
}

export interface PlaylistItem {
  id: string
  trackId: string
  clipId: string
  startTime: number
  row: number
}

export interface Instrument {
  id: string
  name: string
  type: 'synth' | 'sampler' | 'drumkit'
  settings: Record<string, unknown>
}

export interface Effect {
  id: string
  name: string
  type: EffectType
  enabled: boolean
  wet: number // 0-1
  settings: Record<string, unknown>
}

export type EffectType =
  | 'reverb'
  | 'delay'
  | 'distortion'
  | 'chorus'
  | 'phaser'
  | 'filter'
  | 'eq3'
  | 'compressor'
  | 'limiter'
  | 'tremolo'
  | 'vibrato'
  | 'bitcrusher'

export interface Project {
  id: string
  name: string
  bpm: number
  timeSignature: [number, number]
  tracks: Track[]
  patterns: Pattern[]
  instruments: Instrument[]
  effects: Effect[]
  masterVolume: number
  automationLanes: AutomationLane[]
}

export interface TransportState {
  isPlaying: boolean
  isRecording: boolean
  currentBeat: number
  loopStart: number
  loopEnd: number
  loopEnabled: boolean
}

export interface StepSequencerStep {
  active: boolean
  velocity: number
  note: Note
  roll?: 1 | 2 | 3 | 4 // Roll subdivisions (1 = no roll, 2 = 2x, 3 = 3x, 4 = 4x)
}

export interface StepSequencerRow {
  id: string
  name: string
  note: Note
  steps: StepSequencerStep[]
}

export interface StepSequencerPattern {
  id: string
  name: string
  steps: number
  rows: StepSequencerRow[]
  instrumentId: string
  swing: number // 0-100, amount of swing
}

export interface AudioBufferData {
  id: string
  name: string
  buffer: AudioBuffer | null
  duration: number
  sampleRate: number
}

export interface ViewState {
  currentView: 'playlist' | 'pianoroll' | 'mixer' | 'stepsequencer' | 'browser' | 'automation'
  selectedTrackId: string | null
  selectedPatternId: string | null
  selectedClipId: string | null
  zoom: number
  scrollX: number
  scrollY: number
}

export interface MixerChannel {
  id: string
  trackId: string | null
  name: string
  volume: number
  pan: number
  mute: boolean
  solo: boolean
  effectIds: string[]
  sends: MixerSend[]
}

export interface MixerSend {
  targetChannelId: string
  amount: number
  preFader: boolean
}

// Automation Types
export type AutomationTarget =
  | 'volume'
  | 'pan'
  | 'mute'
  | 'effectWet'
  | 'effectParam'
  | 'tempo'

export interface AutomationPoint {
  id: string
  time: number // in beats
  value: number // 0-1 normalized
  curve: 'linear' | 'exponential' | 'step' // interpolation type
}

export interface AutomationLane {
  id: string
  targetTrackId: string // which track to automate
  targetParam: AutomationTarget
  targetEffectId?: string // if automating effect param
  targetEffectParam?: string // specific effect parameter name
  points: AutomationPoint[]
  enabled: boolean
  color: string
}
