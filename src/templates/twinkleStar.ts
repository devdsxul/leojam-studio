/**
 * 小星星 (Twinkle Twinkle Little Star) 伴奏模板
 * 经典儿歌，适合初学者
 */

import type { Project, StepSequencerPattern, Note, MidiNote } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export interface ProjectTemplate {
  name: string
  description: string
  bpm: number
  project: Omit<Project, 'id'>
  stepSequencerPatterns: StepSequencerPattern[]
}

// 小星星旋律音符
// C C G G A A G | F F E E D D C | G G F F E E D | G G F F E E D | C C G G A A G | F F E E D D C
const createTwinkleStarNotes = (): MidiNote[] => {
  const notes: MidiNote[] = []

  // 旋律定义: [音符, 开始拍, 时值]
  const melody: [Note, number, number][] = [
    // 第一小节: C C G G A A G
    ['C5', 0, 0.5], ['C5', 0.5, 0.5],
    ['G5', 1, 0.5], ['G5', 1.5, 0.5],
    ['A5', 2, 0.5], ['A5', 2.5, 0.5],
    ['G5', 3, 1],

    // 第二小节: F F E E D D C
    ['F5', 4, 0.5], ['F5', 4.5, 0.5],
    ['E5', 5, 0.5], ['E5', 5.5, 0.5],
    ['D5', 6, 0.5], ['D5', 6.5, 0.5],
    ['C5', 7, 1],

    // 第三小节: G G F F E E D
    ['G5', 8, 0.5], ['G5', 8.5, 0.5],
    ['F5', 9, 0.5], ['F5', 9.5, 0.5],
    ['E5', 10, 0.5], ['E5', 10.5, 0.5],
    ['D5', 11, 1],

    // 第四小节: G G F F E E D
    ['G5', 12, 0.5], ['G5', 12.5, 0.5],
    ['F5', 13, 0.5], ['F5', 13.5, 0.5],
    ['E5', 14, 0.5], ['E5', 14.5, 0.5],
    ['D5', 15, 1],

    // 第五小节: C C G G A A G
    ['C5', 16, 0.5], ['C5', 16.5, 0.5],
    ['G5', 17, 0.5], ['G5', 17.5, 0.5],
    ['A5', 18, 0.5], ['A5', 18.5, 0.5],
    ['G5', 19, 1],

    // 第六小节: F F E E D D C
    ['F5', 20, 0.5], ['F5', 20.5, 0.5],
    ['E5', 21, 0.5], ['E5', 21.5, 0.5],
    ['D5', 22, 0.5], ['D5', 22.5, 0.5],
    ['C5', 23, 1],
  ]

  melody.forEach(([note, startTime, duration]) => {
    notes.push({
      id: uuidv4(),
      note,
      startTime,
      duration,
      velocity: 80,
    })
  })

  return notes
}

// 简单的和弦伴奏
const createChordAccompaniment = (): MidiNote[] => {
  const notes: MidiNote[] = []

  // 和弦进行: C - G - Am - F (每 4 拍一个和弦)
  const chords: { notes: Note[], startTime: number, duration: number }[] = [
    // C 和弦 (C-E-G)
    { notes: ['C3', 'E3', 'G3'], startTime: 0, duration: 4 },
    { notes: ['C3', 'E3', 'G3'], startTime: 4, duration: 4 },

    // G 和弦 (G-B-D)
    { notes: ['G2', 'B2', 'D3'], startTime: 8, duration: 4 },
    { notes: ['G2', 'B2', 'D3'], startTime: 12, duration: 4 },

    // C 和弦
    { notes: ['C3', 'E3', 'G3'], startTime: 16, duration: 4 },
    { notes: ['C3', 'E3', 'G3'], startTime: 20, duration: 4 },
  ]

  chords.forEach(chord => {
    chord.notes.forEach(note => {
      notes.push({
        id: uuidv4(),
        note,
        startTime: chord.startTime,
        duration: chord.duration,
        velocity: 60,
      })
    })
  })

  return notes
}

export const createTwinkleStarTemplate = (): ProjectTemplate => {
  const melodyInstrumentId = uuidv4()
  const chordInstrumentId = uuidv4()

  const melodyPatternId = uuidv4()
  const chordPatternId = uuidv4()

  const melodyTrackId = uuidv4()
  const chordTrackId = uuidv4()

  return {
    name: '小星星',
    description: '经典儿歌，温馨的旋律伴奏',
    bpm: 100,
    project: {
      name: '小星星 Twinkle Star',
      bpm: 100,
      timeSignature: [4, 4] as [number, number],
      masterVolume: 0.8,
      instruments: [
        {
          id: melodyInstrumentId,
          name: '铃声旋律',
          type: 'synth',
          settings: {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.5, release: 0.8 },
          },
        },
        {
          id: chordInstrumentId,
          name: '钢琴和弦',
          type: 'synth',
          settings: {
            oscillator: { type: 'sine' },
            envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 1.0 },
          },
        },
      ],
      effects: [
        {
          id: uuidv4(),
          name: '混响',
          type: 'reverb',
          enabled: true,
          wet: 0.3,
          settings: { decay: 2.0 },
        },
      ],
      patterns: [
        {
          id: melodyPatternId,
          name: '小星星旋律',
          instrumentId: melodyInstrumentId,
          length: 24,
          color: '#FFD700',
          notes: createTwinkleStarNotes(),
        },
        {
          id: chordPatternId,
          name: '和弦伴奏',
          instrumentId: chordInstrumentId,
          length: 24,
          color: '#87CEEB',
          notes: createChordAccompaniment(),
        },
      ],
      tracks: [
        {
          id: melodyTrackId,
          name: '旋律',
          type: 'midi',
          instrumentId: melodyInstrumentId,
          volume: 0.8,
          pan: 0,
          mute: false,
          solo: false,
          color: '#FFD700',
          clips: [
            {
              id: uuidv4(),
              patternId: melodyPatternId,
              startTime: 0,
              duration: 24,
              offset: 0,
              color: '#FFD700',
              name: '小星星旋律',
            },
          ],
          effectIds: [],
        },
        {
          id: chordTrackId,
          name: '和弦',
          type: 'midi',
          instrumentId: chordInstrumentId,
          volume: 0.5,
          pan: 0,
          mute: false,
          solo: false,
          color: '#87CEEB',
          clips: [
            {
              id: uuidv4(),
              patternId: chordPatternId,
              startTime: 0,
              duration: 24,
              offset: 0,
              color: '#87CEEB',
              name: '和弦伴奏',
            },
          ],
          effectIds: [],
        },
      ],
      automationLanes: [],
    },
    stepSequencerPatterns: [],
  }
}
