// Stroke-based handwriting recognition.
//
// The student's strokes are compared with KanjiVG reference strokes for every
// candidate character (all characters of the script being practised). Two
// measures are combined:
//   - shape:  how well the ink overlaps the reference, ignoring stroke order
//   - stroke: how well each stroke, in order and direction, follows the reference
// The drawing is accepted only when the target is the best match among all
// candidates and both measures are good. Anything ambiguous is reported as
// uncertain rather than guessed.

export type Pt = [number, number]
export type Stroke = Pt[]

const N = 16 // points per stroke
const CLOUD = 64 // points per character for the order-free comparison

/** Thresholds, in units where the character is 1 wide. Tuned with scripts/test-recognizer.ts. */
export const T = {
  /** Accept when the overlap and the per-stroke fit are both within these. */
  shapeGood: 0.09,
  strokeGood: 0.18,
  /** Beyond these the drawing is too far from the target to comment on. */
  shapeClose: 0.12,
  strokeBad: 0.26,
  /** Score difference needed to say another character fits better. */
  margin: 0.012,
}

// ---------- geometry ----------

const dist = (a: Pt, b: Pt) => Math.hypot(a[0] - b[0], a[1] - b[1])

function pathLength(p: Pt[]): number {
  let len = 0
  for (let i = 1; i < p.length; i++) len += dist(p[i - 1], p[i])
  return len
}

/** n points evenly spaced along the polyline. */
export function resample(p: Pt[], n: number): Pt[] {
  if (p.length === 0) return []
  const total = pathLength(p)
  if (total === 0 || n === 1) return Array.from({ length: n }, () => [p[0][0], p[0][1]] as Pt)
  const step = total / (n - 1)
  const out: Pt[] = [[p[0][0], p[0][1]]]
  let acc = 0
  let target = step
  for (let i = 1; i < p.length && out.length < n; i++) {
    const seg = dist(p[i - 1], p[i])
    while (seg > 0 && acc + seg >= target - 1e-9 && out.length < n) {
      const t = (target - acc) / seg
      out.push([p[i - 1][0] + (p[i][0] - p[i - 1][0]) * t, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t])
      target += step
    }
    acc += seg
  }
  while (out.length < n) out.push([p[p.length - 1][0], p[p.length - 1][1]])
  return out
}

/** Flatten an SVG path (the subset used by KanjiVG) into a polyline. */
export function pathToPoints(d: string): Pt[] {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? []
  const pts: Pt[] = []
  let i = 0
  let cmd = ''
  let x = 0
  let y = 0
  let cx = 0 // last control point, for S/s
  let cy = 0
  const num = () => parseFloat(tokens[i++])
  const cubic = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
    const x0 = x
    const y0 = y
    for (let s = 1; s <= 10; s++) {
      const t = s / 10
      const u = 1 - t
      pts.push([
        u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
        u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
      ])
    }
    cx = x2
    cy = y2
    x = x3
    y = y3
  }
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++]
    const rel = cmd === cmd.toLowerCase()
    const ox = rel ? x : 0
    const oy = rel ? y : 0
    switch (cmd.toUpperCase()) {
      case 'M':
        x = ox + num()
        y = oy + num()
        cx = x
        cy = y
        pts.push([x, y])
        cmd = rel ? 'l' : 'L'
        break
      case 'L':
        x = ox + num()
        y = oy + num()
        cx = x
        cy = y
        pts.push([x, y])
        break
      case 'H':
        x = ox + num()
        cx = x
        cy = y
        pts.push([x, y])
        break
      case 'V':
        y = oy + num()
        cx = x
        cy = y
        pts.push([x, y])
        break
      case 'C':
        cubic(ox + num(), oy + num(), ox + num(), oy + num(), ox + num(), oy + num())
        break
      case 'S': {
        const rx = 2 * x - cx
        const ry = 2 * y - cy
        cubic(rx, ry, ox + num(), oy + num(), ox + num(), oy + num())
        break
      }
      case 'Q': {
        const qx = ox + num()
        const qy = oy + num()
        const ex = ox + num()
        const ey = oy + num()
        cubic(x + (2 / 3) * (qx - x), y + (2 / 3) * (qy - y), ex + (2 / 3) * (qx - ex), ey + (2 / 3) * (qy - ey), ex, ey)
        break
      }
      case 'Z':
        break
      default:
        i++ // unknown command: skip a token so we always make progress
    }
  }
  return pts
}

/** Scale and centre so the whole character fits a unit box, keeping its proportions. */
function normalize(strokes: Stroke[]): Stroke[] {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const s of strokes)
    for (const [px, py] of s) {
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
    }
  const size = Math.max(maxX - minX, maxY - minY) || 1
  const mx = (minX + maxX) / 2
  const my = (minY + maxY) / 2
  return strokes.map((s) => s.map(([px, py]) => [(px - mx) / size, (py - my) / size] as Pt))
}

interface Shape {
  strokes: Stroke[] // normalised, N points each
  cloud: Pt[]
}

function toShape(raw: Stroke[]): Shape {
  const norm = normalize(raw)
  const lengths = norm.map(pathLength)
  const total = lengths.reduce((a, b) => a + b, 0) || 1
  const cloud: Pt[] = []
  norm.forEach((s, i) => {
    const n = Math.max(3, Math.round((CLOUD * lengths[i]) / total))
    cloud.push(...resample(s, n))
  })
  return { strokes: norm.map((s) => resample(s, N)), cloud }
}

function chamfer(a: Pt[], b: Pt[]): number {
  const oneWay = (p: Pt[], q: Pt[]) => {
    let sum = 0
    for (const pt of p) {
      let best = Infinity
      for (const qt of q) {
        const d = dist(pt, qt)
        if (d < best) best = d
      }
      sum += best
    }
    return sum / p.length
  }
  return (oneWay(a, b) + oneWay(b, a)) / 2
}

function strokeDist(a: Stroke, b: Stroke, reversed = false): number {
  let sum = 0
  for (let i = 0; i < N; i++) sum += dist(a[i], b[reversed ? N - 1 - i : i])
  return sum / N
}

// ---------- templates ----------

const templateCache = new Map<string, Shape | null>()
let strokeSource: Record<string, string[]> = {}

/** Provide the reference stroke paths (KanjiVG `d` strings, viewBox 109). */
export function setStrokeData(data: Record<string, string[]>) {
  strokeSource = data
  templateCache.clear()
}

function template(ch: string): Shape | null {
  if (!templateCache.has(ch)) {
    const paths = strokeSource[ch]
    templateCache.set(ch, paths ? toShape(paths.map(pathToPoints)) : null)
  }
  return templateCache.get(ch)!
}

// ---------- recognition ----------

export type Verdict = 'correct' | 'improve' | 'incorrect' | 'uncertain'

export interface Result {
  verdict: Verdict
  /** One-line summary for the student. */
  message: string
  /** Specific, actionable hints. */
  tips: string[]
  /** The character the drawing most resembles, when that is not the target. */
  looksLike?: string
  /** Debug information. */
  debug?: { shape: number; stroke: number | null; rank: number; best: string }
}

interface Score {
  ch: string
  shape: number
  stroke: number | null
  score: number
}

function scoreAgainst(user: Shape, ch: string): Score | null {
  const t = template(ch)
  if (!t) return null
  const shape = chamfer(user.cloud, t.cloud)
  const diff = Math.abs(t.strokes.length - user.strokes.length)
  if (diff === 0) {
    let sum = 0
    for (let i = 0; i < t.strokes.length; i++) sum += strokeDist(user.strokes[i], t.strokes[i])
    const stroke = sum / t.strokes.length
    return { ch, shape, stroke, score: shape + 0.4 * Math.min(stroke, 0.35) }
  }
  return { ch, shape, stroke: null, score: shape + 0.4 * 0.2 + 0.03 * diff }
}

const ordinal = (n: number) => ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'][n] ?? `${n + 1}th`

/** Per-stroke comparison with a same-stroke-count reference. */
function analyseStrokes(user: Shape, ref: Shape) {
  const n = ref.strokes.length
  const fwd = ref.strokes.map((t, i) => strokeDist(user.strokes[i], t))
  const rev = ref.strokes.map((t, i) => strokeDist(user.strokes[i], t, true))
  const reversed = fwd.map((f, i) => f > 0.12 && rev[i] < f * 0.55)
  const anyDirection = fwd.reduce((a, f, i) => a + Math.min(f, rev[i]), 0) / n
  // Best fit when strokes may be in any order and direction (greedy assignment).
  const used = new Set<number>()
  let sum = 0
  let moved = 0
  for (let i = 0; i < n; i++) {
    let bj = -1
    let bd = Infinity
    for (let j = 0; j < n; j++) {
      if (used.has(j)) continue
      const d = Math.min(strokeDist(user.strokes[i], ref.strokes[j]), strokeDist(user.strokes[i], ref.strokes[j], true))
      if (d < bd) {
        bd = d
        bj = j
      }
    }
    used.add(bj)
    if (bj !== i) moved++
    sum += bd
  }
  const anyOrder = Math.min(sum / n, anyDirection)
  const reordered = moved > 0 && anyOrder < anyDirection * 0.6 && anyDirection > 0.12
  return { fwd, reversed, reordered, anyOrder }
}

/**
 * Check a drawing of `target`.
 * `strokes` are the student's strokes in any coordinate system (y down).
 * `candidates` are all characters the drawing is compared against.
 */
export function recognize(strokes: Stroke[], target: string, candidates: string[]): Result {
  const drawn = strokes.filter((s) => s.length > 0)
  const ref = template(target)
  if (!ref) {
    return { verdict: 'uncertain', message: 'No stroke data is available for this character, so it cannot be checked.', tips: [] }
  }
  if (drawn.length === 0) {
    return { verdict: 'uncertain', message: 'Nothing to check yet. Draw the character first.', tips: [] }
  }
  const user = toShape(drawn)
  const set = candidates.includes(target) ? candidates : [...candidates, target]
  const scores = set.map((c) => scoreAgainst(user, c)).filter((s): s is Score => s !== null)
  scores.sort((a, b) => a.score - b.score)
  const mine = scores.find((s) => s.ch === target)!
  const best = scores[0]
  const debug = { shape: mine.shape, stroke: mine.stroke, rank: scores.indexOf(mine), best: best.ch }
  const n = ref.strokes.length
  const strokeWord = (k: number) => `${k} stroke${k === 1 ? '' : 's'}`
  const other = best.ch !== target && mine.score - best.score > T.margin ? best : null
  const otherIsClear = other !== null && other.stroke !== null && other.shape <= T.shapeGood && other.stroke <= T.strokeGood

  const uncertain = (): Result => ({
    verdict: 'uncertain',
    message: "I couldn't recognise this clearly. Please try again.",
    tips: ['Write the whole character large, in the middle of the box.', `${target} has ${strokeWord(n)}.`],
    debug,
  })
  const incorrect = (): Result => ({
    verdict: 'incorrect',
    message: `This looks like ${best.ch}, not ${target}.`,
    tips: ['Show the reference or play the stroke order, then try again.'],
    looksLike: best.ch,
    debug,
  })

  // Different number of strokes from the target.
  if (drawn.length !== n) {
    // An unfinished target often resembles a simpler character, so prefer the stroke-count
    // hint whenever the ink is still close to the target.
    const shapeRank = scores.filter((s) => s.shape < mine.shape).length
    if (mine.shape > T.shapeClose || shapeRank > 2) return otherIsClear ? incorrect() : uncertain()
    return {
      verdict: 'improve',
      message: `The shape is close, but you used ${strokeWord(drawn.length)} and ${target} has ${n}.`,
      tips: [
        drawn.length < n
          ? 'Lift the pen between strokes. Play the stroke order to see where each one starts and ends.'
          : 'Some strokes should be written in one movement without lifting the pen.',
      ],
      debug,
    }
  }

  const a = analyseStrokes(user, ref)
  const stroke = mine.stroke ?? 1

  // Accept: the target is the best match and both measures are good.
  if (!other && mine.shape <= T.shapeGood && stroke <= T.strokeGood && !a.reordered && !a.reversed.some(Boolean)) {
    return { verdict: 'correct', message: `Correct! That is ${target}.`, tips: [], debug }
  }

  // Right strokes in the wrong order or direction: the ink still has to fit the target
  // better than it fits any other character.
  const lenient = mine.shape + 0.4 * Math.min(a.anyOrder, 0.35)
  const fitsTarget = mine.shape <= T.shapeClose && a.anyOrder <= T.strokeGood && lenient <= best.score + T.margin
  if (fitsTarget && (a.reordered || a.reversed.some(Boolean))) {
    const tips: string[] = []
    if (a.reordered) tips.push('The strokes seem to be in a different order. Play the stroke order and follow the numbers.')
    else a.reversed.forEach((r, i) => r && tips.push(`The ${ordinal(i)} stroke looks like it was drawn in the opposite direction.`))
    return { verdict: 'improve', message: `The shape is right, but check how you wrote it.`, tips, debug }
  }

  if (otherIsClear) return incorrect()
  if (other) {
    // Another character fits better, but not convincingly.
    if (mine.shape <= T.shapeClose && stroke <= T.strokeBad) {
      return {
        verdict: 'improve',
        message: `Close, but it could also be read as ${other.ch}.`,
        tips: [`Make the parts that distinguish ${target} from ${other.ch} clearer.`],
        looksLike: other.ch,
        debug,
      }
    }
    return uncertain()
  }

  // The target is the best match, but not a good one.
  if (mine.shape > T.shapeClose || stroke > T.strokeBad) return uncertain()
  const worst = a.fwd.indexOf(Math.max(...a.fwd))
  const tips =
    n > 1 && a.fwd[worst] > T.strokeGood
      ? [`Check the ${ordinal(worst)} stroke: its shape or position is off.`]
      : ['Match the proportions and positions of the strokes to the reference more closely.']
  return { verdict: 'improve', message: `Recognisable as ${target}, but it needs improvement.`, tips, debug }
}
