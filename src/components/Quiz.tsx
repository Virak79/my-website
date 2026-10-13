import { useEffect, useMemo, useState } from 'react'
import { saveScore } from '../lib/quiz.ts'
import type { Question, QuizSet } from '../lib/quiz.ts'
import { speak } from '../lib/speech.ts'
import { AudioButton } from './AudioButton.tsx'
import { SpeakCheck, SpeechCaveat } from './SpeakCheck.tsx'
import { StrokeOrder } from './StrokeOrder.tsx'
import { WritingPad } from './WritingPad.tsx'

type Done = (correct: boolean) => void

function Choice({ q, done, onDone }: { q: Extract<Question, { kind: 'choice' }>; done: boolean; onDone: Done }) {
  const [picked, setPicked] = useState<number | null>(null)

  useEffect(() => {
    if (q.audio) speak(q.audio)
  }, [q])

  return (
    <div>
      {q.audio && (
        <div className="mb-5 flex flex-wrap gap-2">
          <AudioButton text={q.audio} label="Play sound" className="btn-primary" />
          <AudioButton text={q.audio} slow label="Slowly" />
        </div>
      )}
      {q.prompt && (
        <p className={`mb-5 font-bold ${q.promptJa ? (q.prompt.length > 6 ? 'text-3xl' : 'text-6xl') : 'text-2xl'}`} lang={q.promptJa ? 'ja' : undefined}>
          {q.prompt}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        {q.options.map((o, i) => {
          const state = !done ? '' : i === q.answer ? '!border-green-700 !bg-green-50 !text-green-900' : i === picked ? '!border-red !bg-red-soft !text-red-dark' : 'opacity-60'
          return (
            <button
              key={o.label}
              type="button"
              disabled={done}
              onClick={() => {
                setPicked(i)
                onDone(i === q.answer)
              }}
              lang={o.ja ? 'ja' : undefined}
              className={`btn !min-h-14 !justify-start text-left disabled:!cursor-default disabled:!opacity-100 ${o.ja ? '!text-2xl' : '!text-base'} ${state}`}
            >
              {o.label}
              {done && i === q.answer && <span className="ml-auto text-sm font-bold">✓ Correct answer</span>}
              {done && i === picked && i !== q.answer && <span className="ml-auto text-sm font-bold">✕ Your answer</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Match({ q, done, onDone }: { q: Extract<Question, { kind: 'match' }>; done: boolean; onDone: Done }) {
  const [left, setLeft] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [wrong, setWrong] = useState<[string, string] | null>(null)
  const [mistakes, setMistakes] = useState(0)

  const pickRight = (right: string) => {
    if (!left) return
    const pair = q.pairs.find((p) => p.left === left)!
    if (pair.right === right) {
      const next = [...matched, left]
      setMatched(next)
      setWrong(null)
      setLeft(null)
      if (next.length === q.pairs.length) onDone(mistakes === 0)
    } else {
      setWrong([left, right])
      setMistakes((m) => m + 1)
    }
  }
  const rightDone = (right: string) => matched.some((l) => q.pairs.find((p) => p.left === l)!.right === right)
  const ok = '!border-green-700 !bg-green-50 !text-green-900'

  return (
    <div>
      <p className="mb-3 text-sm text-muted">Tap an item on the left, then its partner on the right.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          {q.pairs.map((p) => (
            <button
              key={p.left}
              type="button"
              lang={q.leftJa ? 'ja' : undefined}
              disabled={done || matched.includes(p.left)}
              onClick={() => {
                setLeft(p.left)
                setWrong(null)
              }}
              aria-pressed={left === p.left}
              className={`btn !min-h-14 disabled:!opacity-100 ${q.leftJa ? '!text-2xl' : ''} ${matched.includes(p.left) ? ok : left === p.left ? (wrong ? '!border-red !bg-red-soft' : '!border-ink !bg-line/60') : ''}`}
            >
              {p.left}
            </button>
          ))}
        </div>
        <div className="grid gap-2">
          {q.rightOrder.map((r) => (
            <button
              key={r}
              type="button"
              disabled={done || rightDone(r) || !left}
              onClick={() => pickRight(r)}
              className={`btn !min-h-14 disabled:!opacity-100 ${rightDone(r) ? ok : wrong?.[1] === r ? '!border-red !bg-red-soft' : ''}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {!done && wrong && <p className="mt-3 text-sm text-red-dark" role="status">Not a pair. Try another.</p>}
      {!done && (
        <button type="button" className="btn mt-4" onClick={() => onDone(false)}>
          Show the answers
        </button>
      )}
      {done && (
        <ul className="mt-4 grid gap-1 text-sm sm:grid-cols-2">
          {q.pairs.map((p) => (
            <li key={p.left}>
              <span className="text-lg font-medium" lang={q.leftJa ? 'ja' : undefined}>
                {p.left}
              </span>{' '}
              = {p.right}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Write({ q, done, onDone }: { q: Extract<Question, { kind: 'write' }>; done: boolean; onDone: Done }) {
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_14rem]">
      <div>
        <WritingPad char={q.char} guide={false} lockGuide onResult={(r) => !done && r.verdict === 'correct' && onDone(true)} />
        {!done && (
          <button type="button" className="btn mt-1" onClick={() => onDone(false)}>
            I don't know. Show the answer
          </button>
        )}
      </div>
      {done && (
        <div>
          <p className="label">Answer</p>
          <StrokeOrder char={q.char} className="mt-2 max-w-56" />
        </div>
      )}
    </div>
  )
}

function Speak({ q, done, onDone }: { q: Extract<Question, { kind: 'speak' }>; done: boolean; onDone: Done }) {
  return (
    <div>
      <p className="text-3xl leading-snug font-bold" lang="ja">
        {q.entry.jp}
      </p>
      <p className="mt-1 text-red">{q.entry.romaji}</p>
      <div className="my-4 flex flex-wrap gap-2">
        <AudioButton text={q.entry.jp} label="Listen" />
        <AudioButton text={q.entry.jp} slow label="Slowly" />
      </div>
      <SpeakCheck expected={q.entry} onResult={(s) => !done && s === 'match' && onDone(true)} />
      {!done && (
        <button type="button" className="btn mt-3" onClick={() => onDone(false)}>
          Skip this question
        </button>
      )}
      <div className="mt-4">
        <SpeechCaveat />
      </div>
    </div>
  )
}

export function Quiz({ set, onExit }: { set: QuizSet; onExit: () => void }) {
  const [run, setRun] = useState(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => set.build(), [set, run])
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<boolean | null>(null)
  const [score, setScore] = useState(0)
  const total = questions.length
  const finished = index >= total

  useEffect(() => {
    if (finished) saveScore(set.id, score, total)
  }, [finished, set.id, score, total])

  if (finished) {
    const pct = score / total
    return (
      <section className="card mx-auto max-w-xl p-6 text-center sm:p-8">
        <p className="label">
          {set.section} · {set.title}
        </p>
        <p className="mt-3 text-6xl font-bold text-red">
          {score} / {total}
        </p>
        <p className="mt-3 text-lg">
          {pct === 1 ? 'Perfect. You know this lesson well.' : pct >= 0.7 ? 'Good work. Review the ones you missed and try again.' : 'Keep practising. Go back to the lesson, then try the quiz again.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setRun((r) => r + 1)
              setIndex(0)
              setScore(0)
              setResult(null)
            }}
          >
            Try again with new questions
          </button>
          <button type="button" className="btn" onClick={onExit}>
            All quizzes
          </button>
        </div>
      </section>
    )
  }

  const q = questions[index]
  const done = result !== null
  const onDone: Done = (correct) => {
    if (done) return
    setResult(correct)
    if (correct) setScore((s) => s + 1)
  }
  const key = `${run}-${index}`

  return (
    <section className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <p className="label">
          {set.section} · {set.title}
        </p>
        <button type="button" className="min-h-11 cursor-pointer px-2 text-sm text-muted underline" onClick={onExit}>
          Leave quiz
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index}>
          <div className="h-full bg-red" style={{ width: `${(index / total) * 100}%` }} />
        </div>
        <span className="text-sm text-muted">
          {index + 1} / {total}
        </span>
      </div>

      <div className="card mt-4 p-5 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{q.title}</h2>
        {q.kind === 'choice' && <Choice key={key} q={q} done={done} onDone={onDone} />}
        {q.kind === 'match' && <Match key={key} q={q} done={done} onDone={onDone} />}
        {q.kind === 'write' && <Write key={key} q={q} done={done} onDone={onDone} />}
        {q.kind === 'speak' && <Speak key={key} q={q} done={done} onDone={onDone} />}

        {done && (
          <div className={`mt-5 rounded-lg border px-4 py-3 ${result ? 'border-green-700 bg-green-50 text-green-900' : 'border-red bg-red-soft text-red-dark'}`} role="status">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{result ? 'Correct' : 'Not quite'}</p>
                <p className="text-sm">{q.explain}</p>
              </div>
              {q.kind === 'choice' && q.say && <AudioButton text={q.say} />}
            </div>
          </div>
        )}
        {done && (
          <button
            type="button"
            className="btn btn-primary mt-4 w-full sm:w-auto"
            autoFocus
            onClick={() => {
              setIndex((i) => i + 1)
              setResult(null)
            }}
          >
            {index + 1 === total ? 'See my score' : 'Next question →'}
          </button>
        )}
      </div>
    </section>
  )
}
