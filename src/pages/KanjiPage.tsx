import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { KANJI_GROUPS, kanji } from '../data/kanji.ts'
import type { Kanji } from '../data/kanji.ts'
import { toRomaji } from '../lib/romaji.ts'
import { AudioButton, AudioNotice } from '../components/AudioButton.tsx'
import { StrokeOrder } from '../components/StrokeOrder.tsx'

function Detail({ k }: { k: Kanji }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-7xl leading-none font-bold" lang="ja">
            {k.char}
          </p>
          <p className="mt-3 text-2xl font-medium text-red">{k.meaning}</p>
        </div>
        <AudioButton text={k.say} label={k.say} />
      </div>

      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted">Japanese reading (kun)</dt>
        <dd lang="ja">{k.kun.length ? k.kun.join('、') : '—'}</dd>
        <dt className="text-muted">Chinese reading (on)</dt>
        <dd lang="ja">{k.on.length ? k.on.map((r) => `${r} (${toRomaji(r)})`).join('、') : '—'}</dd>
      </dl>

      <div className="mt-5 border-t border-line pt-4">
        <p className="label">Example words</p>
        <ul className="mt-2 space-y-3">
          {k.examples.map((e) => (
            <li key={e.word} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-medium" lang="ja">
                  {e.word} <span className="text-base font-normal text-muted">{e.kana.replace(/\s+/g, '')}</span>
                </p>
                <p className="text-sm text-muted">
                  {e.romaji} · {e.meaning}
                </p>
              </div>
              <AudioButton text={e.word} />
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="label">Stroke order</p>
        <StrokeOrder char={k.char} className="mt-2 max-w-56" />
      </div>

      <Link to={`/writing?c=${encodeURIComponent(k.char)}`} className="btn btn-primary mt-5 w-full">
        Practise writing {k.char}
      </Link>
    </div>
  )
}

export function KanjiPage() {
  const [group, setGroup] = useState<string>(KANJI_GROUPS[0].id)
  const list = kanji.filter((k) => k.group === group)
  const [selected, setSelected] = useState(list[0].char)
  const current = list.find((k) => k.char === selected) ?? list[0]
  const detailRef = useRef<HTMLDivElement>(null)
  const info = KANJI_GROUPS.find((g) => g.id === group)!

  return (
    <div className="space-y-6">
      <header>
        <p className="text-lg font-medium text-red" lang="ja">
          漢字
        </p>
        <h1 className="h1">Kanji</h1>
        <p className="lead mt-2">
          Kanji are characters that carry meaning. Most have two kinds of reading: a native Japanese reading (kun), usually used when the kanji stands
          alone, and a Chinese-derived reading (on), usually used inside compound words. Learn each kanji together with a word that uses it.
        </p>
      </header>
      <AudioNotice />

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Kanji groups">
        {KANJI_GROUPS.map((g) => (
          <button
            key={g.id}
            type="button"
            role="tab"
            aria-selected={g.id === group}
            className={`tab ${g.id === group ? 'tab-on' : ''}`}
            onClick={() => {
              setGroup(g.id)
              setSelected(kanji.find((k) => k.group === g.id)!.char)
            }}
          >
            {g.title}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{info.blurb}</p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div ref={detailRef} className="scroll-mt-20 lg:sticky lg:top-20 lg:order-2">
          <Detail k={current} />
        </div>

        <div className="lg:order-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {list.map((k) => (
              <button
                key={k.char}
                type="button"
                onClick={() => {
                  setSelected(k.char)
                  if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ block: 'start' })
                }}
                aria-pressed={k.char === current.char}
                aria-label={`${k.char}, ${k.meaning}`}
                className={`card flex cursor-pointer flex-col items-center px-1 py-3 transition-colors hover:border-red ${
                  k.char === current.char ? '!border-red bg-red-soft' : ''
                }`}
              >
                <span className="text-4xl leading-tight font-medium" lang="ja">
                  {k.char}
                </span>
                <span className="mt-1 line-clamp-1 text-center text-sm text-muted">{k.meaning}</span>
              </button>
            ))}
          </div>

          <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="font-bold">Ready to test yourself?</h2>
              <p className="text-sm text-muted">A short quiz on {info.title.toLowerCase()}: meanings, readings and writing.</p>
            </div>
            <Link to={`/quizzes?set=kanji-${group}`} className="btn btn-primary">
              Start the quiz
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
