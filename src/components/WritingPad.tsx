import { useCallback, useEffect, useRef, useState } from 'react'
import { recognize } from '../lib/recognizer.ts'
import type { Pt, Result, Stroke, Verdict } from '../lib/recognizer.ts'
import { candidatesFor, fullSize, isSmallKana, strokes as strokeData } from '../data/strokes.ts'

const UNITS = 109 // strokes are stored in the same 109-unit box as the reference data

const STYLE: Record<Verdict, { box: string; label: string }> = {
  correct: { box: 'border-green-700 bg-green-50 text-green-900', label: 'Correct' },
  improve: { box: 'border-amber-600 bg-amber-50 text-amber-900', label: 'Needs improvement' },
  incorrect: { box: 'border-red bg-red-soft text-red-dark', label: 'Incorrect' },
  uncertain: { box: 'border-line bg-paper text-ink', label: 'Not sure' },
}

interface Props {
  /** The character to write. */
  char: string
  /** Whether the faint reference starts visible. */
  guide?: boolean
  /** Hide the "show reference" control (used in quizzes). */
  lockGuide?: boolean
  onResult?: (result: Result) => void
}

/** A drawing surface for one character, with handwriting checking. */
export function WritingPad({ char, guide = true, lockGuide = false, onResult }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const current = useRef<Pt[] | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [erasing, setErasing] = useState(false)
  const [showGuide, setShowGuide] = useState(guide)
  const [result, setResult] = useState<Result | null>(null)
  const [attempts, setAttempts] = useState(0)

  const target = fullSize(char)
  const reference = strokeData[target]

  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const scale = canvas.width / UNITS
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 3.6 * scale
    ctx.strokeStyle = '#211d18'
    const all = current.current ? [...strokes, current.current] : strokes
    for (const s of all) {
      if (!s.length) continue
      ctx.beginPath()
      ctx.moveTo(s[0][0] * scale, s[0][1] * scale)
      for (const [x, y] of s) ctx.lineTo(x * scale, y * scale)
      ctx.stroke()
    }
  }, [strokes])

  // Keep the canvas resolution in step with its displayed size.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const fit = () => {
      const size = Math.round(canvas.clientWidth * (window.devicePixelRatio || 1))
      if (size && canvas.width !== size) {
        canvas.width = size
        canvas.height = size
      }
      redraw()
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [redraw])

  const point = (e: React.PointerEvent<HTMLCanvasElement>): Pt => {
    const r = e.currentTarget.getBoundingClientRect()
    return [((e.clientX - r.left) / r.width) * UNITS, ((e.clientY - r.top) / r.height) * UNITS]
  }

  const eraseAt = (p: Pt) => {
    setStrokes((prev) => {
      const next = prev.filter((s) => !s.some(([x, y]) => Math.hypot(x - p[0], y - p[1]) < 6))
      return next.length === prev.length ? prev : next
    })
    setResult(null)
  }

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button > 0) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* capture is a nicety; drawing works without it */
    }
    if (erasing) {
      current.current = []
      eraseAt(point(e))
      return
    }
    current.current = [point(e)]
    setResult(null)
    redraw()
  }

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!current.current) return
    if (erasing) {
      eraseAt(point(e))
      return
    }
    const p = point(e)
    const last = current.current[current.current.length - 1]
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.4) return
    current.current.push(p)
    redraw()
  }

  const onUp = () => {
    const s = current.current
    current.current = null
    if (erasing || !s || !s.length) return
    if (s.length === 1) s.push([s[0][0] + 0.5, s[0][1] + 0.5])
    setStrokes((prev) => [...prev, s])
  }

  const clear = () => {
    setStrokes([])
    setResult(null)
  }

  const check = () => {
    const r = recognize(strokes, target, candidatesFor(char))
    setResult(r)
    setAttempts((a) => a + 1)
    onResult?.(r)
  }

  const empty = strokes.length === 0

  return (
    <div className="w-full max-w-[22rem]">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border-2 border-ink/70 bg-white">
        <svg viewBox="0 0 109 109" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <path d="M54.5 0v109M0 54.5h109" stroke="var(--color-line)" strokeWidth="0.6" strokeDasharray="3 3" fill="none" />
          {showGuide &&
            reference?.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="#e3d9c9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            ))}
        </svg>
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 h-full w-full touch-none ${erasing ? 'cursor-cell' : 'cursor-crosshair'}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          aria-label={`Drawing area. Write ${char} here with your mouse, finger or pen.`}
          role="img"
        />
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        <button type="button" className="btn !px-2" onClick={() => { setStrokes((s) => s.slice(0, -1)); setResult(null) }} disabled={empty} title="Remove the last stroke">
          Undo
        </button>
        <button type="button" className={`btn !px-2 ${erasing ? 'btn-on' : ''}`} onClick={() => setErasing((v) => !v)} aria-pressed={erasing} title="Tap a stroke to remove it">
          Erase
        </button>
        <button type="button" className="btn !px-2" onClick={clear} disabled={empty} title="Remove all strokes">
          Clear
        </button>
        <button type="button" className="btn !px-2" onClick={() => { clear(); setErasing(false) }} disabled={!result} title="Start this character again">
          Retry
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn btn-primary flex-1" onClick={check} disabled={empty}>
          Check my writing
        </button>
        {!lockGuide && (
          <button type="button" className="btn" onClick={() => setShowGuide((v) => !v)} aria-pressed={showGuide}>
            {showGuide ? 'Hide reference' : 'Show reference'}
          </button>
        )}
      </div>
      {erasing && <p className="mt-2 text-sm text-muted">Eraser on: tap or drag across a stroke to remove it.</p>}
      {isSmallKana(char) && (
        <p className="mt-2 text-sm text-muted">
          {char} is a small character. In real writing make it about half size; here, draw it large so it can be checked.
        </p>
      )}

      <div className="mt-3 min-h-24" role="status" aria-live="polite">
        {result ? (
          <div className={`rounded-lg border px-4 py-3 text-sm ${STYLE[result.verdict].box}`}>
            <p className="font-bold">{STYLE[result.verdict].label}</p>
            <p>{result.message}</p>
            {result.tips.length > 0 && (
              <ul className="mt-1 list-disc pl-5">
                {result.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}
            {result.verdict === 'correct' && showGuide && !lockGuide && (
              <p className="mt-1">Now hide the reference and write it from memory.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">
            {attempts === 0
              ? 'Write the character in the box, one stroke at a time, then press Check.'
              : 'Keep going, then press Check again.'}
          </p>
        )}
      </div>
    </div>
  )
}
