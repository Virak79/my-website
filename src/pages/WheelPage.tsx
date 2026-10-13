import { useEffect, useMemo, useRef, useState } from 'react'
import { hiragana, katakana } from '../data/kana.ts'
import { kanji } from '../data/kanji.ts'
import { AudioNotice } from '../components/AudioButton.tsx'
import { Wheel } from '../components/Wheel.tsx'
import { WheelChallenge } from '../components/WheelChallenge.tsx'
import {
  MAX_ENTRIES,
  MAX_ENTRY_LENGTH,
  MAX_NAME_LENGTH,
  addEntry,
  clearWheel,
  cryptoRng,
  deleteSaved,
  describeEntry,
  duplicateSaved,
  entriesFor,
  hasUnsavedChanges,
  indexAtPointer,
  loadWheel,
  openSaved,
  persistWheel,
  pickIndex,
  planSpin,
  removeEntry,
  renameSaved,
  restoreDefaults,
  saveAs,
  shuffleWheel,
  updateSaved,
} from '../lib/wheel.ts'
import type { EntryError, WheelMode, WheelState } from '../lib/wheel.ts'

const MODES: { id: WheelMode; title: string; blurb: string }[] = [
  { id: 'hiragana', title: 'Hiragana', blurb: 'Only the hiragana you have chosen.' },
  { id: 'katakana', title: 'Katakana', blurb: 'Only the katakana you have chosen.' },
  { id: 'kanji', title: 'Kanji', blurb: 'Only the kanji you have chosen.' },
  { id: 'mixed', title: 'Mixed', blurb: 'Your hiragana, katakana and kanji together on one wheel.' },
  { id: 'custom', title: 'Custom', blurb: 'Only what you add yourself: characters, words or short phrases.' },
]

const single = (list: typeof hiragana) => list.filter((k) => k.group !== 'combined').map((k) => k.char)

/** The characters offered for quick picking in each script mode. */
const CHART: Partial<Record<WheelMode, string[]>> = {
  hiragana: single(hiragana),
  katakana: single(katakana),
  kanji: kanji.map((k) => k.char),
}

const SPIN_MS = 4800
const BURST = ['#bc002d', '#f6c453', '#1f6f78', '#2f4b7c', '#f29e7a']

function errorText(error: EntryError, text: string, mode: WheelMode): string {
  switch (error) {
    case 'empty':
      return 'Type a character or word first.'
    case 'too-long':
      return `Keep each entry to ${MAX_ENTRY_LENGTH} characters or fewer.`
    case 'not-japanese':
      return 'An entry needs at least one Japanese character (hiragana, katakana or kanji).'
    case 'duplicate':
      return `${text} is already on the wheel.`
    case 'full':
      return `The wheel is full (${MAX_ENTRIES} entries). Remove one first.`
    case 'wrong-script':
      return mode === 'mixed'
        ? 'Entries that mix hiragana and katakana belong in Custom mode.'
        : `${MODES.find((m) => m.id === mode)!.title} mode only takes ${mode}. Switch to Custom mode to add anything you like.`
  }
}

const newId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export function WheelPage() {
  const [state, setState] = useState(loadWheel)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [duration, setDuration] = useState(SPIN_MS)
  const [spins, setSpins] = useState(0)
  /** The segment the wheel stopped on, until the wheel changes. */
  const [winner, setWinner] = useState<number | null>(null)
  /** The entry being practised, and how many times it has been restarted. */
  const [selected, setSelected] = useState<{ text: string; round: number } | null>(null)
  const [complete, setComplete] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [undo, setUndo] = useState<{ state: WheelState; label: string } | null>(null)
  const [picker, setPicker] = useState(false)
  const [name, setName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const wheelRef = useRef<HTMLDivElement>(null)
  const challengeRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  const entries = useMemo(() => entriesFor(state), [state])
  const info = useMemo(() => (selected ? describeEntry(selected.text) : null), [selected])
  const mode = MODES.find((m) => m.id === state.mode)!
  const chart = CHART[state.mode]
  const open = state.saved.find((w) => w.id === state.openId)
  const locked = state.requireBoth && selected !== null && !complete
  const lockedText = locked ? 'Finish the reading and writing tasks before spinning again, or turn that setting off.' : undefined

  useEffect(() => persistWheel(state), [state])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  // On a short screen the chosen character can land below the fold; bring it into view.
  useEffect(() => {
    if (spins > 0) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [spins])

  /** Change what is on the wheel. Nothing may change while it is spinning. */
  const change = (next: WheelState, undoLabel?: string) => {
    if (spinning || next === state) return
    setUndo(undoLabel ? { state, label: undoLabel } : null)
    setState(next)
    setWinner(null)
    setError(null)
  }

  const setting = (patch: Partial<WheelState>) => !spinning && setState((s) => ({ ...s, ...patch }))

  const add = (raw: string) => {
    const r = addEntry(state, raw)
    if (r.error) {
      setError(errorText(r.error, r.text, state.mode))
      return
    }
    change(r.state)
    setDraft('')
  }

  const spin = () => {
    if (spinning || locked || entries.length === 0) return
    const onWheel = entries
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const ms = calm ? 500 : SPIN_MS
    const plan = planSpin(rotation, onWheel.length, cryptoRng, calm ? 1 : 5 + pickIndex(3))
    setDuration(ms)
    setRotation(plan.rotation)
    setSpinning(true)
    setWinner(null)
    setSelected(null)
    setComplete(false)
    setError(null)
    setUndo(null)
    wheelRef.current?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' })
    timer.current = window.setTimeout(() => {
      // Read the result off the wheel itself, so what is shown is always what the pointer is on.
      const index = indexAtPointer(plan.rotation, onWheel.length)
      setSpinning(false)
      setWinner(index)
      setSelected({ text: onWheel[index], round: 0 })
      setSpins((n) => n + 1)
    }, ms + 80)
  }

  const save = () => {
    if (entries.length === 0) return setSaveError('Add some characters to the wheel before saving it.')
    if (!name.trim()) return setSaveError('Give the wheel a name first.')
    change(saveAs(state, name, newId()))
    setName('')
    setSaveError(null)
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-lg font-medium text-red" lang="ja">
          まわす
        </p>
        <h1 className="h1">Japanese Learning Wheel</h1>
        <p className="lead mt-2">Spin the wheel to pick a character at random, then read it aloud and write it. Put any characters you like on the wheel.</p>
      </header>
      <AudioNotice />

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Wheel mode">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === state.mode}
            className={`tab ${m.id === state.mode ? 'tab-on' : ''}`}
            disabled={spinning}
            onClick={() => {
              if (m.id === state.mode) return
              change({ ...state, mode: m.id })
              setPicker(false)
              // The challenge belongs to the wheel it was spun on.
              setSelected(null)
              setComplete(false)
            }}
          >
            {m.title}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">
        {mode.blurb}
        {state.mode === 'custom' && open && (
          <>
            {' '}
            Open wheel: <strong className="text-ink">{open.name}</strong>.
          </>
        )}
      </p>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <section ref={wheelRef} className="card scroll-mt-24 p-5 sm:p-6" aria-label="Spinning wheel">
            <Wheel entries={entries} rotation={rotation} spinning={spinning} duration={duration} winner={winner} />

            <div className="mt-5 text-center">
              <button
                type="button"
                className="btn btn-primary !min-h-14 !rounded-full !px-12 !text-xl font-bold tracking-widest"
                onClick={spin}
                disabled={spinning || locked || entries.length === 0}
              >
                SPIN
              </button>
              {lockedText && !spinning && <p className="mt-2 text-sm text-muted">{lockedText}</p>}
            </div>

            {entries.length === 0 && (
              <div className="mt-5 rounded-lg border border-amber-600 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
                <p className="font-bold">The wheel is empty</p>
                <p>
                  Add at least one character to spin
                  {state.mode === 'custom' ? ', or open one of your saved wheels.' : ', or restore the default list.'}
                </p>
                {state.mode !== 'custom' && (
                  <button type="button" className="btn mt-2" onClick={() => change(restoreDefaults(state))}>
                    Restore defaults
                  </button>
                )}
              </div>
            )}

            <div ref={resultRef} className="mt-5 scroll-mb-6 text-center" role="status" aria-live="polite">
              {spinning && <p className="text-muted">Spinning…</p>}
              {!spinning && !selected && entries.length > 0 && <p className="text-sm text-muted">Press SPIN to pick one at random.</p>}
              {!spinning && selected && winner === null && (
                <p className="text-sm text-muted">
                  The wheel has changed since it chose <span lang="ja">{selected.text}</span>. Your challenge is still open below.
                </p>
              )}
              {!spinning && selected && winner !== null && (
                <div key={spins} className="relative mx-auto w-fit max-w-full px-6">
                  <div className="wheel-burst" aria-hidden="true">
                    {Array.from({ length: 14 }, (_, i) => (
                      <span key={i} style={{ '--a': `${i * (360 / 14)}deg`, '--c': BURST[i % BURST.length] } as React.CSSProperties} />
                    ))}
                  </div>
                  <p className="label">The wheel chose</p>
                  <p className={`wheel-pop leading-tight font-bold break-words ${[...selected.text].length > 3 ? 'text-4xl sm:text-5xl' : 'text-7xl sm:text-8xl'}`} lang="ja">
                    {selected.text}
                  </p>
                  <button type="button" className="btn mt-3" onClick={() => challengeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                    Start the challenge ↓
                  </button>
                </div>
              )}
            </div>
          </section>

          {info && selected && !spinning && (
            <div ref={challengeRef} className="scroll-mt-24">
              <h2 className="h2 mb-3">
                Your challenge: <span lang="ja">{info.text}</span>
              </h2>
              <WheelChallenge
                key={`${spins}-${selected.round}`}
                info={info}
                onComplete={setComplete}
                onSpinAgain={spin}
                onRetry={() => {
                  setSelected({ ...selected, round: selected.round + 1 })
                  challengeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                onBack={() => {
                  setSelected(null)
                  setComplete(false)
                  wheelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                spinBlocked={entries.length === 0 ? 'The wheel is empty. Add a character to spin again.' : lockedText}
              />
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <fieldset className="card min-w-0 p-5" disabled={spinning}>
            <legend className="sr-only">Characters on the wheel</legend>
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="font-bold">On the wheel</h2>
              <span className="text-sm text-muted">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>

            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault()
                add(draft)
              }}
            >
              <label htmlFor="wheel-add" className="label">
                Add a character, word or short phrase
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="wheel-add"
                  lang="ja"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-card px-3 text-lg text-ink disabled:opacity-45"
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value)
                    setError(null)
                  }}
                  // Enter that confirms a Japanese keyboard conversion must not submit the form.
                  onKeyDown={(e) => e.key === 'Enter' && e.nativeEvent.isComposing && e.preventDefault()}
                  placeholder={state.mode === 'katakana' ? 'ア' : state.mode === 'kanji' ? '日' : 'あ'}
                  autoComplete="off"
                  aria-describedby={error ? 'wheel-add-error' : undefined}
                  aria-invalid={Boolean(error)}
                />
                <button type="submit" className="btn btn-primary">
                  Add
                </button>
              </div>
              {error && (
                <p id="wheel-add-error" className="mt-2 rounded-lg border border-red bg-red-soft px-3 py-2 text-sm text-red-dark" role="alert">
                  {error}
                </p>
              )}
            </form>

            {chart && (
              <div className="mt-3">
                <button type="button" className="btn w-full" onClick={() => setPicker((v) => !v)} aria-expanded={picker}>
                  {picker ? 'Hide the chart' : `Pick from the ${state.mode} chart`}
                </button>
                {picker && (
                  <div className="mt-2 flex max-h-56 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line p-2">
                    {chart.map((c) => {
                      const on = entries.includes(c)
                      return (
                        <button
                          key={c}
                          type="button"
                          lang="ja"
                          aria-pressed={on}
                          aria-label={on ? `Remove ${c} from the wheel` : `Add ${c} to the wheel`}
                          onClick={() => (on ? change(removeEntry(state, entries.lastIndexOf(c))) : add(c))}
                          className={`h-10 w-10 cursor-pointer rounded-lg border text-lg ${on ? 'border-red bg-red-soft text-red-dark' : 'border-line hover:border-ink/40'}`}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {entries.length > 0 ? (
              <ul className="mt-4 flex max-h-64 flex-wrap gap-1.5 overflow-y-auto" aria-label="Characters on the wheel">
                {entries.map((t, i) => (
                  <li key={`${i}-${t}`} className={`flex items-center rounded-lg border bg-card pl-3 ${winner === i ? 'border-red' : 'border-line'}`}>
                    <span className="text-lg" lang="ja">
                      {t}
                    </span>
                    <button
                      type="button"
                      className="h-10 w-9 cursor-pointer text-lg text-muted hover:text-red disabled:cursor-not-allowed"
                      onClick={() => change(removeEntry(state, i))}
                      aria-label={`Remove ${t}`}
                      title={`Remove ${t}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted">Nothing on the wheel yet.</p>
            )}
            {entries.length > 60 && <p className="mt-2 text-sm text-muted">With this many entries the labels on the wheel are small. The chosen one is always shown large.</p>}

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="btn !px-2" onClick={() => change(shuffleWheel(state))} disabled={entries.length < 2}>
                Shuffle
              </button>
              <button type="button" className="btn !px-2" onClick={() => change(clearWheel(state), 'Wheel cleared.')} disabled={entries.length === 0}>
                Clear wheel
              </button>
              {state.mode !== 'custom' && (
                <button type="button" className="btn col-span-2 !px-2" onClick={() => change(restoreDefaults(state), 'Default list restored.')}>
                  Restore default list
                </button>
              )}
            </div>
            {undo && (
              <p className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-sm" role="status">
                {undo.label}
                <button type="button" className="cursor-pointer font-medium text-red underline" onClick={() => change(undo.state)}>
                  Undo
                </button>
              </p>
            )}
          </fieldset>

          <fieldset className="card min-w-0 p-5" disabled={spinning}>
            <legend className="sr-only">Saved wheels</legend>
            <h2 className="font-bold">Saved wheels</h2>
            <p className="mt-1 text-sm text-muted">Saved in this browser only.</p>

            {state.mode === 'custom' && open && hasUnsavedChanges(state) && (
              <div className="mt-3 rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <p>
                  <strong>{open.name}</strong> has changes that are not saved.
                </p>
                <button type="button" className="btn mt-2" onClick={() => change(updateSaved(state))}>
                  Save changes
                </button>
              </div>
            )}

            <form
              className="mt-3"
              onSubmit={(e) => {
                e.preventDefault()
                save()
              }}
            >
              <label htmlFor="wheel-name" className="label">
                Save this wheel as
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="wheel-name"
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-card px-3 text-ink disabled:opacity-45"
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(e) => {
                    setName(e.target.value)
                    setSaveError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && e.nativeEvent.isComposing && e.preventDefault()}
                  placeholder="Difficult Characters"
                  autoComplete="off"
                />
                <button type="submit" className="btn">
                  Save
                </button>
              </div>
              {saveError && (
                <p className="mt-2 text-sm text-red-dark" role="alert">
                  {saveError}
                </p>
              )}
            </form>

            {state.saved.length > 0 && (
              <ul className="mt-4 space-y-2">
                {state.saved.map((w) => (
                  <li key={w.id} className={`rounded-lg border p-3 ${w.id === state.openId ? 'border-red bg-red-soft/40' : 'border-line'}`}>
                    {renaming?.id === w.id ? (
                      <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (!renaming.name.trim()) return
                          change(renameSaved(state, w.id, renaming.name))
                          setRenaming(null)
                        }}
                      >
                        <input
                          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-card px-3 text-ink"
                          value={renaming.name}
                          maxLength={MAX_NAME_LENGTH}
                          onChange={(e) => setRenaming({ id: w.id, name: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && e.nativeEvent.isComposing && e.preventDefault()}
                          aria-label={`New name for ${w.name}`}
                          autoFocus
                        />
                        <button type="submit" className="btn !px-3">
                          OK
                        </button>
                        <button type="button" className="btn !px-3" onClick={() => setRenaming(null)}>
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <p className="font-medium break-words">{w.name}</p>
                        <p className="truncate text-sm text-muted" lang="ja">
                          {w.entries.length} {w.entries.length === 1 ? 'entry' : 'entries'}
                          {w.entries.length > 0 && ` · ${w.entries.join(' ')}`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
                          <button type="button" className="min-h-9 cursor-pointer text-red underline disabled:cursor-not-allowed" onClick={() => change(openSaved(state, w.id), `Opened “${w.name}”.`)}>
                            {w.id === state.openId ? 'Reopen' : 'Open'}
                          </button>
                          <button type="button" className="min-h-9 cursor-pointer underline disabled:cursor-not-allowed" onClick={() => setRenaming({ id: w.id, name: w.name })}>
                            Rename
                          </button>
                          <button type="button" className="min-h-9 cursor-pointer underline disabled:cursor-not-allowed" onClick={() => change(duplicateSaved(state, w.id, newId()))}>
                            Duplicate
                          </button>
                          <button type="button" className="min-h-9 cursor-pointer underline disabled:cursor-not-allowed" onClick={() => change(deleteSaved(state, w.id), `Deleted “${w.name}”.`)}>
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {state.saved.length > 0 && <p className="mt-3 text-sm text-muted">Open a wheel to spin or edit it in Custom mode.</p>}
          </fieldset>

          <fieldset className="card min-w-0 space-y-3 p-5 text-sm" disabled={spinning}>
            <legend className="sr-only">Wheel settings</legend>
            <h2 className="text-base font-bold">Settings</h2>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-red" checked={!state.allowDuplicates} onChange={(e) => setting({ allowDuplicates: !e.target.checked })} />
              <span>Prevent duplicate entries</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-red" checked={state.requireBoth} onChange={(e) => setting({ requireBoth: e.target.checked })} />
              <span>Finish both the reading and the writing task before spinning again</span>
            </label>
          </fieldset>
        </aside>
      </div>
    </div>
  )
}
