import { useCallback, useState, useMemo, useEffect, useRef } from 'react'
import { useDAWStore } from '@/store/dawStore'
import { audioEngine } from '@/audio/AudioEngine'
import { i18n } from '@/i18n'
import type { Note } from '@/types'
import './StepSequencer.css'

const STEP_SIZE = 32
const ROW_HEIGHT = 40

export function StepSequencer() {
  const {
    project,
    stepSequencerPatterns,
    transport,
    addStepSequencerPattern,
    updateStepSequencerStep,
    setStepSequencerSwing,
    addStepSequencerRow,
    removeStepSequencerRow,
    playNote,
  } = useDAWStore()

  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null)
  const [steps, setSteps] = useState(16)
  const [currentStep, setCurrentStep] = useState(0)
  const animationRef = useRef<number | null>(null)

  const selectedPattern = useMemo(() => {
    return stepSequencerPatterns.find((p) => p.id === selectedPatternId)
  }, [stepSequencerPatterns, selectedPatternId])

  useEffect(() => {
    if (stepSequencerPatterns.length > 0 && !selectedPatternId) {
      setSelectedPatternId(stepSequencerPatterns[0].id)
    }
  }, [stepSequencerPatterns, selectedPatternId])

  // Schedule pattern with Tone.Transport
  useEffect(() => {
    if (selectedPattern && transport.isPlaying) {
      audioEngine.scheduleStepSequencer(selectedPattern, project.bpm)
    } else {
      audioEngine.clearStepSequencer()
    }

    return () => {
      audioEngine.clearStepSequencer()
    }
  }, [selectedPattern, transport.isPlaying, project.bpm])

  // Re-schedule when pattern changes during playback
  useEffect(() => {
    if (selectedPattern && transport.isPlaying) {
      audioEngine.scheduleStepSequencer(selectedPattern, project.bpm)
    }
  }, [stepSequencerPatterns, selectedPatternId])

  // Update current step display using requestAnimationFrame
  useEffect(() => {
    if (transport.isPlaying && selectedPattern) {
      const updateStep = () => {
        const step = audioEngine.getCurrentStep(project.bpm, selectedPattern.steps)
        setCurrentStep(step)
        animationRef.current = requestAnimationFrame(updateStep)
      }
      animationRef.current = requestAnimationFrame(updateStep)

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
        }
      }
    } else {
      setCurrentStep(0)
    }
  }, [transport.isPlaying, selectedPattern, project.bpm])

  const handleStepClick = useCallback((rowIndex: number, stepIndex: number) => {
    if (!selectedPattern) return

    const step = selectedPattern.rows[rowIndex]?.steps[stepIndex]
    if (step) {
      updateStepSequencerStep(selectedPattern.id, rowIndex, stepIndex, !step.active)

      if (!step.active) {
        const row = selectedPattern.rows[rowIndex]
        const instrument = project.instruments.find((i) => i.id === selectedPattern.instrumentId)
        if (instrument && row) {
          playNote(instrument.id, row.note, 0.1, 0.8)
        }
      }
    }
  }, [selectedPattern, updateStepSequencerStep, project.instruments, playNote])

  const handleStepRightClick = useCallback((e: React.MouseEvent, rowIndex: number, stepIndex: number) => {
    e.preventDefault()
    if (!selectedPattern) return

    const step = selectedPattern.rows[rowIndex]?.steps[stepIndex]
    if (step && step.active) {
      const currentRoll = step.roll || 1
      const nextRoll = ((currentRoll % 4) + 1) as 1 | 2 | 3 | 4
      updateStepSequencerStep(selectedPattern.id, rowIndex, stepIndex, true, step.velocity, nextRoll)
    }
  }, [selectedPattern, updateStepSequencerStep])

  const handleSwingChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedPattern) return
    setStepSequencerSwing(selectedPattern.id, Number(e.target.value))
  }, [selectedPattern, setStepSequencerSwing])

  const handleCreatePattern = useCallback(() => {
    if (project.instruments.length === 0) return
    const patternId = addStepSequencerPattern(project.instruments[0].id, steps)
    setSelectedPatternId(patternId)
  }, [project.instruments, addStepSequencerPattern, steps])

  const handleAddRow = useCallback(() => {
    if (!selectedPattern) return
    const notes: Note[] = ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3']
    const randomNote = notes[Math.floor(Math.random() * notes.length)]
    addStepSequencerRow(selectedPattern.id, randomNote, randomNote)
  }, [selectedPattern, addStepSequencerRow])

  const handleRemoveRow = useCallback((rowIndex: number) => {
    if (!selectedPattern) return
    removeStepSequencerRow(selectedPattern.id, rowIndex)
  }, [selectedPattern, removeStepSequencerRow])

  if (!selectedPattern) {
    return (
      <div className="step-sequencer empty">
        <div className="empty-message">
          <h3>暂无鼓机 Pattern</h3>
          <p>创建一个步进音序器 Pattern 开始制作节拍</p>
          <div className="create-pattern-form">
            <label>
              {i18n.stepSequencer.steps}:
              <select value={steps} onChange={(e) => setSteps(Number(e.target.value))}>
                <option value={8}>8</option>
                <option value={16}>16</option>
                <option value={32}>32</option>
                <option value={64}>64</option>
              </select>
            </label>
            <button
              onClick={handleCreatePattern}
              disabled={project.instruments.length === 0}
            >
              创建 Pattern
            </button>
          </div>
          {project.instruments.length === 0 && (
            <p className="warning">请先添加乐器</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="step-sequencer">
      <div className="step-sequencer-toolbar">
        <div className="pattern-selector">
          <select
            value={selectedPatternId || ''}
            onChange={(e) => setSelectedPatternId(e.target.value)}
          >
            {stepSequencerPatterns.map((pattern) => (
              <option key={pattern.id} value={pattern.id}>
                {pattern.name}
              </option>
            ))}
          </select>
          <button onClick={handleCreatePattern}>+ 新建</button>
        </div>

        <div className="pattern-controls">
          <div className="swing-control">
            <label>Swing: {selectedPattern.swing}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={selectedPattern.swing}
              onChange={handleSwingChange}
            />
          </div>
          <button onClick={handleAddRow}>+ 添加行</button>
          <span className="step-indicator">
            步: {currentStep + 1} / {selectedPattern.steps}
          </span>
        </div>
      </div>

      <div className="step-grid-container">
        <div className="row-headers">
          {selectedPattern.rows.map((row, rowIndex) => (
            <div key={row.id} className="row-header" style={{ height: ROW_HEIGHT }}>
              <span className="row-name">{row.name}</span>
              <button
                className="remove-row-btn"
                onClick={() => handleRemoveRow(rowIndex)}
                title="删除行"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="step-grid">
          <div className="step-markers">
            {Array.from({ length: selectedPattern.steps }).map((_, i) => (
              <div
                key={i}
                className={`step-marker ${i % 4 === 0 ? 'bar' : ''} ${currentStep === i && transport.isPlaying ? 'active' : ''}`}
                style={{ width: STEP_SIZE }}
              >
                {i % 4 === 0 && <span>{Math.floor(i / 4) + 1}</span>}
              </div>
            ))}
          </div>

          {selectedPattern.rows.map((row, rowIndex) => (
            <div key={row.id} className="step-row" style={{ height: ROW_HEIGHT }}>
              {row.steps.map((step, stepIndex) => (
                <div
                  key={stepIndex}
                  className={`step ${step.active ? 'active' : ''} ${stepIndex % 4 === 0 ? 'bar-start' : ''} ${currentStep === stepIndex && transport.isPlaying ? 'current' : ''} ${step.roll && step.roll > 1 ? `roll-${step.roll}` : ''}`}
                  style={{
                    width: STEP_SIZE,
                    height: STEP_SIZE,
                    opacity: step.active ? step.velocity / 127 : 1,
                  }}
                  onClick={() => handleStepClick(rowIndex, stepIndex)}
                  onContextMenu={(e) => handleStepRightClick(e, rowIndex, stepIndex)}
                  title={step.active && step.roll && step.roll > 1 ? `Roll x${step.roll}` : ''}
                >
                  {step.active && step.roll && step.roll > 1 && (
                    <span className="roll-indicator">{step.roll}</span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
