// Sanity test for the handwriting recogniser using synthetic "handwriting":
// reference strokes distorted with scaling, rotation, per-stroke offsets and wobble.
// Run with: npm run test:recognizer
import { strokes, candidatesFor } from '../src/data/strokes.ts'
import { kanji } from '../src/data/kanji.ts'
import { pathToPoints, recognize, resample } from '../src/lib/recognizer.ts'
import type { Pt, Stroke } from '../src/lib/recognizer.ts'

let seed = 12345
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const r = (a: number, b: number) => a + (b - a) * rand()

/** level 1 = neat handwriting, 2 = sloppy. */
function distort(ch: string, level: number): Stroke[] {
  const sx = r(1 - 0.12 * level, 1 + 0.12 * level)
  const sy = r(1 - 0.12 * level, 1 + 0.12 * level)
  const rot = r(-0.07, 0.07) * level
  const shear = r(-0.08, 0.08) * level
  const ox = r(-15, 15)
  const oy = r(-15, 15)
  const k = r(0.6, 1.1)
  return strokes[ch].map((d) => {
    const pts = resample(pathToPoints(d), 24)
    const jx = r(-2.5, 2.5) * level
    const jy = r(-2.5, 2.5) * level
    const phase = r(0, 6.28)
    const amp = r(0.5, 1.8) * level
    return pts.map(([x, y], i) => {
      let px = (x - 54) * sx + (y - 54) * shear
      let py = (y - 54) * sy
      const c = Math.cos(rot)
      const s = Math.sin(rot)
      ;[px, py] = [px * c - py * s, px * s + py * c]
      px += jx + amp * Math.sin(phase + i * 0.5)
      py += jy + amp * Math.cos(phase + i * 0.4)
      return [(px + 54) * k + ox, (py + 54) * k + oy] as Pt
    })
  })
}

const sets: Record<string, string[]> = {
  hiragana: candidatesFor('あ'),
  katakana: candidatesFor('ア'),
  kanji: kanji.map((k) => k.char),
}

const tally = () => ({ correct: 0, improve: 0, incorrect: 0, uncertain: 0 })
const fmt = (t: ReturnType<typeof tally>) => `correct ${t.correct}, improve ${t.improve}, incorrect ${t.incorrect}, uncertain ${t.uncertain}`
const TRIALS = 6
let failures = 0

for (const [name, set] of Object.entries(sets)) {
  console.log(`\n== ${name} (${set.length} characters) ==`)
  for (const level of [1, 2]) {
    const t = tally()
    const missed: string[] = []
    for (const ch of set)
      for (let i = 0; i < TRIALS; i++) {
        const res = recognize(distort(ch, level), ch, set)
        t[res.verdict]++
        if (res.verdict !== 'correct' && level === 1) missed.push(`${ch}:${res.verdict}${res.looksLike ? '→' + res.looksLike : ''}`)
      }
    console.log(`right character, ${level === 1 ? 'neat' : 'sloppy'}: ${fmt(t)}`)
    if (level === 1 && missed.length) console.log('   not accepted: ' + [...new Set(missed)].slice(0, 40).join(' '))
    if (level === 1 && t.incorrect > 0) failures++
  }

  // Wrong character drawn: must never be accepted.
  const wrong = tally()
  const accepted: string[] = []
  for (const target of set)
    for (const drawn of set) {
      if (drawn === target) continue
      const res = recognize(distort(drawn, 1), target, set)
      wrong[res.verdict]++
      if (res.verdict === 'correct') accepted.push(`${drawn} accepted as ${target}`)
    }
  console.log(`wrong character: ${fmt(wrong)}`)
  if (accepted.length) {
    failures++
    console.log('   FALSE ACCEPTS: ' + accepted.slice(0, 30).join(', '))
  }

  // Right character with a mistake.
  const rev = tally()
  const miss = tally()
  const order = tally()
  for (const ch of set) {
    const good = distort(ch, 1)
    const longest = good.reduce((b, s, i) => (s.length && len(s) > len(good[b]) ? i : b), 0)
    rev[recognize(good.map((s, i) => (i === longest ? [...s].reverse() : s)), ch, set).verdict]++
    if (good.length > 1) {
      miss[recognize(good.slice(0, -1), ch, set).verdict]++
      order[recognize([...good].reverse(), ch, set).verdict]++
    }
  }
  console.log(`longest stroke reversed: ${fmt(rev)}`)
  console.log(`last stroke missing: ${fmt(miss)}`)
  console.log(`stroke order reversed: ${fmt(order)}`)
  if (rev.correct + miss.correct > 0) failures++
}

// A scribble must not be recognised as anything.
const scribble: Stroke[] = [Array.from({ length: 60 }, (_, i) => [54 + 40 * Math.sin(i * 0.9), 54 + 40 * Math.cos(i * 1.7)] as Pt)]
const s = recognize(scribble, 'の', sets.hiragana)
console.log(`\nscribble checked as の: ${s.verdict} – ${s.message}`)
if (s.verdict === 'correct') failures++

function len(p: Pt[]) {
  let l = 0
  for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])
  return l
}

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
