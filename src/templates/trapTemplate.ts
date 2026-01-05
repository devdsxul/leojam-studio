/**
 * 嘻哈风格工程模板
 * Trap: 140 BPM, Hi-hat Rolls, 808 Bass
 * Boom Bap: 90 BPM, Swing, Sample-driven
 * Lo-fi: 75 BPM, Soft atmosphere
 */

import type { Project, StepSequencerPattern, Note } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export interface ProjectTemplate {
  name: string
  description: string
  bpm: number
  project: Omit<Project, 'id'>
  stepSequencerPatterns: StepSequencerPattern[]
}

const createSteps = (length: number, activeIndices: number[], note: Note, baseVelocity = 100) => {
  return Array.from({ length }, (_, i) => ({
    active: activeIndices.includes(i),
    velocity: baseVelocity,
    note,
  }))
}

const createClip = (patternId: string, startTime: number, duration: number, name: string, color: string) => ({
  id: uuidv4(),
  patternId,
  startTime,
  duration,
  offset: 0,
  color,
  name,
})

export const createTrapTemplate = (): ProjectTemplate => {
  const bassInstrumentId = uuidv4()
  const leadInstrumentId = uuidv4()
  const drumInstrumentId = uuidv4()

  const bassPatternId = uuidv4()
  const leadPatternId = uuidv4()
  const drumPatternId = uuidv4()

  const bassTrackId = uuidv4()
  const leadTrackId = uuidv4()
  const drumTrackId = uuidv4()

  return {
    name: 'Trap 模板',
    description: '140 BPM，Hi-hat Rolls，808 Bass',
    bpm: 140,
    project: {
      name: 'Trap Beat',
      bpm: 140,
      timeSignature: [4, 4] as [number, number],
      masterVolume: 0.8,
      instruments: [
        {
          id: bassInstrumentId,
          name: '808 Bass',
          type: 'synth',
          settings: {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0.8, release: 0.5 },
          },
        },
        {
          id: leadInstrumentId,
          name: 'Trap Lead',
          type: 'synth',
          settings: {
            oscillator: { type: 'square' },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
          },
        },
        {
          id: drumInstrumentId,
          name: '808 Kit',
          type: 'drumkit',
          settings: {},
        },
      ],
      effects: [
        {
          id: uuidv4(),
          name: 'Room Reverb',
          type: 'reverb',
          enabled: true,
          wet: 0.2,
          settings: { decay: 1.5 },
        },
      ],
      patterns: [
        {
          id: bassPatternId,
          name: '808 Bass Pattern',
          instrumentId: bassInstrumentId,
          length: 8,
          color: '#ef4444',
          notes: [
            { id: uuidv4(), note: 'C2', startTime: 0, duration: 1, velocity: 100 },
            { id: uuidv4(), note: 'C2', startTime: 2, duration: 0.5, velocity: 90 },
            { id: uuidv4(), note: 'D#2', startTime: 4, duration: 1, velocity: 100 },
            { id: uuidv4(), note: 'C2', startTime: 6, duration: 0.5, velocity: 85 },
          ],
        },
        {
          id: leadPatternId,
          name: 'Lead Melody',
          instrumentId: leadInstrumentId,
          length: 8,
          color: '#8b5cf6',
          notes: [
            { id: uuidv4(), note: 'G4', startTime: 0, duration: 0.25, velocity: 80 },
            { id: uuidv4(), note: 'D#4', startTime: 0.5, duration: 0.25, velocity: 75 },
            { id: uuidv4(), note: 'C4', startTime: 1, duration: 0.5, velocity: 85 },
            { id: uuidv4(), note: 'G4', startTime: 4, duration: 0.25, velocity: 80 },
            { id: uuidv4(), note: 'D#4', startTime: 4.5, duration: 0.25, velocity: 75 },
            { id: uuidv4(), note: 'G4', startTime: 5, duration: 1, velocity: 90 },
          ],
        },
      ],
      tracks: [
        {
          id: bassTrackId,
          name: '808 Bass',
          type: 'midi',
          color: '#ef4444',
          volume: 0.9,
          pan: 0,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: bassInstrumentId,
          effectIds: [],
          clips: [
            createClip(bassPatternId, 0, 8, '808 Bass', '#ef4444'),
            createClip(bassPatternId, 8, 8, '808 Bass', '#ef4444'),
          ],
        },
        {
          id: leadTrackId,
          name: 'Lead',
          type: 'midi',
          color: '#8b5cf6',
          volume: 0.7,
          pan: 0,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: leadInstrumentId,
          effectIds: [],
          clips: [
            createClip(leadPatternId, 0, 8, 'Lead Melody', '#8b5cf6'),
            createClip(leadPatternId, 8, 8, 'Lead Melody', '#8b5cf6'),
          ],
        },
        {
          id: drumTrackId,
          name: 'Drums',
          type: 'midi',
          color: '#f59e0b',
          volume: 0.85,
          pan: 0,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: drumInstrumentId,
          effectIds: [],
          clips: [],
        },
      ],
      automationLanes: [],
    },
    stepSequencerPatterns: [
      {
        id: drumPatternId,
        name: 'Trap Drums',
        instrumentId: drumInstrumentId,
        steps: 16,
        swing: 0,
        rows: [
          {
            id: uuidv4(),
            note: 'C2',
            name: 'Kick',
            steps: createSteps(16, [0, 3, 8, 11], 'C2', 127),
          },
          {
            id: uuidv4(),
            note: 'D2',
            name: 'Snare',
            steps: createSteps(16, [4, 12], 'D2', 110),
          },
          {
            id: uuidv4(),
            note: 'F#2',
            name: 'Hi-Hat',
            steps: Array.from({ length: 16 }, (_, i) => ({
              active: true,
              velocity: i % 2 === 0 ? 100 : 70,
              note: 'F#2' as Note,
            })),
          },
          {
            id: uuidv4(),
            note: 'A#2',
            name: 'Open Hat',
            steps: createSteps(16, [2, 6, 10, 14], 'A#2', 80),
          },
        ],
      },
    ],
  }
}

export const createBoomBapTemplate = (): ProjectTemplate => {
  const bassInstrumentId = uuidv4()
  const keysInstrumentId = uuidv4()
  const drumInstrumentId = uuidv4()

  const bassPatternId = uuidv4()
  const keysPatternId = uuidv4()
  const drumPatternId = uuidv4()

  const bassTrackId = uuidv4()
  const keysTrackId = uuidv4()
  const drumTrackId = uuidv4()

  return {
    name: 'Boom Bap 模板',
    description: '90 BPM，Swing 明显，采样驱动',
    bpm: 90,
    project: {
      name: 'Boom Bap Beat',
      bpm: 90,
      timeSignature: [4, 4] as [number, number],
      masterVolume: 0.8,
      instruments: [
        {
          id: bassInstrumentId,
          name: 'Upright Bass',
          type: 'synth',
          settings: {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.3, sustain: 0.5, release: 0.8 },
          },
        },
        {
          id: keysInstrumentId,
          name: 'Rhodes',
          type: 'synth',
          settings: {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.01, decay: 0.5, sustain: 0.3, release: 1 },
          },
        },
        {
          id: drumInstrumentId,
          name: 'Boom Bap Kit',
          type: 'drumkit',
          settings: {},
        },
      ],
      effects: [],
      patterns: [
        {
          id: bassPatternId,
          name: 'Bass Line',
          instrumentId: bassInstrumentId,
          length: 8,
          color: '#10b981',
          notes: [
            { id: uuidv4(), note: 'E2', startTime: 0, duration: 1, velocity: 95 },
            { id: uuidv4(), note: 'G2', startTime: 1.5, duration: 0.5, velocity: 85 },
            { id: uuidv4(), note: 'A2', startTime: 2, duration: 1, velocity: 90 },
            { id: uuidv4(), note: 'E2', startTime: 4, duration: 1, velocity: 95 },
            { id: uuidv4(), note: 'E2', startTime: 6, duration: 1.5, velocity: 90 },
          ],
        },
        {
          id: keysPatternId,
          name: 'Rhodes Chords',
          instrumentId: keysInstrumentId,
          length: 8,
          color: '#3b82f6',
          notes: [
            { id: uuidv4(), note: 'E4', startTime: 0, duration: 2, velocity: 70 },
            { id: uuidv4(), note: 'G4', startTime: 0, duration: 2, velocity: 65 },
            { id: uuidv4(), note: 'A4', startTime: 4, duration: 2, velocity: 70 },
            { id: uuidv4(), note: 'C5', startTime: 4, duration: 2, velocity: 65 },
          ],
        },
      ],
      tracks: [
        {
          id: bassTrackId,
          name: 'Bass',
          type: 'midi',
          color: '#10b981',
          volume: 0.85,
          pan: 0,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: bassInstrumentId,
          effectIds: [],
          clips: [
            createClip(bassPatternId, 0, 8, 'Bass Line', '#10b981'),
            createClip(bassPatternId, 8, 8, 'Bass Line', '#10b981'),
          ],
        },
        {
          id: keysTrackId,
          name: 'Rhodes',
          type: 'midi',
          color: '#3b82f6',
          volume: 0.6,
          pan: 0.1,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: keysInstrumentId,
          effectIds: [],
          clips: [
            createClip(keysPatternId, 0, 8, 'Rhodes Chords', '#3b82f6'),
            createClip(keysPatternId, 8, 8, 'Rhodes Chords', '#3b82f6'),
          ],
        },
        {
          id: drumTrackId,
          name: 'Drums',
          type: 'midi',
          color: '#f59e0b',
          volume: 0.9,
          pan: 0,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: drumInstrumentId,
          effectIds: [],
          clips: [],
        },
      ],
      automationLanes: [],
    },
    stepSequencerPatterns: [
      {
        id: drumPatternId,
        name: 'Boom Bap Drums',
        instrumentId: drumInstrumentId,
        steps: 16,
        swing: 35,
        rows: [
          {
            id: uuidv4(),
            note: 'C2',
            name: 'Kick',
            steps: createSteps(16, [0, 5, 10], 'C2', 127),
          },
          {
            id: uuidv4(),
            note: 'D2',
            name: 'Snare',
            steps: createSteps(16, [4, 12], 'D2', 120),
          },
          {
            id: uuidv4(),
            note: 'F#2',
            name: 'Hi-Hat',
            steps: Array.from({ length: 16 }, (_, i) => ({
              active: i % 4 !== 2,
              velocity: i % 2 === 0 ? 90 : 60,
              note: 'F#2' as Note,
            })),
          },
        ],
      },
    ],
  }
}

export const createLofiTemplate = (): ProjectTemplate => {
  const pianoInstrumentId = uuidv4()
  const bassInstrumentId = uuidv4()
  const drumInstrumentId = uuidv4()

  const pianoPatternId = uuidv4()
  const bassPatternId = uuidv4()
  const drumPatternId = uuidv4()

  const pianoTrackId = uuidv4()
  const bassTrackId = uuidv4()
  const drumTrackId = uuidv4()

  return {
    name: 'Lo-fi 模板',
    description: '柔和氛围，重采样，噪声纹理',
    bpm: 75,
    project: {
      name: 'Lo-fi Chill',
      bpm: 75,
      timeSignature: [4, 4] as [number, number],
      masterVolume: 0.75,
      instruments: [
        {
          id: pianoInstrumentId,
          name: 'Soft Piano',
          type: 'synth',
          settings: {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.1, decay: 0.8, sustain: 0.3, release: 2 },
          },
        },
        {
          id: bassInstrumentId,
          name: 'Mellow Bass',
          type: 'synth',
          settings: {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.05, decay: 0.4, sustain: 0.6, release: 1 },
          },
        },
        {
          id: drumInstrumentId,
          name: 'Lo-fi Kit',
          type: 'drumkit',
          settings: {},
        },
      ],
      effects: [
        {
          id: uuidv4(),
          name: 'Tape Reverb',
          type: 'reverb',
          enabled: true,
          wet: 0.4,
          settings: { decay: 3 },
        },
      ],
      patterns: [
        {
          id: pianoPatternId,
          name: 'Piano Chords',
          instrumentId: pianoInstrumentId,
          length: 8,
          color: '#ec4899',
          notes: [
            { id: uuidv4(), note: 'C4', startTime: 0, duration: 2, velocity: 60 },
            { id: uuidv4(), note: 'E4', startTime: 0, duration: 2, velocity: 55 },
            { id: uuidv4(), note: 'G4', startTime: 0, duration: 2, velocity: 50 },
            { id: uuidv4(), note: 'A3', startTime: 2, duration: 2, velocity: 60 },
            { id: uuidv4(), note: 'C4', startTime: 2, duration: 2, velocity: 55 },
            { id: uuidv4(), note: 'F3', startTime: 4, duration: 2, velocity: 60 },
            { id: uuidv4(), note: 'A3', startTime: 4, duration: 2, velocity: 55 },
            { id: uuidv4(), note: 'G3', startTime: 6, duration: 2, velocity: 60 },
            { id: uuidv4(), note: 'B3', startTime: 6, duration: 2, velocity: 55 },
          ],
        },
        {
          id: bassPatternId,
          name: 'Bass',
          instrumentId: bassInstrumentId,
          length: 8,
          color: '#06b6d4',
          notes: [
            { id: uuidv4(), note: 'C2', startTime: 0, duration: 2, velocity: 80 },
            { id: uuidv4(), note: 'A1', startTime: 2, duration: 2, velocity: 75 },
            { id: uuidv4(), note: 'F1', startTime: 4, duration: 2, velocity: 80 },
            { id: uuidv4(), note: 'G1', startTime: 6, duration: 2, velocity: 75 },
          ],
        },
      ],
      tracks: [
        {
          id: pianoTrackId,
          name: 'Piano',
          type: 'midi',
          color: '#ec4899',
          volume: 0.65,
          pan: -0.1,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: pianoInstrumentId,
          effectIds: [],
          clips: [
            createClip(pianoPatternId, 0, 8, 'Piano Chords', '#ec4899'),
            createClip(pianoPatternId, 8, 8, 'Piano Chords', '#ec4899'),
          ],
        },
        {
          id: bassTrackId,
          name: 'Bass',
          type: 'midi',
          color: '#06b6d4',
          volume: 0.7,
          pan: 0,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: bassInstrumentId,
          effectIds: [],
          clips: [
            createClip(bassPatternId, 0, 8, 'Bass', '#06b6d4'),
            createClip(bassPatternId, 8, 8, 'Bass', '#06b6d4'),
          ],
        },
        {
          id: drumTrackId,
          name: 'Drums',
          type: 'midi',
          color: '#f59e0b',
          volume: 0.75,
          pan: 0,
          mute: false,
          solo: false,
          armed: false,
          instrumentId: drumInstrumentId,
          effectIds: [],
          clips: [],
        },
      ],
      automationLanes: [],
    },
    stepSequencerPatterns: [
      {
        id: drumPatternId,
        name: 'Lo-fi Drums',
        instrumentId: drumInstrumentId,
        steps: 16,
        swing: 25,
        rows: [
          {
            id: uuidv4(),
            note: 'C2',
            name: 'Kick',
            steps: createSteps(16, [0, 6, 10], 'C2', 100),
          },
          {
            id: uuidv4(),
            note: 'D2',
            name: 'Snare',
            steps: createSteps(16, [4, 12], 'D2', 95),
          },
          {
            id: uuidv4(),
            note: 'F#2',
            name: 'Hi-Hat',
            steps: Array.from({ length: 16 }, (_, i) => ({
              active: i % 2 === 0,
              velocity: 70,
              note: 'F#2' as Note,
            })),
          },
        ],
      },
    ],
  }
}

export const templates = [
  createTrapTemplate,
  createBoomBapTemplate,
  createLofiTemplate,
]
