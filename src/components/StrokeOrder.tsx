import { useEffect, useState } from 'react'
import { strokes } from '../data/strokes.ts'

interface Props {
  char: string
  /** Show the Play / Step controls. */
  controls?: boolean
  className?: string
}

const startOf = (d: string): [number, number] => {
  const m = d.match(/^\s*[Mm]\s*(-?[\d.]+)[\s,]*(-?[\d.]+)/)
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : [0, 0]
}

/** Shows a character stroke by stroke, in the correct order and direction. */
export function StrokeOrder({ char, controls = true, className = '' }: Props) {
  const paths = strokes[char]
  const total = paths?.length ?? 0
  const [shown, setShown] = useState(total)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    setShown(total)
    setPlaying(false)
  }, [char, total])

  useEffect(() => {
    if (!playing) return
    if (shown >= total) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 200 : 700)
    return () => clearTimeout(id)
  }, [playing, shown, total])

  if (!paths) {
    return (
      <div className={`flex aspect-square items-center justify-center rounded-lg border border-line bg-card text-6xl ${className}`} lang="ja">
        {char}
      </div>
    )
  }

  return (
    <div className={className}>
      <svg viewBox="0 0 109 109" className="aspect-square w-full rounded-lg border border-line bg-card" role="img" aria-label={`Stroke order for ${char}: ${total} stroke${total === 1 ? '' : 's'}`}>
        <path d="M54.5 4v101M4 54.5h101" stroke="var(--color-line)" strokeWidth="0.6" strokeDasharray="3 3" fill="none" />
        {paths.map((d, i) => (
          <path key={`g${i}`} d={d} fill="none" stroke="var(--color-line)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {paths.slice(0, shown).map((d, i) => (
          <path
            key={`${i}-${playing && i === shown - 1 ? 'a' : 's'}`}
            d={d}
            pathLength={1}
            className={playing && i === shown - 1 ? 'stroke-anim' : undefined}
            fill="none"
            stroke={playing && i === shown - 1 ? 'var(--color-red)' : 'var(--color-ink)'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {paths.slice(0, shown).map((d, i) => {
          const [x, y] = startOf(d)
          return (
            <text key={`n${i}`} x={Math.max(4, x - 6)} y={Math.max(8, y - 2)} fontSize="7" fontWeight="700" fill="var(--color-red)" stroke="#fff" strokeWidth="2" paintOrder="stroke">
              {i + 1}
            </text>
          )
        })}
      </svg>
      {controls && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setShown(0)
              setPlaying(true)
            }}
          >
            ▶ Play stroke order
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setPlaying(false)
              setShown((s) => (s >= total ? 1 : s + 1))
            }}
          >
            Step
          </button>
          <span className="text-sm text-muted">
            {Math.min(shown, total)} / {total}
          </span>
        </div>
      )}
    </div>
  )
}
