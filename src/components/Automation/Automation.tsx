import { useState, useCallback, useRef } from 'react'
import { useDAWStore } from '@/store/dawStore'
import { i18n } from '@/i18n'
import type { AutomationTarget, AutomationLane as AutomationLaneType } from '@/types'
import './Automation.css'

export function Automation() {
  const {
    project,
    addAutomationLane,
    removeAutomationLane,
    addAutomationPoint,
    removeAutomationPoint,
    updateAutomationPoint,
    toggleAutomationLane,
  } = useDAWStore()

  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedTrackId, setSelectedTrackId] = useState<string>('')
  const [selectedParam, setSelectedParam] = useState<AutomationTarget>('volume')

  const handleAddLane = useCallback(() => {
    if (selectedTrackId) {
      addAutomationLane(selectedTrackId, selectedParam)
      setShowAddModal(false)
    }
  }, [selectedTrackId, selectedParam, addAutomationLane])

  const openAddModal = useCallback(() => {
    if (project.tracks.length > 0) {
      setSelectedTrackId(project.tracks[0].id)
    }
    setShowAddModal(true)
  }, [project.tracks])

  const getParamLabel = (param: AutomationTarget): string => {
    const labels: Record<AutomationTarget, string> = {
      volume: i18n.automation.params.volume,
      pan: i18n.automation.params.pan,
      mute: i18n.automation.params.mute,
      tempo: i18n.automation.params.tempo,
      effectWet: i18n.automation.params.effectWet,
      effectParam: '效果参数',
    }
    return labels[param]
  }

  return (
    <div className="automation-panel">
      <div className="automation-header">
        <h3>{i18n.automation.title}</h3>
        <button className="add-lane-btn" onClick={openAddModal}>
          + {i18n.automation.addLane}
        </button>
      </div>

      <div className="automation-lanes">
        {project.automationLanes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📈</div>
            <div className="empty-state-title">{i18n.automation.title}</div>
            <div className="empty-state-hint">{i18n.automation.emptyHint}</div>
          </div>
        ) : (
          project.automationLanes.map((lane) => {
            const track = project.tracks.find((t) => t.id === lane.targetTrackId)
            return (
              <AutomationLane
                key={lane.id}
                lane={lane}
                trackName={track?.name || '未知轨道'}
                onToggle={() => toggleAutomationLane(lane.id)}
                onRemove={() => removeAutomationLane(lane.id)}
                onAddPoint={(time, value) => addAutomationPoint(lane.id, time, value)}
                onRemovePoint={(pointId) => removeAutomationPoint(lane.id, pointId)}
                onUpdatePoint={(pointId, updates) => updateAutomationPoint(lane.id, pointId, updates)}
                getParamLabel={getParamLabel}
              />
            )
          })
        )}
      </div>

      {showAddModal && (
        <div className="add-lane-modal" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>{i18n.automation.addLane}</h4>

            <div className="form-group">
              <label>目标轨道</label>
              <select
                value={selectedTrackId}
                onChange={(e) => setSelectedTrackId(e.target.value)}
              >
                {project.tracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>自动化参数</label>
              <select
                value={selectedParam}
                onChange={(e) => setSelectedParam(e.target.value as AutomationTarget)}
              >
                <option value="volume">{i18n.automation.params.volume}</option>
                <option value="pan">{i18n.automation.params.pan}</option>
                <option value="mute">{i18n.automation.params.mute}</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>
                {i18n.actions.cancel}
              </button>
              <button className="btn-confirm" onClick={handleAddLane} disabled={!selectedTrackId}>
                {i18n.actions.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface AutomationLaneProps {
  lane: AutomationLaneType
  trackName: string
  onToggle: () => void
  onRemove: () => void
  onAddPoint: (time: number, value: number) => void
  onRemovePoint: (pointId: string) => void
  onUpdatePoint: (pointId: string, updates: { time?: number; value?: number }) => void
  getParamLabel: (param: AutomationTarget) => string
}

function AutomationLane({
  lane,
  trackName,
  onToggle,
  onRemove,
  onAddPoint,
  onRemovePoint,
  onUpdatePoint,
  getParamLabel,
}: AutomationLaneProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging) return

      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const time = (x / rect.width) * 16 // 16 beats
      const value = 1 - y / rect.height

      onAddPoint(time, value)
    },
    [onAddPoint, isDragging]
  )

  const handlePointMouseDown = useCallback(
    (e: React.MouseEvent, pointId: string) => {
      e.stopPropagation()
      setSelectedPointId(pointId)
      setIsDragging(true)

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!canvasRef.current) return
        const rect = canvasRef.current.getBoundingClientRect()
        const x = Math.max(0, Math.min(moveEvent.clientX - rect.left, rect.width))
        const y = Math.max(0, Math.min(moveEvent.clientY - rect.top, rect.height))
        const time = (x / rect.width) * 16
        const value = 1 - y / rect.height

        onUpdatePoint(pointId, { time, value })
      }

      const handleMouseUp = () => {
        setIsDragging(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [onUpdatePoint]
  )

  const handlePointDoubleClick = useCallback(
    (e: React.MouseEvent, pointId: string) => {
      e.stopPropagation()
      onRemovePoint(pointId)
    },
    [onRemovePoint]
  )

  const drawAutomationLine = () => {
    if (lane.points.length < 2) return null

    const points = lane.points
      .map((p) => {
        const x = (p.time / 16) * 100
        const y = (1 - p.value) * 100
        return `${x}%,${y}%`
      })
      .join(' ')

    return (
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      >
        <polyline
          points={points.replace(/%/g, '')}
          fill="none"
          stroke={lane.color}
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  return (
    <div className="automation-lane">
      <div className="lane-header">
        <div className="lane-color" style={{ backgroundColor: lane.color }} />
        <div className="lane-info">
          <div className="lane-name">{trackName}</div>
          <div className="lane-target">{getParamLabel(lane.targetParam)}</div>
        </div>
        <div className="lane-actions">
          <button
            className={`lane-btn ${lane.enabled ? 'active' : ''}`}
            onClick={onToggle}
            title={lane.enabled ? i18n.automation.disable : i18n.automation.enable}
          >
            {lane.enabled ? '✓' : '○'}
          </button>
          <button className="lane-btn danger" onClick={onRemove} title={i18n.automation.removeLane}>
            🗑️
          </button>
        </div>
      </div>

      <div ref={canvasRef} className="lane-canvas-container" onClick={handleCanvasClick}>
        {drawAutomationLine()}
        {lane.points.map((point) => (
          <div
            key={point.id}
            className={`automation-point ${selectedPointId === point.id ? 'selected' : ''}`}
            style={{
              left: `${(point.time / 16) * 100}%`,
              top: `${(1 - point.value) * 100}%`,
              backgroundColor: lane.color,
            }}
            onMouseDown={(e) => handlePointMouseDown(e, point.id)}
            onDoubleClick={(e) => handlePointDoubleClick(e, point.id)}
          />
        ))}
      </div>
    </div>
  )
}
