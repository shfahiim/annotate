'use client'

import { useState, useEffect, useCallback } from 'react'

type Label = string
type Annotations = Record<string, Label>
type ImageFile = { name: string; url: string }

export default function AnnotatorApp() {
  const [images, setImages] = useState<ImageFile[]>([])
  const [index, setIndex] = useState(0)
  const [annotations, setAnnotations] = useState<Annotations>({})
  const [labels, setLabels] = useState(['Positive', 'Negative'])
  const [labelInputs, setLabelInputs] = useState(['Positive', 'Negative'])
  const [started, setStarted] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  const pickFolder = async () => {
    try {
      // @ts-expect-error - File System Access API
      const dir: FileSystemDirectoryHandle = await window.showDirectoryPicker()
      const files: ImageFile[] = []
      for await (const entry of (dir as any).values()) {
        if (entry.kind === 'file' && /\.(jpg|jpeg|png|gif|webp|avif|bmp)$/i.test(entry.name)) {
          const file = await entry.getFile()
          files.push({ name: entry.name, url: URL.createObjectURL(file) })
        }
      }
      files.sort((a, b) => a.name.localeCompare(b.name))
      setImages(files)
      setIndex(0)
      setAnnotations({})
      setStarted(true)
    } catch {
      // user cancelled
    }
  }

  const applyLabel = useCallback(
    (label: Label) => {
      if (!images.length) return
      setAnnotations((prev) => ({ ...prev, [images[index].name]: label }))
      setIndex((i) => Math.min(i + 1, images.length - 1))
    },
    [images, index]
  )

  const navigate = useCallback(
    (dir: 1 | -1) => setIndex((i) => Math.max(0, Math.min(i + dir, images.length - 1))),
    [images.length]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'p' || e.key === 'P') applyLabel(labels[0])
      if (e.key === 'n' || e.key === 'N') applyLabel(labels[1])
      if (e.key === 'ArrowRight') navigate(1)
      if (e.key === 'ArrowLeft') navigate(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [applyLabel, navigate, labels])

  const exportData = (format: 'json' | 'csv') => {
    const entries = Object.entries(annotations).map(([filename, label]) => ({ filename, label }))
    const content =
      format === 'json'
        ? JSON.stringify(entries, null, 2)
        : 'filename,label\n' + entries.map((e) => `${e.filename},${e.label}`).join('\n')
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `annotations.${format}`
    a.click()
  }

  const current = images[index]
  const annotated = Object.keys(annotations).length
  const progress = images.length ? (annotated / images.length) * 100 : 0

  // ── Welcome screen ──────────────────────────────────────────────
  if (!started) {
    return (
      <div className="welcome-screen">
        <div className="welcome-card">
          <div className="welcome-header">
            <p className="welcome-logo">ANNOTATE</p>
            <button className="btn btn-ghost btn-sm theme-toggle" onClick={() => setDark(!dark)}>
              {dark ? '☀ Light' : '☾ Dark'}
            </button>
          </div>
          <p className="welcome-sub">Keyboard-driven image classification</p>
          <button className="btn btn-accent welcome-btn" onClick={pickFolder}>
            Select Image Folder
          </button>
          <p className="welcome-hint">
            Pick a local folder — images load directly in your browser.
          </p>
        </div>
      </div>
    )
  }

  // ── Main app ─────────────────────────────────────────────────────
  return (
    <div className="app-shell">
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
              {annotations[current.name] && (
                <div className={`label-badge ${annotations[current.name] === labels[0] ? 'badge-pos' : 'badge-neg'}`}>
                  {annotations[current.name]}
                </div>
              )}
            </div>
            <p className="filename">{current.name}</p>
          </>
        )}
      </main>

      <aside className="controls-panel">
        <div className="panel-top">
          <span className="logo-small">ANNOTATE</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setDark(!dark)}>
              {dark ? '☀' : '☾'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={pickFolder}>Change Folder</button>
          </div>
        </div>

        <div className="panel-section">
          <p className="section-label">Progress</p>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="progress-text">
            {annotated} / {images.length} annotated · {index + 1} of {images.length}
          </p>
        </div>

        <div className="panel-section">
          <p className="section-label">Labels</p>
          <div className="label-inputs">
            {labelInputs.map((l, i) => (
              <div key={i} className="label-row">
                <span className="key-hint">{i === 0 ? 'P' : 'N'}</span>
                <input
                  className="label-input"
                  value={l}
                  onChange={(e) => {
                    const next = [...labelInputs]
                    next[i] = e.target.value
                    setLabelInputs(next)
                  }}
                />
              </div>
            ))}
            <button className="btn btn-ghost" onClick={() => setLabels([...labelInputs])}>Save Labels</button>
          </div>
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

        <div className="shortcuts-hint">
          <p><kbd>P</kbd> positive &nbsp;<kbd>N</kbd> negative &nbsp;<kbd>←</kbd><kbd>→</kbd> navigate</p>
        </div>
      </aside>
    </div>
  )
}
