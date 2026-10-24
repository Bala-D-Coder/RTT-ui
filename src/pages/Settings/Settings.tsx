import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Monitor } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import { env } from '@/constants/env'
import { BIN_RETENTION_DAYS } from '@/constants/bin'
import { useNotifications } from '@/context/NotificationsContext'
import { useRecorder } from '@/context/RecorderContext'
import { useBinCount } from '@/hooks/useBinCount'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useTheme } from '@/hooks/useTheme'
import { db } from '@/services/data-source'
import { engineChoice, setEngineChoice, type EngineName } from '@/services/transcription'
import { isWebSpeechSupported } from '@/services/web-speech'
import { refreshNoteViews } from '@/utils/queryKeys'
import styles from './Settings.module.css'

const ENGINES: Array<{ value: EngineName; label: string; blurb: string }> = [
  { value: 'webspeech', label: 'Browser Web Speech', blurb: 'Live microphone, $0, no quota. Chromium and Safari only.' },
  { value: 'replay', label: 'Replay take', blurb: 'Canned Hinglish transcript for demos and CI where no mic is available.' },
]

const THEMES = [
  { value: 'light' as const, label: 'Light' },
  { value: 'dark' as const, label: 'Dark' },
]

export function Settings() {
  usePageTitle('Settings')
  const recorder = useRecorder()
  const client = useQueryClient()
  const { push } = useNotifications()
  const { theme, setTheme } = useTheme()
  const binCount = useBinCount()
  const [choice, setChoice] = useState<EngineName>(() => engineChoice())
  const [busy, setBusy] = useState(false)

  const rows: Array<{ label: string; value: string; note?: string }> = [
    {
      label: 'Data source',
      value: env.dataSource === 'mock' ? 'Local fixtures (localStorage)' : env.apiUrl,
      note: 'Same DataSource interface the API milestone implements over HTTP',
    },
    {
      label: 'Browser speech support',
      value: isWebSpeechSupported() ? 'Available' : 'Not available',
      note: 'Word-by-word interim text uses this API',
    },
    {
      label: 'Bin retention',
      value: `${BIN_RETENTION_DAYS} days`,
      note: `${binCount} note${binCount === 1 ? '' : 's'} waiting to be purged`,
    },
    { label: 'Build', value: import.meta.env.MODE },
  ]

  async function resetDemoData() {
    setBusy(true)
    await db.resetDemoData()
    refreshNoteViews(client)
    setBusy(false)
    push({ title: 'Demo data', body: 'Notes and reminders are back to the seeded set.', to: '/' })
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.segment} role="group" aria-label="Theme">
          {THEMES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={styles.segmentButton}
              data-active={theme === option.value}
              onClick={() => setTheme(option.value)}
              aria-pressed={theme === option.value}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className={styles.hint}>
          <Monitor size={13} aria-hidden="true" /> The theme is stored in this browser and applies the
          moment you pick it. On first load it follows your system setting.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Dictation engine</h2>
        <div className={styles.engines}>
          {ENGINES.map((option) => (
            <label key={option.value} className={styles.engine} data-active={choice === option.value}>
              <input
                type="radio"
                name="engine"
                value={option.value}
                checked={choice === option.value}
                onChange={() => {
                  setChoice(option.value)
                  setEngineChoice(option.value)
                }}
              />
              <span className={styles.engineLabel}>{option.label}</span>
              <span className={styles.engineBlurb}>{option.blurb}</span>
            </label>
          ))}
        </div>
        <p className={styles.hint}>
          Running <strong>{recorder.driverName}</strong> ({recorder.model}). Changing this stops any
          dictation in progress.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Runtime</h2>
        <dl className={styles.list}>
          {rows.map((row) => (
            <div key={row.label} className={styles.row}>
              <dt className={styles.label}>{row.label}</dt>
              <dd className={styles.value}>
                {row.value}
                {row.note ? <span className={styles.note}>{row.note}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Demo data</h2>
        <p className={styles.hint}>
          Everything you capture is stored in this browser only. Seeded content is realistic
          Hindi-English notes and reminders so every screen has something to show.
        </p>
        <Button variant="danger" onClick={() => void resetDemoData()} disabled={busy}>
          {busy ? 'Resetting…' : 'Reset demo data'}
        </Button>
      </section>
    </div>
  )
}

export default Settings
