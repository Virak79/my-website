import { useState } from 'react'
import { speakingSets } from '../data/vocab.ts'
import { AudioButton, AudioNotice } from '../components/AudioButton.tsx'
import { SpeakCheck, SpeechCaveat } from '../components/SpeakCheck.tsx'

export function SpeakingPage() {
  const [id, setId] = useState(speakingSets[0].id)
  const [index, setIndex] = useState(0)
  const set = speakingSets.find((s) => s.id === id)!
  const item = set.items[index]

  return (
    <div className="space-y-6">
      <header>
        <p className="text-lg font-medium text-red" lang="ja">
          はなす
        </p>
        <h1 className="h1">Speaking practice</h1>
        <p className="lead mt-2">Listen to the phrase, say it aloud, then press Speak and say it into your microphone to see what was heard.</p>
      </header>
      <AudioNotice />

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Phrase sets">
        {speakingSets.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === id}
            className={`tab ${s.id === id ? 'tab-on' : ''}`}
            onClick={() => {
              setId(s.id)
              setIndex(0)
            }}
          >
            {s.title}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{set.blurb}</p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="card p-5 sm:p-6">
          <p className="label">
            Phrase {index + 1} of {set.items.length}
          </p>
          <p className="mt-3 text-3xl leading-snug font-bold sm:text-4xl" lang="ja">
            {item.jp}
          </p>
          {item.kana !== item.jp.replace(/[。、？！]/g, '') && (
            <p className="mt-2 text-lg text-muted" lang="ja">
              {item.kana}
            </p>
          )}
          <p className="mt-1 text-red">{item.romaji}</p>
          <p className="mt-1">{item.en}</p>

          <div className="mt-5 border-t border-line pt-4">
            <p className="label">1. Listen</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <AudioButton text={item.jp} label="Listen" />
              <AudioButton text={item.jp} slow label="Listen slowly" />
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <p className="label">2. Say it</p>
            <div className="mt-2">
              <SpeakCheck key={item.jp} expected={item} />
            </div>
          </div>

          <div className="mt-6 flex justify-between gap-2 border-t border-line pt-4">
            <button type="button" className="btn" onClick={() => setIndex((i) => i - 1)} disabled={index === 0}>
              ← Previous
            </button>
            <button type="button" className="btn" onClick={() => setIndex((i) => i + 1)} disabled={index === set.items.length - 1}>
              Next →
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold">How the check works</h2>
            <div className="mt-2">
              <SpeechCaveat />
            </div>
          </div>
          <div className="card p-5">
            <h2 className="font-bold">In this set</h2>
            <ol className="mt-2 space-y-1">
              {set.items.map((it, i) => (
                <li key={it.jp}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={i === index}
                    className={`min-h-11 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm ${i === index ? 'bg-red-soft text-red-dark' : 'hover:bg-line/50'}`}
                    lang="ja"
                  >
                    {it.jp}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </div>
  )
}
