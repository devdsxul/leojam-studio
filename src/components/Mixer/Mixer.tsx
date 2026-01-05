import { useCallback, useEffect, useState, useRef } from 'react'
import { useDAWStore } from '@/store/dawStore'
import { audioEngine } from '@/audio/AudioEngine'
import { i18n } from '@/i18n'
import type { EffectType } from '@/types'
import './Mixer.css'

const CHANNEL_WIDTH = 80

export function Mixer() {
  const {
    project,
    setTrackVolume,
    setTrackPan,
    toggleTrackMute,
    toggleTrackSolo,
    setMasterVolume,
    addEffect,
    addEffectToTrack,
    removeEffectFromTrack,
  } = useDAWStore()

  const [levels, setLevels] = useState<Map<string, number>>(new Map())
  const [masterLevel, setMasterLevel] = useState({ left: 0, right: 0 })
  const animationRef = useRef<number>()

  useEffect(() => {
    const updateLevels = () => {
      const newLevels = new Map<string, number>()
      project.tracks.forEach((track) => {
        newLevels.set(track.id, audioEngine.getTrackLevel(track.id))
      })
      setLevels(newLevels)
      setMasterLevel(audioEngine.getMasterLevel())

      animationRef.current = requestAnimationFrame(updateLevels)
    }

    animationRef.current = requestAnimationFrame(updateLevels)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [project.tracks])

  const effectTypes: { type: EffectType; label: string }[] = [
    { type: 'reverb', label: i18n.mixer.effectTypes.reverb },
    { type: 'delay', label: i18n.mixer.effectTypes.delay },
    { type: 'distortion', label: i18n.mixer.effectTypes.distortion },
    { type: 'chorus', label: '合唱' },
    { type: 'compressor', label: i18n.mixer.effectTypes.compressor },
    { type: 'eq3', label: i18n.mixer.effectTypes.eq },
    { type: 'filter', label: i18n.mixer.effectTypes.filter },
    { type: 'limiter', label: '限幅器' },
  ]

  const handleAddEffect = useCallback((trackId: string, effectType: EffectType) => {
    const effectId = addEffect({
      name: effectType.charAt(0).toUpperCase() + effectType.slice(1),
      type: effectType,
      enabled: true,
      wet: 0.5,
      settings: {},
    })
    addEffectToTrack(trackId, effectId)
  }, [addEffect, addEffectToTrack])

  const handleVolumeChange = useCallback((trackId: string, value: number) => {
    setTrackVolume(trackId, value)
  }, [setTrackVolume])

  const handlePanChange = useCallback((trackId: string, value: number) => {
    setTrackPan(trackId, value)
  }, [setTrackPan])

  const volumeToDb = (volume: number): string => {
    if (volume === 0) return '-∞'
    const db = 20 * Math.log10(volume)
    return db.toFixed(1)
  }

  return (
    <div className="mixer">
      <div className="mixer-header">
        <h3>{i18n.views.mixer}</h3>
      </div>

      <div className="mixer-channels">
        {project.tracks.map((track, index) => {
          const trackEffects = project.effects.filter((e) => track.effectIds.includes(e.id))
          const level = levels.get(track.id) || 0

          return (
            <div
              key={track.id}
              className="mixer-channel"
              style={{ width: CHANNEL_WIDTH }}
            >
              <div className="channel-label" style={{ borderTopColor: track.color }}>
                <span className="channel-name">{track.name}</span>
                <span className="channel-number">{index + 1}</span>
              </div>

              <div className="channel-effects">
                <div className="effects-list">
                  {trackEffects.map((effect) => (
                    <div key={effect.id} className="effect-slot filled">
                      <span>{effect.name}</span>
                      <button
                        className="remove-effect"
                        onClick={() => removeEffectFromTrack(track.id, effect.id)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <select
                  className="add-effect-select"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddEffect(track.id, e.target.value as EffectType)
                    }
                  }}
                >
                  <option value="">+ 效果器</option>
                  {effectTypes.map((et) => (
                    <option key={et.type} value={et.type}>{et.label}</option>
                  ))}
                </select>
              </div>

              <div className="channel-pan">
                <label>{i18n.mixer.pan}</label>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.01}
                  value={track.pan}
                  onChange={(e) => handlePanChange(track.id, Number(e.target.value))}
                  className="pan-knob"
                />
                <span className="pan-value">
                  {track.pan === 0 ? 'C' : track.pan < 0 ? `L${Math.abs(Math.round(track.pan * 100))}` : `R${Math.round(track.pan * 100)}`}
                </span>
              </div>

              <div className="channel-fader-section">
                <div className="meter-container">
                  <div className="meter">
                    <div className="meter-fill" style={{ height: `${level * 100}%` }} />
                  </div>
                </div>

                <div className="fader-container">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={track.volume}
                    onChange={(e) => handleVolumeChange(track.id, Number(e.target.value))}
                    className="fader"
                  />
                </div>

                <div className="db-display">
                  {volumeToDb(track.volume)} dB
                </div>
              </div>

              <div className="channel-buttons">
                <button
                  className={`channel-btn mute ${track.mute ? 'active' : ''}`}
                  onClick={() => toggleTrackMute(track.id)}
                >
                  M
                </button>
                <button
                  className={`channel-btn solo ${track.solo ? 'active' : ''}`}
                  onClick={() => toggleTrackSolo(track.id)}
                >
                  S
                </button>
              </div>
            </div>
          )
        })}

        <div className="mixer-channel master" style={{ width: CHANNEL_WIDTH }}>
          <div className="channel-label master-label">
            <span className="channel-name">{i18n.mixer.master}</span>
          </div>

          <div className="channel-effects">
            <div className="effects-list"></div>
          </div>

          <div className="channel-pan">
            <label>立体声宽度</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              defaultValue={1}
              className="pan-knob"
            />
          </div>

          <div className="channel-fader-section">
            <div className="meter-container">
              <div className="meter">
                <div className="meter-fill" style={{ height: `${masterLevel.left * 100}%` }} />
              </div>
              <div className="meter">
                <div className="meter-fill" style={{ height: `${masterLevel.right * 100}%` }} />
              </div>
            </div>

            <div className="fader-container">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={project.masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="fader"
              />
            </div>

            <div className="db-display">
              {volumeToDb(project.masterVolume)} dB
            </div>
          </div>

          <div className="channel-buttons">
            <button className="channel-btn" disabled>M</button>
            <button className="channel-btn" disabled>S</button>
          </div>
        </div>
      </div>
    </div>
  )
}
