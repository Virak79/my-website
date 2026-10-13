import { speak, useTts } from '../lib/speech.ts'

export function SpeakerIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" stroke="none" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  )
}

interface Props {
  /** Japanese text to speak. */
  text: string
  /** Visible label; without it the button shows only the icon. */
  label?: string
  slow?: boolean
  className?: string
}

/** Plays Japanese audio for `text`. Pressing again replays it. */
export function AudioButton({ text, label, slow, className = '' }: Props) {
  const { status, speaking } = useTts()
  const active = speaking === text
  return (
    <button
      type="button"
      className={`btn ${label ? '' : 'h-11 w-11 !px-0'} ${active ? '!border-red text-red' : ''} ${className}`}
      disabled={status === 'unsupported'}
      onClick={(e) => {
        e.stopPropagation()
        speak(text, { slow })
      }}
      aria-label={label ? undefined : `Listen to ${text}${slow ? ' slowly' : ''}`}
      title={status === 'unsupported' ? 'Audio is not supported in this browser' : slow ? 'Listen slowly' : 'Listen'}
    >
      <SpeakerIcon />
      {label}
    </button>
  )
}

/** Shown once per page when Japanese audio may not work. */
export function AudioNotice() {
  const { status } = useTts()
  if (status === 'ready' || status === 'loading') return null
  return (
    <p className="rounded-lg border border-line bg-card px-4 py-3 text-sm text-muted" role="status">
      {status === 'unsupported'
        ? 'This browser does not support spoken audio. Try a recent version of Chrome, Edge or Safari to hear pronunciation.'
        : 'No Japanese voice was found on this device, so audio may be silent or sound wrong. Chrome and Edge include Japanese voices; on other browsers, install a Japanese voice in your system settings.'}
    </p>
  )
}
