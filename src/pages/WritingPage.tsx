import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { hiragana, katakana } from '../data/kana.ts'
import { kanji, kanjiByChar } from '../data/kanji.ts'
import { writingWords } from '../data/vocab.ts'
import { hasStrokes } from '../data/strokes.ts'
import { toRomaji } from '../lib/romaji.ts'
import { AudioButton } from '../components/AudioButton.tsx'
import { StrokeOrder } from '../components/StrokeOrder.tsx'
import { WritingPad } from '../components/WritingPad.tsx'

type Mode = 'hiragana' | 'katakana' | 'words' | 'kanji'

interface Item {
  /** What to write: one character or a whole word. */
  text: string
  /** Shown under the target: romaji for kana, meaning for kanji and words. */
  hint: string
  /** Text for the audio button. */
  say: string
}

const single = (list: typeof hiragana): Item[] =>
  list.filter((k) => k.group !== 'combined').map((k) => ({ text: k.char, hint: k.romaji, say: k.char }))

const ITEMS: Record<Mode, Item[]> = {
  hiragana: single(hiragana),
  katakana: single(katakana),
  words: [...writingWords.hiragana, ...writingWords.katakana, ...writingWords.kanji].map((w) => ({
    text: w.word,
    hint: `${toRomaji(w.kana ?? w.word)} · ${w.en}`,
    say: w.word,
  })),
  kanji: kanji.map((k) => ({ text: k.char, hint: `${k.meaning} · ${k.say} (${toRomaji(k.say)})`, say: k.say })),
}

const MODES: { id: Mode; title: string; blurb: string }[] = [
  { id: 'hiragana', title: 'Hiragana', blurb: 'Single hiragana characters, in chart order.' },
  { id: 'katakana', title: 'Katakana', blurb: 'Single katakana characters, in chart order.' },
  { id: 'words', title: 'Words', blurb: 'Whole words, written one character at a time.' },
  { id: 'kanji', title: 'Kanji', blurb: 'Beginner kanji. Stroke order matters more here, so watch the demonstration first.' },
]

/** Find where a character or word from another page (the ?c= link) belongs. */
function locate(c: string): { mode: Mode; index: number } | { custom: Item } | null {
  for (const m of MODES) {
    const index = ITEMS[m.id].findIndex((it) => it.text === c)
    if (index >= 0) return { mode: m.id, index }
  }
  const chars = [...c]
  if (chars.length && chars.every(hasStrokes)) {
    const k = [...hiragana, ...katakana].find((x) => x.char === c)
    return { custom: { text: c, hint: k?.romaji ?? kanjiByChar.get(c)?.meaning ?? '', say: c } }
  }
  return null
}

export function WritingPage() {
  const [params, setParams] = useSearchParams()
  const requested = params.get('c')
  const [mode, setMode] = useState<Mode>('hiragana')
  const [index, setIndex] = useState(0)
  const [custom, setCustom] = useState<Item | null>(null)
  const [pos, setPos] = useState(0)
  const [done, setDone] = useState<boolean[]>([])
  const [round, setRound] = useState(0)
  const [picker, setPicker] = useState(false)

  useEffect(() => {
    if (!requested) return
    const found = locate(requested)
    if (found && 'mode' in found) {
      setMode(found.mode)
      setIndex(found.index)
      setCustom(null)
    } else if (found) {
      setCustom(found.custom)
    }
    setPos(0)
    setDone([])
  }, [requested])

  const items = ITEMS[mode]
  const item = custom ?? items[index]
  const chars = useMemo(() => [...item.text], [item.text])
  const char = chars[Math.min(pos, chars.length - 1)]
  const isWord = chars.length > 1
  const allDone = chars.every((_, i) => done[i])

  const go = (m: Mode, i: number) => {
    setMode(m)
    setIndex((i + ITEMS[m].length) % ITEMS[m].length)
    setCustom(null)
    setPos(0)
    setDone([])
    setRound((r) => r + 1)
    if (requested) setParams({}, { replace: true })
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-lg font-medium text-red" lang="ja">
          かく
        </p>
        <h1 className="h1">Writing practice</h1>
        <p className="lead mt-2">
          Watch the stroke order, then write the character in the box with your mouse, trackpad or finger. Your strokes are compared with the correct
          ones and you get feedback straight away.
        </p>
      </header>

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="What to practise">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="tab" aria-selected={!custom && m.id === mode} className={`tab ${!custom && m.id === mode ? 'tab-on' : ''}`} onClick={() => go(m.id, 0)}>
            {m.title}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{custom ? 'Practising a character chosen from a lesson.' : MODES.find((m) => m.id === mode)!.blurb}</p>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label">Write this</p>
            <p className="mt-1 text-5xl leading-tight font-bold" lang="ja">
              {item.text}
            </p>
            <p className="mt-1 text-red">{item.hint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AudioButton text={item.say} label="Listen" />
            {!custom && (
              <>
                <button type="button" className="btn" onClick={() => go(mode, index - 1)}>
                  ← Previous
                </button>
                <button type="button" className="btn" onClick={() => go(mode, index + 1)}>
                  Next →
                </button>
              </>
            )}
            <button type="button" className="btn" onClick={() => setPicker((v) => !v)} aria-expanded={picker}>
              {picker ? 'Hide list' : 'Choose…'}
            </button>
          </div>
        </div>

        {picker && (
          <div className="mt-4 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto border-t border-line pt-4">
            {items.map((it, i) => (
              <button
                key={it.text}
                type="button"
                lang="ja"
                onClick={() => {
                  go(mode, i)
                  setPicker(false)
                }}
                className={`min-h-11 min-w-11 cursor-pointer rounded-lg border px-2 text-lg ${
                  !custom && i === index ? 'border-red bg-red-soft' : 'border-line hover:border-ink/40'
                }`}
              >
                {it.text}
              </button>
            ))}
          </div>
        )}

        {isWord && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="label">One character at a time</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {chars.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  lang="ja"
                  onClick={() => setPos(i)}
                  aria-current={i === pos}
                  aria-label={`Character ${i + 1}: ${c}${done[i] ? ', done' : ''}`}
                  className={`h-12 w-12 cursor-pointer rounded-lg border-2 text-2xl font-medium ${
                    i === pos ? 'border-red' : 'border-line'
                  } ${done[i] ? 'bg-green-50 text-green-900' : 'bg-card'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-6 border-t border-line pt-5 md:grid-cols-[14rem_1fr]">
          <div>
            <p className="label">How to write {char}</p>
            <StrokeOrder char={char} className="mt-2 max-w-56" />
          </div>
          <div>
            <p className="label">Your turn</p>
            <div className="mt-2">
              <WritingPad
                key={`${item.text}-${pos}-${round}`}
                char={char}
                onResult={(r) => {
                  if (r.verdict === 'correct') setDone((d) => Object.assign([...d], { [pos]: true }))
                }}
              />
            </div>
            {done[pos] && (
              <div className="mt-2 flex flex-wrap gap-2">
                {isWord && !allDone && (
                  <button type="button" className="btn btn-primary" onClick={() => setPos(chars.findIndex((_, i) => !done[i]))}>
                    Next character →
                  </button>
                )}
                {allDone && !custom && (
                  <button type="button" className="btn btn-primary" onClick={() => go(mode, index + 1)}>
                    {isWord ? 'Well done! Next word →' : 'Next character →'}
                  </button>
                )}
                <button type="button" className="btn" onClick={() => setRound((r) => r + 1)}>
                  Write it again
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card p-5 text-sm text-muted">
        <h2 className="font-bold text-ink">How your writing is checked</h2>
        <p className="mt-2">
          Your strokes are compared with reference strokes for every character in the same script. You get <strong>Correct</strong> only when your
          drawing matches the target better than any other character and each stroke is in the right order and direction.{' '}
          <strong>Needs improvement</strong> means the shape is recognisable but something is off, such as the number, order or direction of strokes.
          If the drawing cannot be recognised with confidence, you are asked to try again rather than given a guess. The check judges stroke shape
          and order, not neatness or beauty.
        </p>
      </section>
    </div>
  )
}
