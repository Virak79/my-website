import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { bestScores, quizSets } from '../lib/quiz.ts'
import { Quiz } from '../components/Quiz.tsx'

const SECTIONS = ['Hiragana', 'Katakana', 'Kanji', 'Vocabulary']

export function QuizzesPage() {
  const [params, setParams] = useSearchParams()
  const active = quizSets.find((s) => s.id === params.get('set'))
  // Re-read saved scores whenever the list is shown again.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const best = useMemo(() => bestScores(), [active])

  if (active) return <Quiz key={active.id} set={active} onExit={() => setParams({})} />

  return (
    <div className="space-y-8">
      <header>
        <p className="text-lg font-medium text-red" lang="ja">
          クイズ
        </p>
        <h1 className="h1">Quizzes</h1>
        <p className="lead mt-2">
          Each quiz has about ten questions and takes a few minutes: identify characters, match pairs, choose meanings, listen, write and speak. You
          see the correct answer and a short explanation after every question.
        </p>
      </header>

      {SECTIONS.map((section) => (
        <section key={section}>
          <h2 className="h2">{section}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quizSets
              .filter((s) => s.section === section)
              .map((s) => (
                <button key={s.id} type="button" onClick={() => setParams({ set: s.id })} className="card flex cursor-pointer items-center justify-between gap-3 p-4 text-left transition-colors hover:border-red">
                  <span className="font-medium">{s.title}</span>
                  <span className={`shrink-0 text-sm ${best[s.id] ? 'font-bold text-red' : 'text-muted'}`}>
                    {best[s.id] ? `Best ${best[s.id].score}/${best[s.id].total}` : 'Not taken'}
                  </span>
                </button>
              ))}
          </div>
        </section>
      ))}
    </div>
  )
}
