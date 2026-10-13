import { useState } from 'react'
import { Link } from 'react-router-dom'
import { topics } from '../data/vocab.ts'
import type { Entry } from '../data/vocab.ts'
import { AudioButton, AudioNotice } from '../components/AudioButton.tsx'

function Row({ e, big = false }: { e: Entry; big?: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className={`font-medium ${big ? 'text-xl' : 'text-2xl'}`} lang="ja">
          {e.jp}
        </p>
        <p className="text-sm text-muted">
          {e.kana !== e.jp.replace(/[。、？！]/g, '') && (
            <>
              <span lang="ja">{e.kana}</span> ·{' '}
            </>
          )}
          {e.romaji}
        </p>
        <p className="mt-0.5">{e.en}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <AudioButton text={e.jp} />
        {big && <AudioButton text={e.jp} slow label="Slow" className="hidden sm:inline-flex" />}
      </div>
    </li>
  )
}

export function VocabularyPage() {
  const [id, setId] = useState(topics[0].id)
  const topic = topics.find((t) => t.id === id)!

  return (
    <div className="space-y-6">
      <header>
        <p className="text-lg font-medium text-red" lang="ja">
          ことば
        </p>
        <h1 className="h1">Vocabulary</h1>
        <p className="lead mt-2">
          Useful words and sentences in eight everyday topics. Each one shows the Japanese writing, its reading in kana, romaji and the English
          meaning. Press the speaker to hear it.
        </p>
      </header>
      <AudioNotice />

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Topics">
        {topics.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === id} className={`tab ${t.id === id ? 'tab-on' : ''}`} onClick={() => setId(t.id)}>
            {t.title}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{topic.blurb}</p>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section>
          <h2 className="h2">Words</h2>
          <ul className="card mt-3 divide-y divide-line">
            {topic.words.map((w) => (
              <Row key={w.jp} e={w} />
            ))}
          </ul>
        </section>

        <section>
          <h2 className="h2">Example sentences</h2>
          <ul className="card mt-3 divide-y divide-line">
            {topic.sentences.map((s) => (
              <Row key={s.jp} e={s} big />
            ))}
          </ul>

          <div className="card mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="font-bold">Ready to test yourself?</h2>
              <p className="text-sm text-muted">A short quiz on {topic.title.toLowerCase()}.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/speaking" className="btn">
                Practise speaking
              </Link>
              <Link to={`/quizzes?set=vocab-${topic.id}`} className="btn btn-primary">
                Start the quiz
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
