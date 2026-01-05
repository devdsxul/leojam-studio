import { useCallback, useState, useRef, useMemo } from 'react'
import { useDAWStore } from '@/store/dawStore'
import { i18n } from '@/i18n'
import { createTrapTemplate, createBoomBapTemplate, createLofiTemplate } from '@/templates/trapTemplate'
import { createTwinkleStarTemplate } from '@/templates/twinkleStar'
import type { EffectType } from '@/types'
import './Browser.css'

type TabType = 'templates' | 'instruments' | 'effects' | 'samples' | 'patterns'

export function Browser() {
  const {
    project,
    addInstrument,
    removeInstrument,
    addEffect,
    removeEffect,
    addPattern,
    removePattern,
    selectPattern,
    setCurrentView,
    loadSample,
    samples,
    removeSample,
    loadTemplate,
    addAudioClipFromSample,
  } = useDAWStore()

  const [activeTab, setActiveTab] = useState<TabType>('templates')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['synths', 'drums']))
  const [isDragging, setIsDragging] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFilesLoad = useCallback(async (files: FileList | null) => {
    if (!files) return
    for (const file of Array.from(files)) {
      if (file.type.startsWith('audio/')) {
        await loadSample(file)
      }
    }
  }, [loadSample])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    handleFilesLoad(e.dataTransfer.files)
  }, [handleFilesLoad])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const instrumentPresets = [
    { name: 'Basic Synth', type: 'synth' as const, settings: { oscillator: { type: 'triangle' } } },
    { name: 'Square Lead', type: 'synth' as const, settings: { oscillator: { type: 'square' } } },
    { name: 'Sawtooth Pad', type: 'synth' as const, settings: { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.5, release: 2 } } },
    { name: 'Sine Bass', type: 'synth' as const, settings: { oscillator: { type: 'sine' } } },
    { name: 'FM Bell', type: 'synth' as const, settings: { oscillator: { type: 'fmsine' } } },
    { name: 'Pulse Lead', type: 'synth' as const, settings: { oscillator: { type: 'pulse', width: 0.3 } } },
  ]

  const drumPresets = [
    { name: '808 Kit', type: 'drumkit' as const, settings: {} },
    { name: 'Acoustic Kit', type: 'drumkit' as const, settings: {} },
    { name: 'Electronic Kit', type: 'drumkit' as const, settings: {} },
  ]

  const effectPresets: { name: string; type: EffectType; settings: Record<string, unknown> }[] = [
    { name: 'Hall Reverb', type: 'reverb', settings: { decay: 4 } },
    { name: 'Room Reverb', type: 'reverb', settings: { decay: 1.5 } },
    { name: 'Plate Reverb', type: 'reverb', settings: { decay: 2.5 } },
    { name: 'Ping Pong Delay', type: 'delay', settings: { delayTime: 0.25, feedback: 0.4 } },
    { name: 'Slapback Delay', type: 'delay', settings: { delayTime: 0.1, feedback: 0.2 } },
    { name: 'Tape Delay', type: 'delay', settings: { delayTime: 0.375, feedback: 0.5 } },
    { name: 'Overdrive', type: 'distortion', settings: { distortion: 0.4 } },
    { name: 'Fuzz', type: 'distortion', settings: { distortion: 0.8 } },
    { name: 'Chorus', type: 'chorus', settings: { frequency: 4, depth: 0.5 } },
    { name: 'Flanger', type: 'chorus', settings: { frequency: 0.5, depth: 0.8 } },
    { name: 'Phaser', type: 'phaser', settings: { frequency: 0.5, octaves: 3 } },
    { name: 'Compressor', type: 'compressor', settings: { threshold: -24, ratio: 4 } },
    { name: 'Limiter', type: 'limiter', settings: { threshold: -1 } },
    { name: 'Low Pass Filter', type: 'filter', settings: { frequency: 1000, filterType: 'lowpass' } },
    { name: 'High Pass Filter', type: 'filter', settings: { frequency: 200, filterType: 'highpass' } },
    { name: '3-Band EQ', type: 'eq3', settings: { low: 0, mid: 0, high: 0 } },
    { name: 'Bitcrusher', type: 'bitcrusher', settings: { bits: 8 } },
    { name: 'Lo-Fi', type: 'bitcrusher', settings: { bits: 4 } },
  ]

  const filteredInstrumentPresets = useMemo(() => {
    if (!searchQuery) return instrumentPresets
    const query = searchQuery.toLowerCase()
    return instrumentPresets.filter((p) => p.name.toLowerCase().includes(query))
  }, [searchQuery])

  const filteredDrumPresets = useMemo(() => {
    if (!searchQuery) return drumPresets
    const query = searchQuery.toLowerCase()
    return drumPresets.filter((p) => p.name.toLowerCase().includes(query))
  }, [searchQuery])

  const filteredEffectPresets = useMemo(() => {
    if (!searchQuery) return effectPresets
    const query = searchQuery.toLowerCase()
    return effectPresets.filter((p) => p.name.toLowerCase().includes(query) || p.type.toLowerCase().includes(query))
  }, [searchQuery])

  const handleAddInstrument = useCallback((preset: typeof instrumentPresets[0] | typeof drumPresets[0]) => {
    addInstrument({
      name: preset.name,
      type: preset.type,
      settings: preset.settings,
    })
  }, [addInstrument])

  const handleAddEffect = useCallback((preset: typeof effectPresets[0]) => {
    addEffect({
      name: preset.name,
      type: preset.type,
      enabled: true,
      wet: 0.5,
      settings: preset.settings,
    })
  }, [addEffect])

  const handleCreatePattern = useCallback((instrumentId: string) => {
    const patternId = addPattern(instrumentId)
    selectPattern(patternId)
    setCurrentView('pianoroll')
  }, [addPattern, selectPattern, setCurrentView])

  return (
    <div className="browser">
      <div className="browser-tabs">
        <button
          className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          模板
        </button>
        <button
          className={`tab ${activeTab === 'instruments' ? 'active' : ''}`}
          onClick={() => setActiveTab('instruments')}
        >
          {i18n.browser.instruments}
        </button>
        <button
          className={`tab ${activeTab === 'effects' ? 'active' : ''}`}
          onClick={() => setActiveTab('effects')}
        >
          {i18n.browser.effects}
        </button>
        <button
          className={`tab ${activeTab === 'patterns' ? 'active' : ''}`}
          onClick={() => setActiveTab('patterns')}
        >
          {i18n.browser.presets}
        </button>
        <button
          className={`tab ${activeTab === 'samples' ? 'active' : ''}`}
          onClick={() => setActiveTab('samples')}
        >
          {i18n.browser.samples}
        </button>
      </div>

      {(activeTab === 'instruments' || activeTab === 'effects') && (
        <div className="browser-search">
          <input
            type="text"
            placeholder="搜索预设..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              ×
            </button>
          )}
        </div>
      )}

      <div className="browser-content">
        {activeTab === 'templates' && (
          <div className="browser-section">
            <div className="section-divider">儿歌模板</div>
            <div className="template-grid">
              <div
                className="template-card"
                onClick={() => loadTemplate(createTwinkleStarTemplate)}
              >
                <div className="template-icon">⭐</div>
                <div className="template-info">
                  <div className="template-name">小星星</div>
                  <div className="template-desc">经典儿歌，100 BPM，温馨旋律</div>
                </div>
              </div>
            </div>
            <div className="section-divider">嘻哈风格模板</div>
            <div className="template-grid">
              <div
                className="template-card"
                onClick={() => loadTemplate(createTrapTemplate)}
              >
                <div className="template-icon">🎤</div>
                <div className="template-info">
                  <div className="template-name">{i18n.templates.trap.name}</div>
                  <div className="template-desc">{i18n.templates.trap.desc}</div>
                </div>
              </div>
              <div
                className="template-card"
                onClick={() => loadTemplate(createBoomBapTemplate)}
              >
                <div className="template-icon">🎧</div>
                <div className="template-info">
                  <div className="template-name">{i18n.templates.boomBap.name}</div>
                  <div className="template-desc">{i18n.templates.boomBap.desc}</div>
                </div>
              </div>
              <div
                className="template-card"
                onClick={() => loadTemplate(createLofiTemplate)}
              >
                <div className="template-icon">☕</div>
                <div className="template-info">
                  <div className="template-name">{i18n.templates.lofi.name}</div>
                  <div className="template-desc">{i18n.templates.lofi.desc}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'instruments' && (
          <div className="browser-section">
            <div className="section-group">
              <div
                className="section-header"
                onClick={() => toggleSection('synths')}
              >
                <span className={`expand-icon ${expandedSections.has('synths') ? 'expanded' : ''}`}>▶</span>
                <span>合成器</span>
              </div>
              {expandedSections.has('synths') && (
                <div className="section-items">
                  {filteredInstrumentPresets.length === 0 ? (
                    <div className="no-results">无匹配结果</div>
                  ) : filteredInstrumentPresets.map((preset, index) => (
                    <div
                      key={index}
                      className="browser-item"
                      onDoubleClick={() => handleAddInstrument(preset)}
                    >
                      <span className="item-icon">🎹</span>
                      <span className="item-name">{preset.name}</span>
                      <button
                        className="add-btn"
                        onClick={() => handleAddInstrument(preset)}
                        title="添加到工程"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section-group">
              <div
                className="section-header"
                onClick={() => toggleSection('drums')}
              >
                <span className={`expand-icon ${expandedSections.has('drums') ? 'expanded' : ''}`}>▶</span>
                <span>鼓组</span>
              </div>
              {expandedSections.has('drums') && (
                <div className="section-items">
                  {filteredDrumPresets.length === 0 ? (
                    <div className="no-results">无匹配结果</div>
                  ) : filteredDrumPresets.map((preset, index) => (
                    <div
                      key={index}
                      className="browser-item"
                      onDoubleClick={() => handleAddInstrument(preset)}
                    >
                      <span className="item-icon">🥁</span>
                      <span className="item-name">{preset.name}</span>
                      <button
                        className="add-btn"
                        onClick={() => handleAddInstrument(preset)}
                        title="添加到工程"
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="section-divider">工程乐器</div>
            <div className="project-items">
              {project.instruments.length === 0 ? (
                <div className="empty-notice">暂无乐器</div>
              ) : (
                project.instruments.map((inst) => (
                  <div key={inst.id} className="browser-item project-item">
                    <span className="item-icon">{inst.type === 'drumkit' ? '🥁' : '🎹'}</span>
                    <span className="item-name">{inst.name}</span>
                    <div className="item-actions">
                      <button
                        className="action-btn"
                        onClick={() => handleCreatePattern(inst.id)}
                        title="创建 Pattern"
                      >
                        📋
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => removeInstrument(inst.id)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="browser-section">
            <div className="section-group">
              <div
                className="section-header"
                onClick={() => toggleSection('reverbs')}
              >
                <span className={`expand-icon ${expandedSections.has('reverbs') ? 'expanded' : ''}`}>▶</span>
                <span>混响 & 延迟</span>
              </div>
              {expandedSections.has('reverbs') && (
                <div className="section-items">
                  {(() => {
                    const items = filteredEffectPresets.filter((e) => e.type === 'reverb' || e.type === 'delay')
                    return items.length === 0 ? (
                      <div className="no-results">无匹配结果</div>
                    ) : items.map((preset, index) => (
                    <div
                      key={index}
                      className="browser-item"
                      onDoubleClick={() => handleAddEffect(preset)}
                    >
                      <span className="item-icon">🔊</span>
                      <span className="item-name">{preset.name}</span>
                      <button
                        className="add-btn"
                        onClick={() => handleAddEffect(preset)}
                        title="添加到工程"
                      >
                        +
                      </button>
                    </div>
                  ))})()}
                </div>
              )}
            </div>

            <div className="section-group">
              <div
                className="section-header"
                onClick={() => toggleSection('dynamics')}
              >
                <span className={`expand-icon ${expandedSections.has('dynamics') ? 'expanded' : ''}`}>▶</span>
                <span>动态处理</span>
              </div>
              {expandedSections.has('dynamics') && (
                <div className="section-items">
                  {(() => {
                    const items = filteredEffectPresets.filter((e) => ['compressor', 'limiter', 'eq3'].includes(e.type))
                    return items.length === 0 ? (
                      <div className="no-results">无匹配结果</div>
                    ) : items.map((preset, index) => (
                    <div
                      key={index}
                      className="browser-item"
                      onDoubleClick={() => handleAddEffect(preset)}
                    >
                      <span className="item-icon">📊</span>
                      <span className="item-name">{preset.name}</span>
                      <button
                        className="add-btn"
                        onClick={() => handleAddEffect(preset)}
                        title="添加到工程"
                      >
                        +
                      </button>
                    </div>
                  ))})()}
                </div>
              )}
            </div>

            <div className="section-group">
              <div
                className="section-header"
                onClick={() => toggleSection('modulation')}
              >
                <span className={`expand-icon ${expandedSections.has('modulation') ? 'expanded' : ''}`}>▶</span>
                <span>调制 & 失真</span>
              </div>
              {expandedSections.has('modulation') && (
                <div className="section-items">
                  {(() => {
                    const items = filteredEffectPresets.filter((e) => ['distortion', 'chorus', 'phaser', 'filter', 'bitcrusher'].includes(e.type))
                    return items.length === 0 ? (
                      <div className="no-results">无匹配结果</div>
                    ) : items.map((preset, index) => (
                    <div
                      key={index}
                      className="browser-item"
                      onDoubleClick={() => handleAddEffect(preset)}
                    >
                      <span className="item-icon">〰️</span>
                      <span className="item-name">{preset.name}</span>
                      <button
                        className="add-btn"
                        onClick={() => handleAddEffect(preset)}
                        title="添加到工程"
                      >
                        +
                      </button>
                    </div>
                  ))})()}
                </div>
              )}
            </div>

            <div className="section-divider">工程效果器</div>
            <div className="project-items">
              {project.effects.length === 0 ? (
                <div className="empty-notice">暂无效果器</div>
              ) : (
                project.effects.map((effect) => (
                  <div key={effect.id} className="browser-item project-item">
                    <span className="item-icon">🔊</span>
                    <span className="item-name">{effect.name}</span>
                    <button
                      className="action-btn danger"
                      onClick={() => removeEffect(effect.id)}
                      title="Remove"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'patterns' && (
          <div className="browser-section">
            <div className="section-divider">工程 Pattern</div>
            <div className="project-items">
              {project.patterns.length === 0 ? (
                <div className="empty-notice">
                  暂无 Pattern
                  <br />请先添加乐器，然后创建 Pattern
                </div>
              ) : (
                project.patterns.map((pattern) => {
                  const instrument = project.instruments.find((i) => i.id === pattern.instrumentId)
                  return (
                    <div
                      key={pattern.id}
                      className="browser-item project-item"
                      style={{ borderLeftColor: pattern.color }}
                      onDoubleClick={() => {
                        selectPattern(pattern.id)
                        setCurrentView('pianoroll')
                      }}
                    >
                      <span className="item-icon">📋</span>
                      <div className="item-info">
                        <span className="item-name">{pattern.name}</span>
                        <span className="item-detail">{instrument?.name || '无乐器'}</span>
                      </div>
                      <div className="item-actions">
                        <button
                          className="action-btn"
                          onClick={() => {
                            selectPattern(pattern.id)
                            setCurrentView('pianoroll')
                          }}
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={() => removePattern(pattern.id)}
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'samples' && (
          <div className="browser-section">
            <div
              className={`drop-zone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="drop-icon">📁</div>
              <p>拖放音频文件到此处</p>
              <p className="drop-hint">或点击选择文件</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                multiple
                className="file-input"
                onChange={(e) => handleFilesLoad(e.target.files)}
              />
            </div>
            <div className="section-divider">已加载采样</div>
            <div className="project-items">
              {samples.length === 0 ? (
                <div className="empty-notice">暂无采样</div>
              ) : (
                samples.map((sample) => (
                  <div
                    key={sample.id}
                    className="browser-item project-item"
                    onDoubleClick={() => addAudioClipFromSample(sample.id)}
                  >
                    <span className="item-icon">🎵</span>
                    <span className="item-name">{sample.name}</span>
                    <div className="item-actions">
                      <button
                        className="action-btn"
                        onClick={() => addAudioClipFromSample(sample.id)}
                        title="添加到编曲"
                      >
                        +
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => removeSample(sample.id)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
