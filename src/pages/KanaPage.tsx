import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GROUP_LABELS, kanaByScript } from '../data/kana.ts'
import type { Kana, KanaGroup, Script } from '../data/kana.ts'
import { AudioButton, AudioNotice } from '../components/AudioButton.tsx'
import { StrokeOrder } from '../components/StrokeOrder.tsx'

const INTRO: Record<Script, { title: string; jp: string; text: string }> = {
  hiragana: {
    title: 'Hiragana',
    jp: 'ひらがな',
    text: 'Hiragana is the first Japanese alphabet. Each character is one sound, and together they can write any Japanese word. Tap a character to hear it, see an example word and watch how it is written.',
  },
  katakana: {
    title: 'Katakana',
    jp: 'カタカナ',
    text: 'Katakana has the same sounds as hiragana, with sharper shapes. It is used for words borrowed from other languages, foreign names and emphasis. A long vowel is written with a dash: ー.',
  },
}

const GROUPS: KanaGroup[] = ['basic', 'voiced', 'combined']

/** Lay the basic 46 out as the traditional five-column chart, with gaps in the y- and w-rows. */
function chartCells(list: Kana[], group: KanaGroup): (Kana | null)[] {
  if (group !== 'basic') return list
  const [ya, yu, yo] = list.slice(35, 38)
  const [wa, wo, n] = list.slice(43, 46)
  return [...list.slice(0, 35), ya, null, yu, null, yo, ...list.slice(38, 43), wa, null, null, null, wo, n]
}

function Detail({ k }: { k: Kana }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-7xl leading-none font-bold" lang="ja">
            {k.char}
          </p>
          <p className="mt-3 text-2xl font-medium text-red">{k.romaji}</p>
        </div>
        <div className="flex gap-2">
          <AudioButton text={k.char} />
          <AudioButton text={k.char} slow label="Slow" />
        </div>
      </div>
      {k.note && <p className="mt-3 text-sm text-muted">{k.note}</p>}

      <div className="mt-5 border-t border-line pt-4">
        <p className="label">Example word</p>
        {k.example ? (
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-2xl font-medium" lang="ja">
                {k.example.word}
              </p>
              <p className="text-sm text-muted">
                {k.example.romaji} · {k.example.meaning}
              </p>
            </div>
            <AudioButton text={k.example.word} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">This sound is rare, so there is no common beginner word for it.</p>
        )}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="label">Stroke order</p>
        <div className={`mt-2 grid gap-3 ${k.char.length > 1 ? 'grid-cols-2' : 'max-w-56'}`}>
          {[...k.char].map((c, i) => (
            <StrokeOrder key={c + i} char={c} />
          ))}
        </div>
        {k.char.length > 1 && <p className="mt-2 text-sm text-muted">The second character is written small, at about half size.</p>}
      </div>

      <Link to={`/writing?c=${encodeURIComponent(k.char)}`} className="btn btn-primary mt-5 w-full">
        Practise writing {k.char}
      </Link>
    </div>
  )
}

export function KanaPage({ script }: { script: Script }) {
  const all = kanaByScript[script]
  const [group, setGroup] = useState<KanaGroup>('basic')
  const list = all.filter((k) => k.group === group)
  const [selected, setSelected] = useState(list[0].char)
  const detailRef = useRef<HTMLDivElement>(null)
  const current = list.find((k) => k.char === selected) ?? list[0]
  const intro = INTRO[script]

  useEffect(() => {
    setGroup('basic')
    setSelected(kanaByScript[script][0].char)
  }, [script])

  const choose = (k: Kana) => {
    setSelected(k.char)
    // On narrow screens the detail card sits above the chart: bring it into view.
    if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ block: 'start' })
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-lg font-medium text-red" lang="ja">
          {intro.jp}
        </p>
        <h1 className="h1">{intro.title}</h1>
        <p className="lead mt-2">{intro.text}</p>
      </header>
      <AudioNotice />

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Character groups">
        {GROUPS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={g === group}
            className={`tab ${g === group ? 'tab-on' : ''}`}
            onClick={() => {
              setGroup(g)
              setSelected(all.find((k) => k.group === g)!.char)
            }}
          >
            {GROUP_LABELS[g].title}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{GROUP_LABELS[group].blurb}</p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div ref={detailRef} className="scroll-mt-20 lg:sticky lg:top-20 lg:order-2">
          <Detail k={current} />
        </div>

        <div className="lg:order-1">
          <div className={`grid gap-2 ${group === 'combined' ? 'grid-cols-3' : 'grid-cols-5'}`}>
            {chartCells(list, group).map((k, i) =>
              k ? (
                <button
                  key={k.char}
                  type="button"
                  onClick={() => choose(k)}
                  aria-pressed={k.char === current.char}
                  aria-label={`${k.char}, ${k.romaji}`}
                  className={`card flex cursor-pointer flex-col items-center px-1 py-3 transition-colors hover:border-red ${
                    k.char === current.char ? '!border-red bg-red-soft' : ''
                  }`}
                >
                  <span className="text-3xl leading-tight font-medium sm:text-4xl" lang="ja">
                    {k.char}
                  </span>
                  <span className="mt-1 text-sm text-muted">{k.romaji}</span>
                </button>
              ) : (
                <span key={`gap${i}`} aria-hidden="true" />
              ),
            )}
          </div>

          <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="font-bold">Ready to test yourself?</h2>
              <p className="text-sm text-muted">A short quiz on {GROUP_LABELS[group].title.toLowerCase()}: read, listen and write.</p>
            </div>
            <Link to={`/quizzes?set=${script}-${group}`} className="btn btn-primary">
              Start the quiz
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
