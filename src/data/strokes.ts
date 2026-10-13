// Stroke-order data from the KanjiVG project (CC BY-SA 3.0), fetched by scripts/fetch-strokes.mjs.
import raw from './strokes.json' with { type: 'json' }
import { kanji } from './kanji.ts'
import { setStrokeData } from '../lib/recognizer.ts'

export const strokes = raw as Record<string, string[]>
setStrokeData(strokes)

const SMALL: Record<string, string> = {
  ぁ: 'あ', ぃ: 'い', ぅ: 'う', ぇ: 'え', ぉ: 'お', っ: 'つ', ゃ: 'や', ゅ: 'ゆ', ょ: 'よ', ゎ: 'わ',
  ァ: 'ア', ィ: 'イ', ゥ: 'ウ', ェ: 'エ', ォ: 'オ', ッ: 'ツ', ャ: 'ヤ', ュ: 'ユ', ョ: 'ヨ', ヮ: 'ワ',
}

export const isSmallKana = (c: string) => c in SMALL
/** Small kana are checked against their full-size shape. */
export const fullSize = (c: string) => SMALL[c] ?? c

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => String.fromCodePoint(from + i)).filter(
    (c) => !isSmallKana(c) && strokes[c],
  )

const HIRAGANA_SET = range(0x3041, 0x3093)
const KATAKANA_SET = [...range(0x30a1, 0x30f3), 'ー']
const KANJI_SET = kanji.map((k) => k.char)

/** All characters a drawing of `ch` is compared against: every character of the same script. */
export function candidatesFor(ch: string): string[] {
  const c = fullSize(ch)
  if (HIRAGANA_SET.includes(c)) return HIRAGANA_SET
  if (KATAKANA_SET.includes(c)) return KATAKANA_SET
  return KANJI_SET.includes(c) ? KANJI_SET : [...KANJI_SET, c]
}

export const hasStrokes = (ch: string) => Boolean(strokes[ch])
