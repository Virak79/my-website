import { Link } from 'react-router-dom'

const STEPS = [
  { n: '1', to: '/hiragana', jp: 'あ', title: 'Hiragana', text: 'The 46 basic sounds of Japanese. Start here.' },
  { n: '2', to: '/katakana', jp: 'ア', title: 'Katakana', text: 'The same sounds, used for foreign words and names.' },
  { n: '3', to: '/kanji', jp: '日', title: 'Kanji', text: 'Your first 66 characters: numbers, days, people and things.' },
  { n: '4', to: '/vocabulary', jp: '言葉', title: 'Vocabulary', text: 'Everyday words and sentences in eight topics.' },
]

const PRACTICE = [
  { to: '/writing', jp: '書く', title: 'Writing practice', text: 'Draw characters with your mouse or finger and have each stroke checked.' },
  { to: '/speaking', jp: '話す', title: 'Speaking practice', text: 'Listen, repeat into the microphone, and see what was heard.' },
  { to: '/quizzes', jp: '試す', title: 'Quizzes', text: 'Short quizzes for reading, listening, writing and speaking.' },
  { to: '/wheel', jp: '回す', title: 'Learning wheel', text: 'Spin for a random character, then read it aloud and write it.' },
]

export function Home() {
  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 pt-4 md:grid-cols-[1fr_auto]">
        <div>
          <p className="label">Japanese from zero</p>
          <h1 className="mt-2 text-4xl leading-tight font-bold tracking-tight sm:text-5xl">
            Learn to read, write and speak Japanese, one character at a time.
          </h1>
          <p className="lead mt-4 text-lg">
            No experience needed. Begin with a single sound, hear it, write it, and build up to real words and sentences. Free, with no account.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/hiragana" className="btn btn-primary !min-h-12 !px-6 !text-base">
              Start learning
            </Link>
            <Link to="/quizzes" className="btn !min-h-12 !px-6 !text-base">
              Take a quiz
            </Link>
          </div>
        </div>
        <div className="card hidden h-56 w-56 items-center justify-center md:flex" aria-hidden="true">
          <span className="text-[7.5rem] leading-none font-bold text-red" lang="ja">
            あ
          </span>
        </div>
      </section>

      <section>
        <h2 className="h2">Follow the path</h2>
        <p className="lead mt-1">Japanese uses three writing systems together. Learn them in this order.</p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <li key={s.to}>
              <Link to={s.to} className="card block h-full p-5 transition-colors hover:border-red">
                <div className="flex items-start justify-between">
                  <span className="label">Step {s.n}</span>
                  <span className="text-4xl font-bold" lang="ja">
                    {s.jp}
                  </span>
                </div>
                <h3 className="mt-3 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.text}</p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="h2">Practise as you go</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PRACTICE.map((s) => (
            <Link key={s.to} to={s.to} className="card block p-5 transition-colors hover:border-red">
              <span className="text-2xl font-bold text-red" lang="ja">
                {s.jp}
              </span>
              <h3 className="mt-2 font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted">{s.text}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card p-5 text-sm text-muted">
        <h2 className="font-bold text-ink">Before you start</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Audio and the microphone check work best in Chrome, Edge or Safari. The microphone check needs your permission and, in most browsers, sends your speech to the browser maker's recognition service.</li>
          <li>Handwriting is checked on your device by comparing your strokes with reference stroke data. Nothing you draw is uploaded.</li>
          <li>Quiz scores are saved only in this browser.</li>
        </ul>
      </section>
    </div>
  )
}
