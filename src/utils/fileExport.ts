import type { Project, Pattern } from '@/types'

export interface ProjectFile {
  version: string
  project: Project
}

export const exportProject = (project: Project): string => {
  const projectFile: ProjectFile = {
    version: '1.0.0',
    project: {
      ...project,
      tracks: project.tracks.map((track) => ({
        ...track,
        clips: track.clips.map((clip) => ({
          ...clip,
        })),
      })),
    },
  }

  return JSON.stringify(projectFile, null, 2)
}

export const importProject = (jsonString: string): Project | null => {
  try {
    const parsed = JSON.parse(jsonString) as ProjectFile
    if (!parsed.project || !parsed.version) {
      throw new Error('Invalid project file format')
    }
    return parsed.project
  } catch (error) {
    console.error('Failed to import project:', error)
    return null
  }
}

export const downloadProject = (project: Project): void => {
  const json = exportProject(project)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.flclone`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const uploadProject = (): Promise<Project | null> => {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.flclone,.json'

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) {
        resolve(null)
        return
      }

      try {
        const text = await file.text()
        const project = importProject(text)
        resolve(project)
      } catch (error) {
        console.error('Failed to read project file:', error)
        resolve(null)
      }
    }

    input.click()
  })
}

export const exportMidi = (patterns: Pattern[], bpm: number = 120): ArrayBuffer => {
  const header = new Uint8Array([
    0x4D, 0x54, 0x68, 0x64, // "MThd"
    0x00, 0x00, 0x00, 0x06, // Header length = 6
    0x00, 0x01, // Format 1
    0x00, patterns.length + 1, // Number of tracks
    0x00, 0x60, // 96 ticks per quarter note
  ])

  const tracks: Uint8Array[] = []

  const tempoTrack = createTempoTrack(bpm)
  tracks.push(tempoTrack)

  patterns.forEach((pattern) => {
    const trackData = createMidiTrack(pattern)
    tracks.push(trackData)
  })

  const totalLength = header.length + tracks.reduce((sum, track) => sum + track.length, 0)
  const result = new Uint8Array(totalLength)

  let offset = 0
  result.set(header, offset)
  offset += header.length

  tracks.forEach((track) => {
    result.set(track, offset)
    offset += track.length
  })

  return result.buffer
}

const createTempoTrack = (bpm: number): Uint8Array => {
  const microsecondsPerBeat = Math.round(60000000 / bpm)

  const events = [
    0x00, // Delta time
    0xFF, 0x51, 0x03, // Tempo meta event
    (microsecondsPerBeat >> 16) & 0xFF,
    (microsecondsPerBeat >> 8) & 0xFF,
    microsecondsPerBeat & 0xFF,
    0x00, // Delta time
    0xFF, 0x2F, 0x00, // End of track
  ]

  const trackLength = events.length
  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B, // "MTrk"
    (trackLength >> 24) & 0xFF,
    (trackLength >> 16) & 0xFF,
    (trackLength >> 8) & 0xFF,
    trackLength & 0xFF,
  ]

  return new Uint8Array([...trackHeader, ...events])
}

const createMidiTrack = (pattern: Pattern): Uint8Array => {
  const noteToMidi = (note: string): number => {
    const noteMap: Record<string, number> = {
      'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5,
      'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11,
    }
    const match = note.match(/^([A-G]#?)(\d)$/)
    if (!match) return 60
    const noteName = match[1]
    const octave = parseInt(match[2])
    return (octave + 1) * 12 + (noteMap[noteName] || 0)
  }

  interface MidiEvent {
    time: number
    type: 'on' | 'off'
    midiNote: number
    velocity: number
  }

  const midiEvents: MidiEvent[] = []

  pattern.notes.forEach((note) => {
    const midiNote = noteToMidi(note.note)
    const startTicks = Math.round(note.startTime * 96)
    const endTicks = Math.round((note.startTime + note.duration) * 96)
    const velocity = Math.round(note.velocity)

    midiEvents.push({ time: startTicks, type: 'on', midiNote, velocity })
    midiEvents.push({ time: endTicks, type: 'off', midiNote, velocity: 0 })
  })

  midiEvents.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time
    if (a.type !== b.type) return a.type === 'off' ? -1 : 1
    return 0
  })

  const events: number[] = []
  let lastTime = 0

  midiEvents.forEach((event) => {
    const delta = event.time - lastTime
    events.push(...encodeVariableLength(delta))
    events.push(event.type === 'on' ? 0x90 : 0x80, event.midiNote, event.velocity)
    lastTime = event.time
  })

  events.push(0x00, 0xFF, 0x2F, 0x00)

  const trackLength = events.length
  const trackHeader = [
    0x4D, 0x54, 0x72, 0x6B,
    (trackLength >> 24) & 0xFF,
    (trackLength >> 16) & 0xFF,
    (trackLength >> 8) & 0xFF,
    trackLength & 0xFF,
  ]

  return new Uint8Array([...trackHeader, ...events])
}

const encodeVariableLength = (value: number): number[] => {
  const bytes: number[] = []
  bytes.push(value & 0x7F)
  value >>= 7

  while (value > 0) {
    bytes.unshift((value & 0x7F) | 0x80)
    value >>= 7
  }

  return bytes
}

export const downloadMidi = (patterns: Pattern[], filename: string, bpm: number = 120): void => {
  const midiData = exportMidi(patterns, bpm)
  const blob = new Blob([midiData], { type: 'audio/midi' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.mid`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportWav = async (
  audioContext: AudioContext,
  duration: number,
  renderCallback: (offlineContext: OfflineAudioContext) => Promise<void>
): Promise<AudioBuffer> => {
  const sampleRate = audioContext.sampleRate
  const offlineContext = new OfflineAudioContext(2, sampleRate * duration, sampleRate)

  await renderCallback(offlineContext)

  return await offlineContext.startRendering()
}

export const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const format = 1 // PCM
  const bitDepth = 16
  const bytesPerSample = bitDepth / 8
  const blockAlign = numChannels * bytesPerSample

  const samples = buffer.length
  const dataSize = samples * blockAlign
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, bufferSize - 8, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, format, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitDepth, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)

  const channels: Float32Array[] = []
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i))
  }

  let offset = 44
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]))
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF
      view.setInt16(offset, intSample, true)
      offset += 2
    }
  }

  return arrayBuffer
}

export const downloadWav = (buffer: AudioBuffer, filename: string): void => {
  const wavData = audioBufferToWav(buffer)
  const blob = new Blob([wavData], { type: 'audio/wav' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.wav`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
