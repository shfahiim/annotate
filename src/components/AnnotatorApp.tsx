'use client'

import { useState, useEffect, useCallback } from 'react'
import CropModal from './CropModal'

type Annotations = Record<string, string>
type ImageFile = { name: string; url: string; handle: FileSystemFileHandle | null }

const NUM_KEYS = ['1','2','3','4','5','6','7','8','9','0']

export default function AnnotatorApp() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [index, setIndex] = useState(0)
  const [annotations, setAnnotations] = useState<Annotations>({})
  const [labels, setLabels] = useState(['Positive', 'Negative'])
  const [started, setStarted] = useState(false)
  const [dark, setDark] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [cropOpen, setCropOpen] = useState(false)
  const [draftLabels, setDraftLabels] = useState(['Positive', 'Negative'])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  const pickFolder = async () => {
    try {
      // @ts-expect-error - File System Access API
      const dir = await window.showDirectoryPicker()
      const files: ImageFile[] = []
      for await (const entry of (dir as any).values()) {
        if (entry.kind === 'file' && /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(entry.name)) {
          const file = await entry.getFile()
          files.push({ name: entry.name, url: URL.createObjectURL(file), handle: entry })
        }
      }
      files.sort((a, b) => a.name.localeCompare(b.name))
      setImages(files)
      setIndex(0)
      setAnnotations({})
      setStarted(true)
    } catch { /* cancelled */ }
  }

  const applyLabel = useCallback((label: string) => {
    if (!images.length) return
    setAnnotations((prev) => ({ ...prev, [images[index].name]: label }))
    setIndex((i) => Math.min(i + 1, images.length - 1))
  }, [images, index])

  const navigate = useCallback((dir: 1 | -1) =>
    setIndex((i) => Math.max(0, Math.min(i + dir, images.length - 1))),
    [images.length]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || settingsOpen || cropOpen) return
      if (e.key === 'p' || e.key === 'P') applyLabel(labels[0])
      if (e.key === 'n' || e.key === 'N') applyLabel(labels[1])
      if (e.key === 'ArrowRight') navigate(1)
      if (e.key === 'ArrowLeft') navigate(-1)
      if (e.key === 'c' || e.key === 'C') setCropOpen(true)
      const numIdx = NUM_KEYS.indexOf(e.key)
      if (numIdx !== -1 && labels[numIdx]) applyLabel(labels[numIdx])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [applyLabel, navigate, labels, settingsOpen, cropOpen])

  const exportData = (format: 'json' | 'csv') => {
    const entries = Object.entries(annotations).map(([filename, label]) => ({ filename, label }))
    const content = format === 'json'
      ? JSON.stringify(entries, null, 2)
      : 'filename,label\n' + entries.map((e) => `${e.filename},${e.label}`).join('\n')
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `annotations.${format}`
    a.click()
  }

  const openSettings = () => {
    setDraftLabels([...labels])
    setSettingsOpen(true)
  }

  const saveSettings = () => {
    setLabels(draftLabels.filter(Boolean))
    setSettingsOpen(false)
  }

  const current = images[index]
  const annotated = Object.keys(annotations).length
  const progress = images.length ? (annotated / images.length) * 100 : 0
  const currentLabel = current ? annotations[current.name] : undefined
  const badgeClass = currentLabel === labels[0] ? 'badge-pos' : currentLabel === labels[1] ? 'badge-neg' : 'badge-extra'

  if (!started) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <div className="welcome-header">
            <p className="welcome-logo">ANNOTATE</p>
            <button className="btn btn-ghost btn-sm" onClick={() => setDark(!dark)}>
              {dark ? '☀ Light' : '☾ Dark'}
            </button>
          </div>
          <p className="welcome-sub">Keyboard-driven image classification</p>
          <button className="btn btn-accent welcome-btn" onClick={pickFolder}>Select Image Folder</button>
          <p className="welcome-hint">Pick a local folder — images load directly in your browser.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="app-shell">
        {/* Viewer */}
        <main className="viewer-panel">
          {images.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">No images in that folder</p>
              <button className="btn btn-ghost" onClick={() => setStarted(false)}>Pick another folder</button>
            </div>
          ) : (
            <>
              <div className="image-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={current.url} alt={current.name} className="image-content" />
                {currentLabel && <div className={`label-badge ${badgeClass}`}>{currentLabel}</div>}
                <button className="crop-trigger" onClick={() => setCropOpen(true)}>
                  ✂ Crop
                </button>
              </div>
              <p className="filename">{current.name}</p>
            </>
          )}
        </main>

        {/* Sidebar */}
        <aside className="controls-panel">
          <div className="panel-top">
            <span className="logo-small">ANNOTATE</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setDark(!dark)}>{dark ? '☀' : '☾'}</button>
              <button className="btn btn-ghost btn-sm" onClick={pickFolder}>Change Folder</button>
            </div>
          </div>

          <div className="panel-section">
            <p className="section-label">Progress</p>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
            <p className="progress-text">{annotated} / {images.length} annotated · {index + 1} of {images.length}</p>
          </div>

          <div className="panel-section">
            <p className="section-label">Annotate</p>
            <div className="action-buttons">
              <button className="btn btn-pos" onClick={() => applyLabel(labels[0])}>
                <span className="key-hint">P</span> {labels[0]}
              </button>
              <button className="btn btn-neg" onClick={() => applyLabel(labels[1])}>
                <span className="key-hint">N</span> {labels[1]}
              </button>
              {labels.slice(2).map((l, i) => (
                <button key={i} className="btn btn-extra" onClick={() => applyLabel(l)}>
                  <span className="key-hint">{NUM_KEYS[i + 2]}</span> {l}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <p className="section-label">Navigate</p>
            <div className="nav-buttons">
              <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Prev</button>
              <button className="btn btn-ghost" onClick={() => navigate(1)}>Next →</button>
            </div>
          </div>

          <div className="panel-section">
            <p className="section-label">Export</p>
            <div className="export-buttons">
              <button className="btn btn-export" onClick={() => exportData('csv')}>CSV</button>
              <button className="btn btn-export" onClick={() => exportData('json')}>JSON</button>
            </div>
          </div>

          {/* Quick reference */}
          <div className="panel-section quick-ref">
            <p className="section-label">Quick Reference</p>
            <div className="qr-rows">
              <div className="qr-row"><kbd>P</kbd><span>{labels[0]}</span></div>
              <div className="qr-row"><kbd>N</kbd><span>{labels[1]}</span></div>
              {labels.slice(2).map((l, i) => (
                <div key={i} className="qr-row"><kbd>{NUM_KEYS[i + 2]}</kbd><span>{l}</span></div>
              ))}
              <div className="qr-row"><kbd>←</kbd><kbd>→</kbd><span>Navigate</span></div>
              <div className="qr-row"><kbd>C</kbd><span>Crop image</span></div>
            </div>
            <p className="qr-hint">More labels? <button className="inline-link" onClick={openSettings}>Advanced Settings ↗</button></p>
          </div>

          <div className="panel-footer">
            <button className="btn btn-ghost settings-btn" onClick={openSettings}>⚙ Advanced Settings</button>
          </div>
        </aside>
      </div>

      {/* Settings drawer overlay */}
      {settingsOpen && (
        <div className="drawer-overlay" onClick={() => setSettingsOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <p className="drawer-title">Advanced Settings</p>
              <button className="btn btn-ghost btn-sm" onClick={() => setSettingsOpen(false)}>✕</button>
            </div>

            <div className="drawer-body">
              <p className="section-label">Labels (up to 10)</p>
              <p className="drawer-hint">Keys: P · N · 3 · 4 · 5 · 6 · 7 · 8 · 9 · 0</p>
              <div className="label-inputs">
                {draftLabels.map((l, i) => (
                  <div key={i} className="label-row">
                    <span className="key-hint">
                      {i === 0 ? 'P' : i === 1 ? 'N' : NUM_KEYS[i]}
                    </span>
                    <input
                      className="label-input"
                      value={l}
                      placeholder={`Label ${i + 1}`}
                      onChange={(e) => {
                        const next = [...draftLabels]
                        next[i] = e.target.value
                        setDraftLabels(next)
                      }}
                    />
                    {i >= 2 && (
                      <button className="btn-remove" onClick={() =>
                        setDraftLabels(draftLabels.filter((_, idx) => idx !== i))
                      }>✕</button>
                    )}
                  </div>
                ))}
                {draftLabels.length < 10 && (
                  <button className="btn btn-ghost" onClick={() => setDraftLabels([...draftLabels, ''])}>
                    + Add Label
                  </button>
                )}
              </div>
            </div>

            <div className="drawer-footer">
              <button className="btn btn-ghost" onClick={() => setSettingsOpen(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={saveSettings}>Save & Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Crop modal */}
      {cropOpen && current && (
        <CropModal
          src={current.url}
          filename={current.name}
          fileHandle={current.handle}
          onDone={(newUrl) => {
            setImages((prev) => prev.map((img, i) =>
              i === index ? { ...img, url: newUrl } : img
            ))
            setCropOpen(false)
          }}
          onCancel={() => setCropOpen(false)}
        />
      )}
    </>
  )
}
