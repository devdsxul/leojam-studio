import * as Tone from 'tone'
import type { Effect, Instrument, Note, Pattern, Track, TransportState, StepSequencerPattern, AutomationLane, AutomationPoint } from '@/types'

class AudioEngine {
  private static instance: AudioEngine
  private instruments: Map<string, Tone.PolySynth | Tone.Sampler> = new Map()
  private effects: Map<string, Tone.ToneAudioNode> = new Map()
  private trackChannels: Map<string, Tone.Channel> = new Map()
  private trackMeters: Map<string, Tone.Meter> = new Map()
  private audioBuffers: Map<string, AudioBuffer> = new Map()
  private audioPlayers: Tone.Player[] = []
  private masterChannel: Tone.Channel
  private masterLimiter: Tone.Limiter
  private masterMeter: Tone.Meter
  private analyser: Tone.Analyser
  private isInitialized = false
  private stepSequencerPart: Tone.Part | null = null
  private scheduledEventIds: number[] = []
  private playlistParts: Tone.Part[] = []
  private automationEventIds: number[] = []

  private constructor() {
    this.masterLimiter = new Tone.Limiter(-1).toDestination()
    this.masterChannel = new Tone.Channel().connect(this.masterLimiter)
    this.analyser = new Tone.Analyser('waveform', 2048)
    this.masterMeter = new Tone.Meter({ normalRange: true, smoothing: 0.8 })
    this.masterChannel.connect(this.analyser)
    this.masterChannel.connect(this.masterMeter)
  }

  static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine()
    }
    return AudioEngine.instance
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return
    await Tone.start()
    this.isInitialized = true
  }

  setBpm(bpm: number): void {
    Tone.Transport.bpm.value = bpm
  }

  getBpm(): number {
    return Tone.Transport.bpm.value
  }

  play(): void {
    Tone.Transport.start()
  }

  pause(): void {
    Tone.Transport.pause()
  }

  stop(): void {
    Tone.Transport.stop()
    Tone.Transport.position = 0
  }

  setPosition(beats: number): void {
    Tone.Transport.position = `0:${beats}:0`
  }

  getPosition(): number {
    const position = Tone.Transport.position
    if (typeof position === 'string') {
      const parts = position.split(':')
      const bars = parseInt(parts[0]) || 0
      const beats = parseInt(parts[1]) || 0
      const sixteenths = parseFloat(parts[2]) || 0
      return bars * 4 + beats + sixteenths / 4
    }
    return position as number
  }

  getTransportState(): TransportState {
    return {
      isPlaying: Tone.Transport.state === 'started',
      isRecording: false,
      currentBeat: this.getPosition(),
      loopStart: 0,
      loopEnd: 16,
      loopEnabled: Tone.Transport.loop,
    }
  }

  setLoop(enabled: boolean, start: number, end: number): void {
    Tone.Transport.loop = enabled
    Tone.Transport.loopStart = `0:${start}:0`
    Tone.Transport.loopEnd = `0:${end}:0`
  }

  setMasterVolume(volume: number): void {
    this.masterChannel.volume.value = Tone.gainToDb(volume)
  }

  getMasterAnalyser(): Tone.Analyser {
    return this.analyser
  }

  getTrackLevel(trackId: string): number {
    const meter = this.trackMeters.get(trackId)
    if (meter) {
      const value = meter.getValue()
      return typeof value === 'number' ? value : 0
    }
    return 0
  }

  getMasterLevel(): { left: number; right: number } {
    const value = this.masterMeter.getValue()
    if (typeof value === 'number') {
      return { left: value, right: value }
    }
    return { left: 0, right: 0 }
  }

  createInstrument(instrument: Instrument): void {
    let toneInstrument: Tone.PolySynth | Tone.Sampler

    switch (instrument.type) {
      case 'synth':
        toneInstrument = new Tone.PolySynth(Tone.Synth, {
          oscillator: { type: 'triangle' },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
          ...instrument.settings,
        })
        break
      case 'sampler':
        toneInstrument = new Tone.Sampler({
          urls: instrument.settings.urls as Record<string, string>,
          baseUrl: instrument.settings.baseUrl as string || '',
        })
        break
      case 'drumkit':
        toneInstrument = new Tone.Sampler({
          urls: instrument.settings.urls as Record<string, string> || {
            C2: 'kick.wav',
            D2: 'snare.wav',
            E2: 'hihat.wav',
            F2: 'clap.wav',
          },
          baseUrl: instrument.settings.baseUrl as string || '/drums/',
        })
        break
      default:
        toneInstrument = new Tone.PolySynth(Tone.Synth)
    }

    this.instruments.set(instrument.id, toneInstrument)
  }

  removeInstrument(instrumentId: string): void {
    const instrument = this.instruments.get(instrumentId)
    if (instrument) {
      instrument.dispose()
      this.instruments.delete(instrumentId)
    }
  }

  getInstrument(instrumentId: string): Tone.PolySynth | Tone.Sampler | undefined {
    return this.instruments.get(instrumentId)
  }

  createEffect(effect: Effect): Tone.ToneAudioNode {
    let toneEffect: Tone.ToneAudioNode

    switch (effect.type) {
      case 'reverb':
        toneEffect = new Tone.Reverb({
          decay: (effect.settings.decay as number) || 1.5,
          wet: effect.wet,
        })
        break
      case 'delay':
        toneEffect = new Tone.FeedbackDelay({
          delayTime: (effect.settings.delayTime as number) || 0.25,
          feedback: (effect.settings.feedback as number) || 0.5,
          wet: effect.wet,
        })
        break
      case 'distortion':
        toneEffect = new Tone.Distortion({
          distortion: (effect.settings.distortion as number) || 0.5,
          wet: effect.wet,
        })
        break
      case 'chorus':
        toneEffect = new Tone.Chorus({
          frequency: (effect.settings.frequency as number) || 4,
          depth: (effect.settings.depth as number) || 0.5,
          wet: effect.wet,
        })
        break
      case 'phaser':
        toneEffect = new Tone.Phaser({
          frequency: (effect.settings.frequency as number) || 0.5,
          octaves: (effect.settings.octaves as number) || 3,
          wet: effect.wet,
        })
        break
      case 'filter':
        toneEffect = new Tone.Filter({
          frequency: (effect.settings.frequency as number) || 1000,
          type: (effect.settings.filterType as BiquadFilterType) || 'lowpass',
          rolloff: -12,
        })
        break
      case 'eq3':
        toneEffect = new Tone.EQ3({
          low: (effect.settings.low as number) || 0,
          mid: (effect.settings.mid as number) || 0,
          high: (effect.settings.high as number) || 0,
        })
        break
      case 'compressor':
        toneEffect = new Tone.Compressor({
          threshold: (effect.settings.threshold as number) || -24,
          ratio: (effect.settings.ratio as number) || 4,
          attack: (effect.settings.attack as number) || 0.003,
          release: (effect.settings.release as number) || 0.25,
        })
        break
      case 'limiter':
        toneEffect = new Tone.Limiter((effect.settings.threshold as number) || -1)
        break
      case 'tremolo':
        toneEffect = new Tone.Tremolo({
          frequency: (effect.settings.frequency as number) || 4,
          depth: (effect.settings.depth as number) || 0.5,
          wet: effect.wet,
        })
        break
      case 'vibrato':
        toneEffect = new Tone.Vibrato({
          frequency: (effect.settings.frequency as number) || 5,
          depth: (effect.settings.depth as number) || 0.1,
          wet: effect.wet,
        })
        break
      case 'bitcrusher':
        toneEffect = new Tone.BitCrusher((effect.settings.bits as number) || 4)
        break
      default:
        toneEffect = new Tone.Gain(1)
    }

    this.effects.set(effect.id, toneEffect)
    return toneEffect
  }

  removeEffect(effectId: string): void {
    const effect = this.effects.get(effectId)
    if (effect) {
      effect.dispose()
      this.effects.delete(effectId)
    }
  }

  getEffect(effectId: string): Tone.ToneAudioNode | undefined {
    return this.effects.get(effectId)
  }

  createTrackChannel(track: Track): void {
    const channel = new Tone.Channel({
      volume: Tone.gainToDb(track.volume),
      pan: track.pan,
      mute: track.mute,
    }).connect(this.masterChannel)

    const meter = new Tone.Meter({ normalRange: true, smoothing: 0.8 })
    channel.connect(meter)

    this.trackChannels.set(track.id, channel)
    this.trackMeters.set(track.id, meter)

    if (track.instrumentId) {
      const instrument = this.instruments.get(track.instrumentId)
      if (instrument) {
        instrument.disconnect()

        let lastNode: Tone.ToneAudioNode = instrument

        track.effectIds.forEach((effectId) => {
          const effect = this.effects.get(effectId)
          if (effect) {
            lastNode.connect(effect)
            lastNode = effect
          }
        })

        lastNode.connect(channel)
      }
    }
  }

  updateTrackChannel(track: Track): void {
    const channel = this.trackChannels.get(track.id)
    if (channel) {
      channel.volume.value = Tone.gainToDb(track.volume)
      channel.pan.value = track.pan
      channel.mute = track.mute
    }
  }

  connectInstrumentToTrack(instrumentId: string, trackId: string, effectIds: string[] = []): void {
    const instrument = this.instruments.get(instrumentId)
    const channel = this.trackChannels.get(trackId)

    if (instrument && channel) {
      instrument.disconnect()

      let lastNode: Tone.ToneAudioNode = instrument

      effectIds.forEach((effectId) => {
        const effect = this.effects.get(effectId)
        if (effect) {
          lastNode.connect(effect)
          lastNode = effect
        }
      })

      lastNode.connect(channel)
    }
  }

  removeTrackChannel(trackId: string): void {
    const channel = this.trackChannels.get(trackId)
    if (channel) {
      channel.dispose()
      this.trackChannels.delete(trackId)
    }
    const meter = this.trackMeters.get(trackId)
    if (meter) {
      meter.dispose()
      this.trackMeters.delete(trackId)
    }
  }

  playNote(instrumentId: string, note: Note, duration: string | number, time?: number, velocity = 0.8): void {
    const instrument = this.instruments.get(instrumentId)
    if (instrument) {
      instrument.triggerAttackRelease(note, duration, time, velocity)
    }
  }

  triggerAttack(instrumentId: string, note: Note, velocity = 0.8): void {
    const instrument = this.instruments.get(instrumentId)
    if (instrument) {
      instrument.triggerAttack(note, undefined, velocity)
    }
  }

  triggerRelease(instrumentId: string, note: Note): void {
    const instrument = this.instruments.get(instrumentId)
    if (instrument) {
      instrument.triggerRelease(note)
    }
  }

  schedulePattern(pattern: Pattern, startTime: number): void {
    const instrument = this.instruments.get(pattern.instrumentId)
    if (!instrument) return

    pattern.notes.forEach((midiNote) => {
      const noteTime = startTime + midiNote.startTime
      const noteDuration = midiNote.duration
      const velocity = midiNote.velocity / 127

      Tone.Transport.schedule((time) => {
        instrument.triggerAttackRelease(
          midiNote.note,
          `0:${noteDuration}:0`,
          time,
          velocity
        )
      }, `0:${noteTime}:0`)
    })
  }

  clearScheduledEvents(): void {
    Tone.Transport.cancel()
  }

  scheduleStepSequencer(pattern: StepSequencerPattern, bpm: number): void {
    this.clearStepSequencer()

    const instrument = this.instruments.get(pattern.instrumentId)
    if (!instrument) return

    const stepDuration = 60 / bpm / 4 // 16th note duration in seconds
    const swingAmount = (pattern.swing || 0) / 100 // 0-1

    const events: { time: number; note: Note; velocity: number }[] = []

    pattern.rows.forEach((row) => {
      row.steps.forEach((step, stepIndex) => {
        if (step.active) {
          const isOffbeat = stepIndex % 2 === 1
          const swingOffset = isOffbeat ? stepDuration * swingAmount * 0.5 : 0
          const baseTime = stepIndex * stepDuration + swingOffset

          const rollCount = step.roll || 1
          const rollDuration = stepDuration / rollCount

          for (let r = 0; r < rollCount; r++) {
            events.push({
              time: baseTime + r * rollDuration,
              note: row.note,
              velocity: step.velocity / 127,
            })
          }
        }
      })
    })

    type StepEvent = { time: number; note: Note; velocity: number }

    this.stepSequencerPart = new Tone.Part<StepEvent>((time, event) => {
      instrument.triggerAttackRelease(event.note, '16n', time, event.velocity)
    }, events)

    this.stepSequencerPart.loop = true
    this.stepSequencerPart.loopEnd = pattern.steps * stepDuration
    this.stepSequencerPart.start(0)
  }

  clearStepSequencer(): void {
    if (this.stepSequencerPart) {
      this.stepSequencerPart.stop()
      this.stepSequencerPart.dispose()
      this.stepSequencerPart = null
    }
    this.scheduledEventIds.forEach((id) => Tone.Transport.clear(id))
    this.scheduledEventIds = []
  }

  getCurrentStep(bpm: number, steps: number): number {
    const stepDuration = 60 / bpm / 4
    const totalDuration = steps * stepDuration
    const position = Tone.Transport.seconds % totalDuration
    return Math.floor(position / stepDuration)
  }

  schedulePlaylist(tracks: Track[], patterns: Pattern[], bpm: number): void {
    this.clearPlaylist()

    const beatsToSeconds = (beats: number) => (60 / bpm) * beats

    tracks.forEach((track) => {
      if (track.mute) return

      const channel = this.trackChannels.get(track.id)

      track.clips.forEach((clip) => {
        if (clip.audioBufferId) {
          const buffer = this.audioBuffers.get(clip.audioBufferId)
          if (buffer && channel) {
            const player = new Tone.Player(buffer).connect(channel)
            player.sync().start(beatsToSeconds(clip.startTime))
            this.audioPlayers.push(player)
          }
        } else if (clip.patternId) {
          const pattern = patterns.find((p) => p.id === clip.patternId)
          const instrument = this.instruments.get(track.instrumentId || '')
          if (!pattern || !instrument) return

          type ClipNoteEvent = { time: number; note: Note; duration: number; velocity: number }
          const events: ClipNoteEvent[] = []

          pattern.notes.forEach((midiNote) => {
            const noteTime = beatsToSeconds(clip.startTime + midiNote.startTime)
            events.push({
              time: noteTime,
              note: midiNote.note,
              duration: beatsToSeconds(midiNote.duration),
              velocity: midiNote.velocity / 127,
            })
          })

          if (events.length > 0) {
            const part = new Tone.Part<ClipNoteEvent>((time, event) => {
              instrument.triggerAttackRelease(
                event.note,
                event.duration,
                time,
                event.velocity
              )
            }, events)

            part.start(0)
            this.playlistParts.push(part)
          }
        }
      })
    })
  }

  clearPlaylist(): void {
    this.playlistParts.forEach((part) => {
      part.stop()
      part.dispose()
    })
    this.playlistParts = []
    this.audioPlayers.forEach((player) => {
      player.stop()
      player.dispose()
    })
    this.audioPlayers = []
    this.clearAutomation()
  }

  // Automation interpolation helper
  private interpolateAutomation(points: AutomationPoint[], time: number): number {
    if (points.length === 0) return 0.5
    if (points.length === 1) return points[0].value
    if (time <= points[0].time) return points[0].value
    if (time >= points[points.length - 1].time) return points[points.length - 1].value

    let startPoint = points[0]
    let endPoint = points[1]

    for (let i = 0; i < points.length - 1; i++) {
      if (time >= points[i].time && time < points[i + 1].time) {
        startPoint = points[i]
        endPoint = points[i + 1]
        break
      }
    }

    const t = (time - startPoint.time) / (endPoint.time - startPoint.time)

    switch (startPoint.curve) {
      case 'step':
        return startPoint.value
      case 'exponential':
        return startPoint.value + (endPoint.value - startPoint.value) * (t * t)
      case 'linear':
      default:
        return startPoint.value + (endPoint.value - startPoint.value) * t
    }
  }

  scheduleAutomation(lanes: AutomationLane[], _tracks: Track[], bpm: number): void {
    this.clearAutomation()

    const beatsToSeconds = (beats: number) => (60 / bpm) * beats

    lanes.forEach((lane) => {
      if (!lane.enabled || lane.points.length === 0) return

      const channel = this.trackChannels.get(lane.targetTrackId)
      if (!channel && lane.targetParam !== 'tempo') return

      // Schedule automation points
      lane.points.forEach((point) => {
        const timeInSeconds = beatsToSeconds(point.time)

        const eventId = Tone.Transport.schedule((time) => {
          const value = point.value

          switch (lane.targetParam) {
            case 'volume':
              if (channel) {
                channel.volume.setValueAtTime(Tone.gainToDb(value), time)
              }
              break
            case 'pan':
              if (channel) {
                const panValue = value * 2 - 1 // 0-1 -> -1 to 1
                channel.pan.setValueAtTime(panValue, time)
              }
              break
            case 'mute':
              if (channel) {
                channel.mute = value >= 0.5
              }
              break
            case 'tempo':
              Tone.Transport.bpm.setValueAtTime(60 + value * 140, time) // 60-200 BPM range
              break
            case 'effectWet':
              if (lane.targetEffectId) {
                const effect = this.effects.get(lane.targetEffectId)
                if (effect && 'wet' in effect) {
                  const wetParam = (effect as { wet: Tone.Signal<'normalRange'> }).wet
                  wetParam.setValueAtTime(value, time)
                }
              }
              break
          }
        }, timeInSeconds)

        this.automationEventIds.push(eventId)
      })
    })
  }

  clearAutomation(): void {
    this.automationEventIds.forEach((id) => Tone.Transport.clear(id))
    this.automationEventIds = []
  }

  getAutomationValueAtTime(lane: AutomationLane, time: number): number {
    return this.interpolateAutomation(lane.points, time)
  }

  async loadAudioFile(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer()
    return await Tone.context.decodeAudioData(arrayBuffer)
  }

  registerAudioBuffer(id: string, buffer: AudioBuffer): void {
    this.audioBuffers.set(id, buffer)
  }

  getAudioBuffer(id: string): AudioBuffer | undefined {
    return this.audioBuffers.get(id)
  }

  removeAudioBuffer(id: string): void {
    this.audioBuffers.delete(id)
  }

  createBufferPlayer(buffer: AudioBuffer): Tone.Player {
    return new Tone.Player(buffer).connect(this.masterChannel)
  }

  async renderOffline(
    tracks: Track[],
    patterns: Pattern[],
    bpm: number,
    duration: number
  ): Promise<AudioBuffer> {
    const toneBuffer = await Tone.Offline(({ transport }) => {
      const limiter = new Tone.Limiter(-1).toDestination()
      const master = new Tone.Channel().connect(limiter)

      const offlineInstruments: Map<string, Tone.PolySynth> = new Map()

      tracks.forEach((track) => {
        if (track.mute || !track.instrumentId) return

        let synth = offlineInstruments.get(track.instrumentId)
        if (!synth) {
          synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
          }).connect(master)
          offlineInstruments.set(track.instrumentId, synth)
        }

        track.clips.forEach((clip) => {
          const pattern = patterns.find((p) => p.id === clip.patternId)
          if (!pattern) return

          pattern.notes.forEach((midiNote) => {
            const noteTime = (60 / bpm) * (clip.startTime + midiNote.startTime)
            const noteDuration = (60 / bpm) * midiNote.duration
            const velocity = midiNote.velocity / 127

            transport.schedule((time) => {
              synth!.triggerAttackRelease(midiNote.note, noteDuration, time, velocity)
            }, noteTime)
          })
        })
      })

      transport.bpm.value = bpm
      transport.start()
    }, duration)

    return toneBuffer.get() as AudioBuffer
  }


  reset(): void {
    this.clearStepSequencer()
    this.clearPlaylist()
    this.clearAutomation()
    this.instruments.forEach((inst) => inst.dispose())
    this.effects.forEach((effect) => effect.dispose())
    this.trackChannels.forEach((channel) => channel.dispose())
    this.trackMeters.forEach((meter) => meter.dispose())
    this.audioPlayers.forEach((player) => player.dispose())
    this.instruments.clear()
    this.effects.clear()
    this.trackChannels.clear()
    this.trackMeters.clear()
    this.audioBuffers.clear()
    this.audioPlayers.length = 0
  }

  dispose(): void {
    this.clearStepSequencer()
    this.clearPlaylist()
    this.instruments.forEach((inst) => inst.dispose())
    this.effects.forEach((effect) => effect.dispose())
    this.trackChannels.forEach((channel) => channel.dispose())
    this.trackMeters.forEach((meter) => meter.dispose())
    this.masterChannel.dispose()
    this.masterLimiter.dispose()
    this.masterMeter.dispose()
    this.analyser.dispose()
    this.instruments.clear()
    this.effects.clear()
    this.trackChannels.clear()
    this.trackMeters.clear()
    this.audioBuffers.clear()
  }
}

export const audioEngine = AudioEngine.getInstance()
export default AudioEngine
