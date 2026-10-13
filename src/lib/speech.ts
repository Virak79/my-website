// Text-to-speech and speech-to-text, both through the browser's built-in Web Speech API.
// No API key or external account is needed; the browser provides the voices and the recogniser.
import { useSyncExternalStore } from 'react'
import { toHiragana } from './romaji.ts'
import type { Entry } from '../data/vocab.ts'

// ---------- text-to-speech ----------

export type TtsStatus = 'unsupported' | 'loading' | 'no-voice' | 'ready'

const hasTts = typeof window !== 'undefined' && 'speechSynthesis' in window
const RATE_KEY = 'nfs:rate'

function readRate(): number {
  try {
    const v = parseFloat(localStorage.getItem(RATE_KEY) ?? '')
    return v >= 0.4 && v <= 1.2 ? v : 0.9
  } catch {
    return 0.9
  }
}

let state: { status: TtsStatus; rate: number; speaking: string | null } = {
  status: hasTts ? 'loading' : 'unsupported',
  rate: readRate(),
  speaking: null,
}
const listeners = new Set<() => void>()
const set = (patch: Partial<typeof state>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

let voice: SpeechSynthesisVoice | null = null

function pickVoice() {
  const ja = speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('ja'))
  // Prefer the more natural-sounding network / neural voices when the browser offers them.
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|neural|online/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (/nanami|kyoko|o-ren/i.test(v.name) ? 1 : 0)
  voice = ja.sort((a, b) => score(b) - score(a))[0] ?? null
  if (voice) set({ status: 'ready' })
}

if (hasTts) {
  pickVoice()
  speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
  // Some browsers never fire voiceschanged; stop waiting after a moment.
  setTimeout(() => {
    pickVoice()
    if (!voice) set({ status: 'no-voice' })
  }, 2500)
}

/** Speak Japanese text. `slow` plays at a reduced speed regardless of the chosen rate. */
export function speak(text: string, opts: { slow?: boolean } = {}): boolean {
  if (!hasTts) return false
  try {
    speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'ja-JP'
    if (voice) u.voice = voice
    u.rate = opts.slow ? Math.min(state.rate, 0.6) : state.rate
    const done = () => state.speaking === text && set({ speaking: null })
    u.onend = done
    u.onerror = done
    set({ speaking: text })
    speechSynthesis.speak(u)
    return true
  } catch {
    set({ speaking: null })
    return false
  }
}

export function setRate(rate: number) {
  set({ rate })
  try {
    localStorage.setItem(RATE_KEY, String(rate))
  } catch {
    /* private mode: the setting just won't persist */
  }
}

export function useTts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

// ---------- speech-to-text ----------

/* eslint-disable @typescript-eslint/no-explicit-any */
const SR: any = typeof window !== 'undefined' ? ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) : null

export const sttSupported = Boolean(SR)

export type SttError = 'not-allowed' | 'no-speech' | 'audio-capture' | 'network' | 'other'

const STT_MESSAGES: Record<SttError, string> = {
  'not-allowed': 'Microphone access was blocked. Allow the microphone for this site in your browser, then try again.',
  'no-speech': "I didn't hear anything. Press the microphone and speak right away.",
  'audio-capture': 'No microphone was found. Connect one and try again.',
  network: 'Speech recognition needs an internet connection in this browser. Check your connection and try again.',
  other: 'Speech recognition stopped unexpectedly. Please try again.',
}
export const sttMessage = (e: SttError) => STT_MESSAGES[e]

/** Listen for one Japanese utterance. Returns a function that stops listening. */
export function listen(handlers: { onResult: (alternatives: string[]) => void; onError: (e: SttError) => void; onEnd: () => void }): () => void {
  if (!SR) {
    handlers.onError('other')
    handlers.onEnd()
    return () => {}
  }
  if (hasTts) speechSynthesis.cancel()
  const rec = new SR()
  rec.lang = 'ja-JP'
  rec.interimResults = false
  rec.continuous = false
  rec.maxAlternatives = 5
  let finished = false
  rec.onresult = (ev: any) => {
    const alts: string[] = []
    for (const result of ev.results) for (const alt of result) if (alt.transcript) alts.push(String(alt.transcript).trim())
    if (alts.length) {
      finished = true
      handlers.onResult(alts)
    }
  }
  rec.onerror = (ev: any) => {
    if (ev.error === 'aborted') return
    finished = true
    const known: SttError[] = ['not-allowed', 'no-speech', 'audio-capture', 'network']
    handlers.onError(ev.error === 'service-not-allowed' ? 'not-allowed' : known.includes(ev.error) ? ev.error : 'other')
  }
  rec.onend = () => {
    if (!finished) handlers.onError('no-speech')
    handlers.onEnd()
  }
  try {
    rec.start()
  } catch {
    handlers.onError('other')
    handlers.onEnd()
  }
  return () => {
    try {
      rec.stop()
    } catch {
      /* already stopped */
    }
  }
}

// ---------- comparing what was heard with what was expected ----------

/** Strip punctuation and spaces, unify width and kana type, so only the words are compared. */
export function normalizeSpeech(s: string): string {
  return toHiragana(s.normalize('NFKC').toLowerCase()).replace(/[\s、。，．,.!?！？「」『』・･…~〜\-]/g, '')
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

export type SpeechMatch = 'match' | 'close' | 'different'

/**
 * Compare the recogniser's alternatives with the expected phrase.
 * The same words can be written several ways (kanji, kana, digits), so every known spelling is tried.
 */
export function compareSpeech(heard: string[], expected: Entry): { status: SpeechMatch; shown: string } {
  const targets = [expected.jp, expected.kana, ...(expected.accept ?? [])].map(normalizeSpeech)
  let bestRatio = Infinity
  let shown = heard[0] ?? ''
  for (const h of heard) {
    const n = normalizeSpeech(h)
    for (const t of targets) {
      const ratio = editDistance(n, t) / Math.max(n.length, t.length, 1)
      if (ratio < bestRatio) {
        bestRatio = ratio
        shown = h
      }
    }
  }
  return { status: bestRatio === 0 ? 'match' : bestRatio <= 0.34 ? 'close' : 'different', shown }
}
