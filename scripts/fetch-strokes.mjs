// Downloads stroke-order paths from KanjiVG (https://kanjivg.tagaini.net, CC BY-SA 3.0)
// for every kana and every kanji that appears in src/data, and writes src/data/strokes.json.
// Run with: npm run fetch-strokes
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dataDir = join(root, 'src', 'data')
const outFile = join(dataDir, 'strokes.json')

const chars = new Set()
for (let c = 0x3041; c <= 0x3093; c++) chars.add(String.fromCodePoint(c)) // hiragana
for (let c = 0x30a1; c <= 0x30f3; c++) chars.add(String.fromCodePoint(c)) // katakana
chars.add('ー')
for (const f of readdirSync(dataDir).filter((f) => f.endsWith('.ts'))) {
  for (const c of readFileSync(join(dataDir, f), 'utf8')) {
    if (/[一-鿿]/.test(c)) chars.add(c)
  }
}

const base = 'https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/'

async function fetchChar(ch) {
  const hex = ch.codePointAt(0).toString(16).padStart(5, '0')
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${base}${hex}.svg`)
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const svg = await res.text()
      const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
      return paths.length ? paths : null
    } catch (e) {
      if (attempt === 2) throw e
    }
  }
}

const list = [...chars]
const out = {}
const missing = []
let i = 0
async function worker() {
  while (i < list.length) {
    const ch = list[i++]
    const paths = await fetchChar(ch)
    if (paths) out[ch] = paths
    else missing.push(ch)
  }
}
await Promise.all(Array.from({ length: 12 }, worker))

const sorted = Object.fromEntries(Object.keys(out).sort().map((k) => [k, out[k]]))
writeFileSync(outFile, JSON.stringify(sorted))
console.log(`Saved ${Object.keys(sorted).length} characters to ${outFile}`)
if (missing.length) console.log(`No stroke data for: ${missing.join(' ')}`)
