import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { setRate, useTts } from '../lib/speech.ts'

export const NAV = [
  { to: '/hiragana', label: 'Hiragana' },
  { to: '/katakana', label: 'Katakana' },
  { to: '/kanji', label: 'Kanji' },
  { to: '/vocabulary', label: 'Vocabulary' },
  { to: '/speaking', label: 'Speaking' },
  { to: '/writing', label: 'Writing' },
  { to: '/quizzes', label: 'Quizzes' },
  { to: '/wheel', label: 'Wheel' },
]

const SPEEDS = [
  { value: 0.6, label: 'Slow' },
  { value: 0.9, label: 'Normal' },
  { value: 1.1, label: 'Fast' },
]

function SpeedControl() {
  const { rate, status } = useTts()
  if (status === 'unsupported') return null
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      Audio speed
      <select className="min-h-9 rounded-lg border border-line bg-card px-2 text-ink" value={rate} onChange={(e) => setRate(parseFloat(e.target.value))}>
        {SPEEDS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export function Layout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    setOpen(false)
    window.scrollTo(0, 0)
  }, [pathname])

  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium lg:px-2 xl:px-3 ${isActive ? 'bg-red-soft text-red-dark' : 'text-ink hover:bg-line/50'}`

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-bold">
            <span className="h-6 w-6 rounded-full bg-red" aria-hidden="true" />
            <span>
              Nihongo <span className="font-normal text-muted">First Steps</span>
            </span>
          </Link>
          <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={link}>
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto hidden sm:block lg:ml-2">
            <SpeedControl />
          </div>
          <button type="button" className="btn ml-auto sm:ml-0 lg:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="mobile-nav">
            {open ? 'Close' : 'Menu'}
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" className="border-t border-line px-4 py-3 lg:hidden" aria-label="Main">
            <div className="mx-auto grid max-w-6xl grid-cols-2 gap-1">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={link}>
                  {n.label}
                </NavLink>
              ))}
            </div>
            <div className="mx-auto mt-3 max-w-6xl sm:hidden">
              <SpeedControl />
            </div>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">
          <p>
            Stroke-order diagrams use data from{' '}
            <a className="underline" href="https://kanjivg.tagaini.net" target="_blank" rel="noreferrer">
              KanjiVG
            </a>{' '}
            by Ulrich Apel, licensed{' '}
            <a className="underline" href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">
              CC BY-SA 3.0
            </a>
            . Audio and speech recognition are provided by your browser.
          </p>
        </div>
      </footer>
    </div>
  )
}
