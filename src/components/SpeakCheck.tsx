import { useEffect, useRef, useState } from 'react'
import { compareSpeech, listen, sttMessage, sttSupported } from '../lib/speech.ts'
import type { SpeechMatch, SttError } from '../lib/speech.ts'
import type { Entry } from '../data/vocab.ts'

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  )
}

const VERDICT: Record<SpeechMatch, { box: string; title: string; text: string }> = {
  match: {
    box: 'border-green-700 bg-green-50 text-green-900',
    title: 'The words match',
    text: 'The recogniser heard the same words as the target.',
  },
  close: {
    box: 'border-amber-600 bg-amber-50 text-amber-900',
    title: 'Almost',
    text: 'Most of it was recognised, but part of it was heard differently. Listen again and repeat it a little more slowly.',
  },
  different: {
    box: 'border-red bg-red-soft text-red-dark',
    title: 'Different words were heard',
    text: 'The recogniser heard something else. Listen to the model, then try again, speaking clearly and close to the microphone.',
  },
}

interface Props {
  expected: Entry
  onResult?: (status: SpeechMatch) => void
}

/** Microphone button plus a side-by-side comparison of what was expected and what was heard. */
export function SpeakCheck({ expected, onResult }: Props) {
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState<{ status: SpeechMatch; shown: string } | null>(null)
  const [error, setError] = useState<SttError | null>(null)
  const stop = useRef<(() => void) | null>(null)

  useEffect(() => () => stop.current?.(), [])

  if (!sttSupported) {
    return (
      <p className="rounded-lg border border-line bg-paper px-4 py-3 text-sm text-muted">
        Speech recognition is not available in this browser, so your speaking cannot be checked here. You can still listen and repeat aloud. To use
        the microphone check, open this site in Chrome, Edge or Safari.
      </p>
    )
  }

  const start = () => {
    if (listening) {
      stop.current?.()
      return
    }
    setError(null)
    setHeard(null)
    setListening(true)
    stop.current = listen({
      onResult: (alts) => {
        const r = compareSpeech(alts, expected)
        setHeard(r)
        onResult?.(r.status)
      },
      onError: setError,
      onEnd: () => setListening(false),
    })
  }

  return (
    <div>
      <button type="button" className={`btn ${listening ? 'btn-on' : 'btn-primary'}`} onClick={start} aria-pressed={listening}>
        <MicIcon />
        {listening ? 'Listening… tap to stop' : heard || error ? 'Try again' : 'Speak'}
      </button>
      <div className="mt-3" role="status" aria-live="polite">
        {error && <p className="rounded-lg border border-line bg-paper px-4 py-3 text-sm">{sttMessage(error)}</p>}
        {heard && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${VERDICT[heard.status].box}`}>
            <p className="font-bold">{VERDICT[heard.status].title}</p>
            <dl className="my-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-base">
              <dt className="text-sm opacity-75">Expected</dt>
              <dd lang="ja">{expected.jp}</dd>
              <dt className="text-sm opacity-75">Heard</dt>
              <dd lang="ja">{heard.shown}</dd>
            </dl>
            <p>{VERDICT[heard.status].text}</p>
          </div>
        )}
      </div>
    </div>
  )
}

/** The standing explanation of what the microphone check can and cannot tell you. */
export function SpeechCaveat() {
  return (
    <p className="text-sm text-muted">
      The microphone check compares the <strong>words</strong> your browser's speech recogniser heard with the target. It does not grade each sound,
      so a match does not prove perfect pronunciation, and a miss is sometimes the recogniser's mistake. Kanji, kana and digits for the same words
      are treated as equal.
    </p>
  )
}
