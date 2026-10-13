const C = 110 // centre of the 220-unit drawing
const R = 100

// Neighbouring segments always differ, and each fill has a text colour that reads clearly on it.
const COLORS = [
  { fill: '#bc002d', text: '#ffffff' },
  { fill: '#f6c453', text: '#211d18' },
  { fill: '#1f6f78', text: '#ffffff' },
  { fill: '#fff3dc', text: '#211d18' },
  { fill: '#2f4b7c', text: '#ffffff' },
  { fill: '#f29e7a', text: '#211d18' },
]

const colorOf = (i: number, count: number) => {
  // Where the last segment would meet the first in the same colour, give it another.
  const wraps = count > 1 && i === count - 1 && i % COLORS.length === 0
  return COLORS[wraps ? 3 : i % COLORS.length]
}

/** A point `r` from the centre, `deg` clockwise from the top. */
const at = (deg: number, r: number) => {
  const t = (deg * Math.PI) / 180
  return `${(C + r * Math.sin(t)).toFixed(2)} ${(C - r * Math.cos(t)).toFixed(2)}`
}

const slice = (from: number, to: number) => `M${C} ${C}L${at(from, R)}A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${at(to, R)}Z`

function Label({ text, mid, count, color }: { text: string; mid: number; count: number; color: string }) {
  const chars = [...text]
  if (chars.length === 1) {
    // One character sits upright near the rim, where the segment is widest.
    const r = count === 1 ? 52 : count > 20 ? 86 : count > 8 ? 78 : 66
    const size = Math.min(30, ((2 * Math.PI * r) / count) * 0.72)
    return (
      <text x={C} y={C - r} transform={`rotate(${mid} ${C} ${C})`} fontSize={size.toFixed(2)} fontWeight="700" fill={color} textAnchor="middle" dominantBaseline="central">
        {text}
      </text>
    )
  }
  // Words run along the segment from the centre out to the rim.
  const shown = chars.length > 9 ? [...chars.slice(0, 8), '…'] : chars
  const size = Math.min(14, 64 / shown.length, ((2 * Math.PI * 60) / count) * 0.8)
  return (
    <text x={C + 93} y={C} transform={`rotate(${mid - 90} ${C} ${C})`} fontSize={size.toFixed(2)} fontWeight="700" fill={color} textAnchor="end" dominantBaseline="central">
      {shown.join('')}
    </text>
  )
}

interface Props {
  entries: string[]
  /** How far the wheel has turned clockwise, in degrees. */
  rotation: number
  spinning: boolean
  /** Length of the spin animation in milliseconds. */
  duration: number
  /** Index of the segment to highlight once the wheel has stopped. */
  winner: number | null
}

/** The wheel and its pointer. Segment 0 starts at the top and the segments run clockwise. */
export function Wheel({ entries, rotation, spinning, duration, winner }: Props) {
  const count = entries.length
  const seg = 360 / Math.max(count, 1)

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[26rem]">
      {/* Clipped to the circle so the corners of the turning square never widen the page. */}
      <div className="absolute inset-0 overflow-hidden rounded-full">
        <svg
          viewBox="0 0 220 220"
          className="h-full w-full"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${duration}ms cubic-bezier(0.16, 0.7, 0.12, 1)` : 'none',
            willChange: spinning ? 'transform' : undefined,
          }}
          role="img"
          aria-label={count ? `Spinning wheel with ${count} ${count === 1 ? 'entry' : 'entries'}: ${entries.join(', ')}` : 'Empty spinning wheel'}
          lang="ja"
        >
          {count === 0 && <circle cx={C} cy={C} r={R} fill="var(--color-paper)" stroke="var(--color-line)" strokeWidth="2" strokeDasharray="6 5" />}
          {count === 1 && <circle cx={C} cy={C} r={R} fill={COLORS[0].fill} />}
          {count > 1 &&
            entries.map((_, i) => <path key={i} d={slice(i * seg, (i + 1) * seg)} fill={colorOf(i, count).fill} stroke="#fff" strokeWidth={count > 40 ? 0.4 : 0.8} />)}
          {entries.map((text, i) => (
            <Label key={`${i}-${text}`} text={text} mid={(i + 0.5) * seg} count={count} color={colorOf(i, count).text} />
          ))}
          {winner !== null && !spinning && winner < count && (
            <path
              className="wheel-win"
              d={count === 1 ? `M${C} ${C - R}A${R} ${R} 0 1 1 ${C - 0.01} ${C - R}Z` : slice(winner * seg, (winner + 1) * seg)}
              fill="#fff"
              stroke="var(--color-ink)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          )}
          {count > 0 && <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-ink)" strokeWidth="3" />}
        </svg>
      </div>

      <div className="pointer-events-none absolute top-1/2 left-1/2 flex h-[15%] w-[15%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-ink bg-card" aria-hidden="true">
        <span className="h-1/2 w-1/2 rounded-full bg-red" />
      </div>
      <svg viewBox="0 0 30 34" className="pointer-events-none absolute top-0 left-1/2 w-[7.5%] -translate-x-1/2 drop-shadow-sm" aria-hidden="true">
        <path d="M15 32 3 6.5A3.5 3.5 0 0 1 6.2 1.5h17.6A3.5 3.5 0 0 1 27 6.5z" fill="var(--color-ink)" stroke="#fff" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}
