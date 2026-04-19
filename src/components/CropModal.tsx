'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export type CropRect = { x: number; y: number; w: number; h: number }

const RATIOS: { label: string; value: number | null }[] = [
  { label: 'Free', value: null },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '2:3', value: 2 / 3 },
]

interface Props {
  src: string
  filename: string
  fileHandle: FileSystemFileHandle | null
  onDone: (newUrl: string) => void
  onCancel: () => void
}

export default function CropModal({ src, filename, fileHandle, onDone, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [ratio, setRatio] = useState<number | null>(1)
  const [crop, setCrop] = useState<CropRect>({ x: 0.1, y: 0.1, w: 0.8, h: 0.8 })
  const [dragging, setDragging] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null)
  const dragStart = useRef<{ mx: number; my: number; crop: CropRect } | null>(null)
  const [saving, setSaving] = useState(false)
  const [naturalSize, setNaturalSize] = useState({ w: 1, h: 1 })

  // Initialise crop box centered with chosen ratio
  const initCrop = useCallback((r: number | null) => {
    const pad = 0.1
    if (r === null) {
      setCrop({ x: pad, y: pad, w: 1 - pad * 2, h: 1 - pad * 2 })
      return
    }
    const imgR = naturalSize.w / naturalSize.h
    let w: number, h: number
    if (r >= imgR) { w = 1 - pad * 2; h = w / r * imgR }
    else { h = 1 - pad * 2; w = h * r / imgR }
    setCrop({ x: (1 - w) / 2, y: (1 - h) / 2, w, h })
  }, [naturalSize])

  useEffect(() => { initCrop(ratio) }, [ratio, initCrop])

  const onImgLoad = () => {
    const img = imgRef.current!
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
  }

  // Convert pointer position to normalised [0,1] coords relative to rendered image
  const toNorm = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    }
  }

  const clampCrop = (c: CropRect): CropRect => {
    const minSize = 0.05
    let { x, y, w, h } = c
    w = Math.max(minSize, w)
    h = Math.max(minSize, h)
    x = Math.max(0, Math.min(1 - w, x))
    y = Math.max(0, Math.min(1 - h, y))
    return { x, y, w, h }
  }

  const onPointerDown = (e: React.PointerEvent, handle: typeof dragging) => {
    e.stopPropagation()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDragging(handle)
    dragStart.current = { mx: toNorm(e).x, my: toNorm(e).y, crop: { ...crop } }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return
    const { x: mx, y: my } = toNorm(e)
    const dx = mx - dragStart.current.mx
    const dy = my - dragStart.current.my
    const c = { ...dragStart.current.crop }
    const imgAspect = naturalSize.w / naturalSize.h

    if (dragging === 'move') {
      setCrop(clampCrop({ ...c, x: c.x + dx, y: c.y + dy }))
      return
    }

    let { x, y, w, h } = c
    if (dragging === 'se') { w += dx; h += dy }
    else if (dragging === 'sw') { x += dx; w -= dx; h += dy }
    else if (dragging === 'ne') { y += dy; w += dx; h -= dy }
    else if (dragging === 'nw') { x += dx; y += dy; w -= dx; h -= dy }

    // enforce aspect ratio
    if (ratio !== null) {
      const normRatio = ratio / imgAspect
      if (dragging === 'se' || dragging === 'ne') h = w / normRatio
      else w = h * normRatio
      if (dragging === 'ne') y = c.y + c.h - h
      if (dragging === 'nw') { y = c.y + c.h - h; x = c.x + c.w - w }
      if (dragging === 'sw') x = c.x + c.w - w
    }

    setCrop(clampCrop({ x, y, w, h }))
  }

  const onPointerUp = () => { setDragging(null); dragStart.current = null }

  const applyCrop = async () => {
    setSaving(true)
    const img = imgRef.current!
    const nw = img.naturalWidth, nh = img.naturalHeight
    const sx = Math.round(crop.x * nw)
    const sy = Math.round(crop.y * nh)
    const sw = Math.round(crop.w * nw)
    const sh = Math.round(crop.h * nh)

    const canvas = document.createElement('canvas')
    canvas.width = sw; canvas.height = sh
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.92))

    // Write back to disk if we have a file handle
    if (fileHandle) {
      try {
        const writable = await (fileHandle as any).createWritable()
        await writable.write(blob)
        await writable.close()
      } catch { /* permission denied — fall through to in-memory */ }
    }

    const newUrl = URL.createObjectURL(blob)
    setSaving(false)
    onDone(newUrl)
  }

  const { x, y, w, h } = crop
  const handleSize = 10

  return (
    <div className="crop-overlay" onClick={onCancel}>
      <div className="crop-modal" onClick={(e) => e.stopPropagation()}>
        <div className="crop-modal-header">
          <p className="drawer-title">Crop Image</p>
          <div className="ratio-group">
            {RATIOS.map((r) => (
              <button
                key={r.label}
                className={`ratio-btn${ratio === r.value ? ' active' : ''}`}
                onClick={() => setRatio(r.value)}
              >{r.label}</button>
            ))}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onCancel}>✕</button>
        </div>

        <div className="crop-stage">
          <div
            ref={containerRef}
            className="crop-container"
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt={filename} className="crop-img" onLoad={onImgLoad} draggable={false} />

            {/* Dark overlay outside crop */}
            <svg className="crop-overlay-svg" viewBox="0 0 1 1" preserveAspectRatio="none">
              <defs>
                <mask id="crop-mask">
                  <rect width="1" height="1" fill="white" />
                  <rect x={x} y={y} width={w} height={h} fill="black" />
                </mask>
              </defs>
              <rect width="1" height="1" fill="rgba(0,0,0,0.55)" mask="url(#crop-mask)" />
            </svg>

            {/* Crop box */}
            <div
              className="crop-box"
              style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}
              onPointerDown={(e) => onPointerDown(e, 'move')}
            >
              {/* Rule-of-thirds grid */}
              <div className="crop-grid" />

              {/* Handles */}
              {(['nw','ne','sw','se'] as const).map((pos) => (
                <div
                  key={pos}
                  className={`crop-handle crop-handle-${pos}`}
                  style={{ width: handleSize, height: handleSize }}
                  onPointerDown={(e) => onPointerDown(e, pos)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="crop-modal-footer">
          <p className="crop-info">
            {Math.round(crop.w * naturalSize.w)} × {Math.round(crop.h * naturalSize.h)}px
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
            <button className="btn btn-accent" onClick={applyCrop} disabled={saving}>
              {saving ? 'Saving…' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
