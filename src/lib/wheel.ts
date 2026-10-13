// The spinning wheel: where a spin lands, what is on the wheel, and what each entry means.
import { hiragana, katakana } from '../data/kana.ts'
import { kanjiByChar } from '../data/kanji.ts'
import { speakingSets, topics, writingWords } from '../data/vocab.ts'
import type { Entry } from '../data/vocab.ts'
import { compact, isKana, isKanji, toHiragana, toRomaji } from './romaji.ts'

// ---------- spinning ----------

/** A random number in [0, 1). */
export type Rng = () => number

export const cryptoRng: Rng = () => {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] / 2 ** 32
}

const mod = (a: number, n: number) => ((a % n) + n) % n

export function pickIndex(count: number, rng: Rng = cryptoRng): number {
  return Math.min(count - 1, Math.floor(rng() * count))
}

/**
 * The segment under the pointer. Segment 0 starts at the top of an unrotated wheel and the
 * segments run clockwise; `rotation` is how far the wheel has turned clockwise, in degrees.
 */
export function indexAtPointer(rotation: number, count: number): number {
  if (count < 1) return -1
  return Math.min(count - 1, Math.floor(mod(-rotation, 360) / (360 / count)))
}

/** Choose a segment at random and work out the rotation that stops the wheel on it. */
export function planSpin(rotation: number, count: number, rng: Rng = cryptoRng, turns = 6): { index: number; rotation: number } {
  const index = pickIndex(count, rng)
  // Stop inside the segment, away from its edges, so the result is never ambiguous.
  const within = 0.15 + 0.7 * rng()
  const target = mod(-(index + within) * (360 / count), 360)
  return { index, rotation: rotation + turns * 360 + mod(target - rotation, 360) }
}

export function shuffled<T>(a: T[], rng: Rng = cryptoRng): T[] {
  const out = [...a]
  for (let i = out.length - 1; i > 0; i--) {
    const j = pickIndex(i + 1, rng)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ---------- what is on the wheel ----------

export type ListId = 'hiragana' | 'katakana' | 'kanji' | 'custom'
export type WheelMode = ListId | 'mixed'

export interface SavedWheel {
  id: string
  name: string
  entries: string[]
}

export interface WheelState {
  mode: WheelMode
  /** Each mode keeps its own list; Mixed combines the three script lists. */
  lists: Record<ListId, string[]>
  /** The order of the Mixed wheel after a shuffle. */
  mixedOrder: string[]
  allowDuplicates: boolean
  /** Require both tasks to be attempted before the next spin. */
  requireBoth: boolean
  saved: SavedWheel[]
  /** The saved wheel currently open in Custom mode, if any. */
  openId: string | null
}

export const MAX_ENTRY_LENGTH = 16
export const MAX_ENTRIES = 100
export const MAX_NAME_LENGTH = 40

const SCRIPTS: ListId[] = ['hiragana', 'katakana', 'kanji']

export const DEFAULTS: Record<ListId, string[]> = {
  hiragana: [...'あいうえおかきくけこ'],
  katakana: [...'アイウエオカキクケコ'],
  kanji: [...'日月火水木金土人山川'].filter((c) => kanjiByChar.has(c)),
  custom: [],
}

export function initialWheel(): WheelState {
  return {
    mode: 'hiragana',
    lists: { hiragana: [...DEFAULTS.hiragana], katakana: [...DEFAULTS.katakana], kanji: [...DEFAULTS.kanji], custom: [] },
    mixedOrder: [],
    allowDuplicates: false,
    requireBoth: false,
    saved: [],
    openId: null,
  }
}

/** `union` in the order given by `order`; anything `order` does not mention goes last. */
function reconcile(order: string[], union: string[]): string[] {
  const left = new Map<string, number>()
  for (const t of union) left.set(t, (left.get(t) ?? 0) + 1)
  const out: string[] = []
  for (const t of [...order, ...union]) {
    const n = left.get(t) ?? 0
    if (n > 0) {
      out.push(t)
      left.set(t, n - 1)
    }
  }
  return out
}

/** The entries shown on the wheel in the current mode. */
export function entriesFor(s: WheelState): string[] {
  if (s.mode !== 'mixed') return s.lists[s.mode]
  return reconcile(s.mixedOrder, SCRIPTS.flatMap((id) => s.lists[id]))
}

const withList = (s: WheelState, id: ListId, list: string[]): WheelState => ({ ...s, lists: { ...s.lists, [id]: list } })

const japanese = (text: string) => [...text].filter((c) => isKana(c) || isKanji(c))

/** Which script list an entry belongs to; `other` mixes hiragana and katakana. */
export function scriptOf(text: string): 'hiragana' | 'katakana' | 'kanji' | 'other' {
  const chars = japanese(text)
  if (chars.some(isKanji)) return 'kanji'
  if (chars.length && chars.every((c) => /[ぁ-ゖー]/.test(c)) && chars.some((c) => c !== 'ー')) return 'hiragana'
  if (chars.length && chars.every((c) => /[ァ-ヺー]/.test(c))) return 'katakana'
  return 'other'
}

/** Tidy typed text: unify full- and half-width forms, collapse spaces. */
export const cleanEntry = (raw: string) => raw.normalize('NFKC').replace(/\s+/g, ' ').trim()

export type EntryError = 'empty' | 'too-long' | 'not-japanese' | 'wrong-script' | 'duplicate' | 'full'

/** Add an entry to the current wheel. On failure the state is returned unchanged with the reason. */
export function addEntry(s: WheelState, raw: string): { state: WheelState; text: string; error?: EntryError } {
  const text = cleanEntry(raw)
  const fail = (error: EntryError) => ({ state: s, text, error })
  if (!text) return fail('empty')
  if ([...text].length > MAX_ENTRY_LENGTH) return fail('too-long')
  if (japanese(text).length === 0) return fail('not-japanese')
  const script = scriptOf(text)
  const fits = s.mode === 'mixed' ? script !== 'other' : script === s.mode
  const list: ListId | null = s.mode === 'custom' ? 'custom' : fits ? (script as ListId) : null
  if (!list) return fail('wrong-script')
  const current = entriesFor(s)
  if (!s.allowDuplicates && current.includes(text)) return fail('duplicate')
  if (current.length >= MAX_ENTRIES) return fail('full')
  return { state: withList(s, list, [...s.lists[list], text]), text }
}

/** Remove the entry at `index` of the current wheel. */
export function removeEntry(s: WheelState, index: number): WheelState {
  const current = entriesFor(s)
  if (index < 0 || index >= current.length) return s
  const rest = current.filter((_, i) => i !== index)
  if (s.mode !== 'mixed') return withList(s, s.mode, rest)
  const text = current[index]
  const id = SCRIPTS.find((l) => s.lists[l].includes(text))!
  const at = s.lists[id].lastIndexOf(text)
  return { ...withList(s, id, s.lists[id].filter((_, i) => i !== at)), mixedOrder: rest }
}

const forMode = (s: WheelState, list: (id: ListId) => string[]): WheelState =>
  s.mode === 'mixed'
    ? { ...s, lists: { ...s.lists, hiragana: list('hiragana'), katakana: list('katakana'), kanji: list('kanji') }, mixedOrder: [] }
    : withList(s, s.mode, list(s.mode))

export const clearWheel = (s: WheelState) => forMode(s, () => [])
export const restoreDefaults = (s: WheelState) => forMode(s, (id) => [...DEFAULTS[id]])

export function shuffleWheel(s: WheelState, rng: Rng = cryptoRng): WheelState {
  const current = entriesFor(s)
  let next = shuffled(current, rng)
  // A shuffle that changes nothing looks broken, so try again when a different order exists.
  for (let i = 0; i < 8 && new Set(current).size > 1 && next.every((t, j) => t === current[j]); i++) next = shuffled(current, rng)
  return s.mode === 'mixed' ? { ...s, mixedOrder: next } : withList(s, s.mode, next)
}

// ---------- saved wheels ----------

export const cleanName = (raw: string) => [...raw.replace(/\s+/g, ' ').trim()].slice(0, MAX_NAME_LENGTH).join('')

/** Save the current wheel under a name. In Custom mode the new wheel becomes the open one. */
export function saveAs(s: WheelState, rawName: string, id: string): WheelState {
  const name = cleanName(rawName)
  if (!name) return s
  return { ...s, saved: [...s.saved, { id, name, entries: [...entriesFor(s)] }], openId: s.mode === 'custom' ? id : s.openId }
}

/** Load a saved wheel into Custom mode for spinning and editing. */
export function openSaved(s: WheelState, id: string): WheelState {
  const w = s.saved.find((x) => x.id === id)
  return w ? { ...withList(s, 'custom', [...w.entries]), mode: 'custom', openId: id } : s
}

/** Write the Custom list back to the saved wheel it was opened from. */
export function updateSaved(s: WheelState): WheelState {
  return { ...s, saved: s.saved.map((w) => (w.id === s.openId ? { ...w, entries: [...s.lists.custom] } : w)) }
}

export function renameSaved(s: WheelState, id: string, rawName: string): WheelState {
  const name = cleanName(rawName)
  return name ? { ...s, saved: s.saved.map((w) => (w.id === id ? { ...w, name } : w)) } : s
}

export function duplicateSaved(s: WheelState, id: string, newId: string): WheelState {
  const at = s.saved.findIndex((w) => w.id === id)
  if (at < 0) return s
  const copy = { id: newId, name: cleanName(`${s.saved[at].name} (copy)`), entries: [...s.saved[at].entries] }
  return { ...s, saved: [...s.saved.slice(0, at + 1), copy, ...s.saved.slice(at + 1)] }
}

/** Delete a saved wheel. The Custom list is left alone even if it was opened from that wheel. */
export function deleteSaved(s: WheelState, id: string): WheelState {
  return { ...s, saved: s.saved.filter((w) => w.id !== id), openId: s.openId === id ? null : s.openId }
}

/** Whether the Custom list differs from the saved wheel it was opened from. */
export function hasUnsavedChanges(s: WheelState): boolean {
  const w = s.saved.find((x) => x.id === s.openId)
  return Boolean(w) && (w!.entries.length !== s.lists.custom.length || w!.entries.some((t, i) => t !== s.lists.custom[i]))
}

// ---------- browser storage ----------

const KEY = 'nfs:wheel'

const strings = (v: unknown, limit: number): string[] =>
  Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string' && t.trim() !== '').slice(0, limit) : []

/** Rebuild a valid state from whatever was stored, falling back to the defaults piece by piece. */
export function sanitizeWheel(v: unknown): WheelState {
  const base = initialWheel()
  if (!v || typeof v !== 'object') return base
  const o = v as Record<string, unknown>
  const lists = (o.lists && typeof o.lists === 'object' ? o.lists : {}) as Record<string, unknown>
  const list = (id: ListId) => (Array.isArray(lists[id]) ? strings(lists[id], MAX_ENTRIES) : base.lists[id])
  const saved = (Array.isArray(o.saved) ? o.saved : [])
    .filter((w): w is Record<string, unknown> => Boolean(w) && typeof w === 'object')
    .map((w) => ({ id: String(w.id ?? ''), name: cleanName(String(w.name ?? '')), entries: strings(w.entries, MAX_ENTRIES) }))
    .filter((w) => w.id && w.name)
  const modes: WheelMode[] = ['hiragana', 'katakana', 'kanji', 'mixed', 'custom']
  return {
    mode: modes.includes(o.mode as WheelMode) ? (o.mode as WheelMode) : base.mode,
    lists: { hiragana: list('hiragana'), katakana: list('katakana'), kanji: list('kanji'), custom: list('custom') },
    mixedOrder: strings(o.mixedOrder, MAX_ENTRIES * 3),
    allowDuplicates: o.allowDuplicates === true,
    requireBoth: o.requireBoth === true,
    saved,
    openId: saved.some((w) => w.id === o.openId) ? (o.openId as string) : null,
  }
}

export function loadWheel(): WheelState {
  try {
    return sanitizeWheel(JSON.parse(localStorage.getItem(KEY) ?? 'null'))
  } catch {
    return initialWheel()
  }
}

export function persistWheel(s: WheelState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* storage unavailable: the wheel just won't be remembered */
  }
}

// ---------- what an entry means ----------

export interface EntryInfo {
  text: string
  /** The characters to write, one at a time. */
  chars: string[]
  /** Text for the audio button. */
  say: string
  /** Reading in kana, when the lessons know it. */
  reading: string | null
  romaji: string | null
  meaning: string | null
  note?: string
  /** What the microphone check compares against. */
  entry: Entry
}

const strip = (s: string) => s.replace(/[\s、。，．,.!?！？]/g, '')

const KANA = new Map([...hiragana, ...katakana].map((k) => [k.char, k]))

// Kana that sound the same as another, so a recogniser may write either.
const SAME_SOUND: Record<string, string> = { を: 'お', ぢ: 'じ', づ: 'ず' }

const WORDS = new Map<string, { kana: string; romaji: string; en: string; accept?: string[] }>()
const learn = (jp: string, kana: string, romaji: string, en: string, accept?: string[]) => {
  const key = strip(jp)
  if (key && !WORDS.has(key)) WORDS.set(key, { kana: strip(kana), romaji, en, accept })
}
for (const e of [...topics.flatMap((t) => [...t.words, ...t.sentences]), ...speakingSets.flatMap((s) => s.items)]) learn(e.jp, e.kana, e.romaji, e.en, e.accept)
for (const k of KANA.values()) if (k.example) learn(k.example.word, k.example.kana, k.example.romaji, k.example.meaning)
for (const k of kanjiByChar.values()) for (const x of k.examples) learn(x.word, x.kana, x.romaji, x.meaning)
for (const w of Object.values(writingWords).flat()) learn(w.word, w.kana ?? w.word, toRomaji(w.kana ?? w.word), w.en)

/** Everything the challenge needs to know about a wheel entry. */
export function describeEntry(text: string): EntryInfo {
  const chars = japanese(text)
  const kana = KANA.get(text)
  if (kana) {
    const same = SAME_SOUND[toHiragana(text)]
    const entry = { jp: text, kana: text, romaji: kana.romaji, en: '', accept: same ? [same] : undefined }
    return { text, chars, say: text, reading: text, romaji: kana.romaji, meaning: null, note: kana.note, entry }
  }
  const k = kanjiByChar.get(text)
  if (k) {
    // Any of the kanji's readings counts, with or without the okurigana shown in brackets.
    const accept = [...k.on, ...k.kun].flatMap((r) => [r.replace(/[()]/g, ''), r.replace(/\(.*?\)/g, '')])
    const romaji = toRomaji(k.say)
    return { text, chars, say: k.say, reading: k.say, romaji, meaning: k.meaning, entry: { jp: text, kana: k.say, romaji, en: k.meaning, accept } }
  }
  const w = WORDS.get(strip(text))
  if (w) {
    const entry = { jp: text, kana: w.kana, romaji: w.romaji, en: w.en, accept: w.accept }
    return { text, chars, say: text, reading: w.kana, romaji: w.romaji, meaning: w.en, entry }
  }
  if (!chars.some(isKanji)) {
    // Kana spells out its own reading.
    const romaji = toRomaji(text)
    return { text, chars, say: text, reading: compact(text), romaji, meaning: null, entry: { jp: text, kana: compact(text), romaji, en: '' } }
  }
  // A kanji or word the lessons do not cover: the browser can still say it, but there is no reading to show.
  return { text, chars, say: text, reading: null, romaji: null, meaning: null, entry: { jp: text, kana: text, romaji: '', en: '' } }
}
