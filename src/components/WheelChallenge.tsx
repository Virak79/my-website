import { useEffect, useState } from 'react'
import type { EntryInfo } from '../lib/wheel.ts'
import type { Result, Verdict } from '../lib/recognizer.ts'
import { sttSupported } from '../lib/speech.ts'
import type { SpeechMatch } from '../lib/speech.ts'
import { fullSize, hasStrokes } from '../data/strokes.ts'
import { AudioButton } from './AudioButton.tsx'
import { SpeakCheck, SpeechCaveat } from './SpeakCheck.tsx'
import { StrokeOrder } from './StrokeOrder.tsx'
import { WritingPad } from './WritingPad.tsx'

type Tone = 'good' | 'warn' | 'bad' | 'none'

const TONE: Record<Tone, string> = {
  good: 'border-green-700 bg-green-50 text-green-900',
  warn: 'border-amber-600 bg-amber-50 text-amber-900',
  bad: 'border-red bg-red-soft text-red-dark',
  none: 'border-line bg-paper text-ink',
}

interface Summary {
  tone: Tone
  label: string
  text: string
}

/** How the reading was judged: by the microphone check, or by the student after seeing the answer. */
type Reading = { by: 'mic' | 'self'; status: SpeechMatch } | null

function readingSummary(r: Reading): Summary {
  if (!r) return { tone: 'none', label: 'Not tried yet', text: 'Say it aloud, then check it with the microphone or show the answer.' }
  if (r.by === 'self') {
    return r.status === 'match'
      ? { tone: 'good', label: 'Correct (your own check)', text: 'You compared your reading with the answer and marked it right.' }
      : { tone: 'warn', label: 'Needs more practice (your own check)', text: 'Listen to the pronunciation again and repeat it a few times.' }
  }
  if (r.status === 'match') return { tone: 'good', label: 'Correct', text: 'The microphone check heard the expected reading.' }
  if (r.status === 'close') return { tone: 'warn', label: 'Almost', text: 'Most of it was recognised. Listen once more and say it a little more slowly.' }
  return {
    tone: 'warn',
    label: 'Needs improvement',
    text: 'A different sound was heard. Listen and try again. Very short sounds are sometimes misheard, so this can be the recogniser’s mistake.',
  }
}

const VERDICT: Record<Verdict, { tone: Tone; label: string }> = {
  correct: { tone: 'good', label: 'Correct' },
  improve: { tone: 'warn', label: 'Needs improvement' },
  incorrect: { tone: 'bad', label: 'Incorrect' },
  uncertain: { tone: 'none', label: 'Could not be evaluated' },
}

function writingSummary(chars: string[], results: (Result | undefined)[]): Summary {
  const checked = chars.filter((_, i) => results[i]).length
  if (checked === 0) return { tone: 'none', label: 'Not tried yet', text: 'Write it in the box, then press “Check my writing”.' }
  if (chars.length === 1) return { ...VERDICT[results[0]!.verdict], text: results[0]!.message }
  const worst = (['incorrect', 'improve', 'uncertain', 'correct'] as Verdict[]).find((v) => results.some((r) => r?.verdict === v))!
  const right = results.filter((r) => r?.verdict === 'correct').length
  const pending = checked < chars.length ? ` ${chars.length - checked} still to check.` : ''
  return { ...VERDICT[worst], text: `${right} of ${chars.length} characters correct.${pending}` }
}

interface Props {
  info: EntryInfo
  /** Called with true once both tasks have been attempted. */
  onComplete: (done: boolean) => void
  onSpinAgain: () => void
  onRetry: () => void
  onBack: () => void
  /** Why Spin Again is unavailable, if it is. */
  spinBlocked?: string
}

/** The two tasks for the entry the wheel chose, and how the student did. */
export function WheelChallenge({ info, onComplete, onSpinAgain, onRetry, onBack, spinBlocked }: Props) {
  const { chars } = info
  const [reading, setReading] = useState<Reading>(null)
  const [answer, setAnswer] = useState(false)
  const [readRound, setReadRound] = useState(0)
  const [pos, setPos] = useState(0)
  const [results, setResults] = useState<(Result | undefined)[]>([])
  const [order, setOrder] = useState(false)

  const char = chars[pos]
  const isWord = chars.length > 1
  const what = isWord ? 'entry' : 'character'
  const read = readingSummary(reading)
  const written = writingSummary(chars, results)
  const done = reading !== null && chars.every((_, i) => results[i])

  useEffect(() => onComplete(done), [done, onComplete])

  const showAnswer = () => {
    setAnswer(true)
    setOrder(true)
  }

  const answerBox = (
    <div className="rounded-lg border border-line bg-paper px-4 py-3">
      <p className="label">Answer</p>
      {info.reading ? (
        <p className="mt-1">
          <span className="text-2xl font-bold" lang="ja">
            {info.reading}
          </span>{' '}
          <span className="text-lg text-red">{info.romaji}</span>
          {info.meaning && <span className="text-muted"> · {info.meaning}</span>}
        </p>
      ) : (
        <p className="mt-1 text-sm">
          The lessons on this site do not include a reading for <span lang="ja">{info.text}</span>, so no romaji can be shown. Press Listen to hear
          how your browser reads it.
        </p>
      )}
      {info.note && <p className="mt-1 text-sm text-muted">{info.note}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <section className="card p-5" aria-labelledby="task-read">
          <p className="label">Task A</p>
          <h3 id="task-read" className="h2">
            Read it aloud
          </h3>
          <p className="mt-1 text-sm text-muted">
            Say <span lang="ja">{info.text}</span> out loud before you listen.
            {sttSupported && ' Then press Speak and say it into your microphone.'}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <AudioButton text={info.say} label="Listen to pronunciation" />
            <AudioButton text={info.say} slow label="Slowly" />
          </div>

          <div className="mt-4">
            <SpeakCheck
              key={readRound}
              expected={info.entry}
              onResult={(status) => {
                setReading({ by: 'mic', status })
                setAnswer(true)
              }}
            />
          </div>
          {sttSupported && !info.reading && (
            <p className="mt-2 text-sm text-muted">Without a stored reading, the microphone check can only compare with the written form.</p>
          )}

          <div className="mt-4 space-y-3">
            {answer && answerBox}
            {answer && reading?.by !== 'mic' && (
              <div>
                <p className="text-sm">Did you read it correctly?</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`btn ${reading?.status === 'match' ? 'btn-on' : ''}`}
                    aria-pressed={reading?.status === 'match'}
                    onClick={() => setReading({ by: 'self', status: 'match' })}
                  >
                    Yes, I got it
                  </button>
                  <button
                    type="button"
                    className={`btn ${reading?.status === 'different' ? 'btn-on' : ''}`}
                    aria-pressed={reading?.status === 'different'}
                    onClick={() => setReading({ by: 'self', status: 'different' })}
                  >
                    Not yet
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn" onClick={() => setAnswer((v) => !v)} aria-expanded={answer}>
                {answer ? 'Hide answer' : 'Show answer'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setReading(null)
                  setAnswer(false)
                  setReadRound((r) => r + 1)
                }}
              >
                Practice again
              </button>
            </div>
          </div>

          {sttSupported && (
            <details className="mt-4 text-sm text-muted">
              <summary className="cursor-pointer font-medium text-ink">How the microphone check works</summary>
              <div className="mt-2">
                <SpeechCaveat />
              </div>
            </details>
          )}
        </section>

        <section className="card p-5" aria-labelledby="task-write">
          <p className="label">Task B</p>
          <h3 id="task-write" className="h2">
            Write it
          </h3>
          <p className="mt-1 text-sm text-muted">
            Write <span lang="ja">{isWord ? info.text : char}</span> in the grid with your mouse, trackpad or finger
            {isWord ? ', one character at a time.' : '.'}
          </p>

          {isWord && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chars.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  lang="ja"
                  onClick={() => setPos(i)}
                  aria-current={i === pos}
                  aria-label={`Character ${i + 1}: ${c}${results[i] ? `, ${VERDICT[results[i]!.verdict].label}` : ''}`}
                  className={`h-12 w-12 cursor-pointer rounded-lg border-2 text-2xl font-medium ${i === pos ? 'border-red' : 'border-line'} ${
                    results[i]?.verdict === 'correct' ? 'bg-green-50 text-green-900' : 'bg-card'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {!hasStrokes(fullSize(char)) && (
            <p className="mt-3 rounded-lg border border-line bg-paper px-4 py-3 text-sm">
              There is no stroke data for <span lang="ja">{char}</span>, so your writing cannot be checked reliably. Show the reference and compare it
              with your own writing by eye.
            </p>
          )}

          <div className="mt-3">
            <WritingPad key={pos} char={char} guide={false} onResult={(r) => setResults((all) => Object.assign([...all], { [pos]: r }))} />
          </div>

          <div className="mt-1 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => setOrder((v) => !v)} aria-expanded={order}>
              {order ? 'Hide stroke order' : 'Show stroke order'}
            </button>
            {isWord && pos < chars.length - 1 && results[pos] && (
              <button type="button" className="btn btn-primary" onClick={() => setPos(pos + 1)}>
                Next character →
              </button>
            )}
          </div>
          {order && (
            <div className="mt-3">
              <p className="label">The correct character</p>
              <StrokeOrder char={fullSize(char)} className="mt-2 max-w-48" controls={hasStrokes(fullSize(char))} />
            </div>
          )}
        </section>
      </div>

      <section className="card p-5" aria-labelledby="wheel-result">
        <h3 id="wheel-result" className="h2">
          Your result
        </h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr] sm:gap-x-5">
          <dt className="label sm:pt-1">Selected {what}</dt>
          <dd className="text-2xl leading-tight font-bold" lang="ja">
            {info.text}
          </dd>
          {(
            [
              ['Reading', read],
              ['Writing', written],
            ] as [string, Summary][]
          ).map(([name, s]) => (
            <div key={name} className="contents">
              <dt className="label sm:pt-3">{name}</dt>
              <dd className={`rounded-lg border px-4 py-2 text-sm ${TONE[s.tone]}`}>
                <p className="font-bold">{s.label}</p>
                <p>{s.text}</p>
              </dd>
            </div>
          ))}
        </dl>
        {answer && <div className="mt-4">{answerBox}</div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={onSpinAgain} disabled={Boolean(spinBlocked)}>
            Spin again
          </button>
          <button type="button" className="btn" onClick={onRetry}>
            Try this {what} again
          </button>
          <button type="button" className="btn" onClick={showAnswer} disabled={answer && order}>
            Show answer
          </button>
          <button type="button" className="btn" onClick={onBack}>
            Back to wheel
          </button>
        </div>
        {spinBlocked && <p className="mt-2 text-sm text-muted">{spinBlocked}</p>}
      </section>
    </div>
  )
}
