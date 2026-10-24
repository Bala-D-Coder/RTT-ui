import { Check, Plus, Square, X } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import { meterBars, statusLabels } from '@/constants/recorderLabels'
import { useRecorder } from '@/context/RecorderContext'
import { useDictationCommit } from '@/hooks/useDictationCommit'
import { langLabel } from '@/services/transcription'
import { cx, formatDuration } from '@/utils/format'
import styles from './RecorderBar.module.css'

export function RecorderBar() {
  const {
    status,
    interim,
    transcript,
    lines,
    wordCount,
    elapsedMs,
    expanded,
    errorMessage,
    engine,
    lang,
    levels,
    hasContent,
    activeNoteId,
    start,
    stop,
    toggleExpanded,
    reset,
  } = useRecorder()
  const commit = useDictationCommit()

  const live = status === 'listening'
  const readyToSave = hasContent && !live
  const ticker = interim || transcript || 'Press the mic and speak — words appear here.'

  return (
    <section className={styles.wrap} data-status={status} aria-label="Dictation">
      {expanded ? (
        <div className={styles.panel}>
          <ol className={styles.panelLines}>
            {(lines.length > 0 ? lines : ['Nothing captured yet.']).map((line, index) => (
              <li key={`${index}-${line.slice(0, 12)}`} className={styles.panelLine}>
                {line}
              </li>
            ))}
          </ol>
          <p className={styles.panelNote}>
            It listens in your browser language ({langLabel(lang)}). Web Speech handles one language per
            session — mixed Hindi-English speech inside a single take needs the server ASR engine from the API
            milestone.
          </p>
        </div>
      ) : null}

      {readyToSave ? (
        <div className={styles.commit}>
          <p className={styles.commitLabel}>
            {wordCount} word{wordCount === 1 ? '' : 's'} captured — save it without leaving the bar.
          </p>
          <div className={styles.commitActions}>
            <Button variant="accent" size="sm" onClick={() => commit.saveAsNote.mutate()} disabled={commit.busy}>
              <Plus size={15} aria-hidden="true" />
              Save as new note
            </Button>
            {activeNoteId ? (
              <Button variant="onBar" size="sm" onClick={() => commit.addToNote.mutate(activeNoteId)} disabled={commit.busy}>
                <Check size={15} aria-hidden="true" />
                Add to open note
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={reset} disabled={commit.busy}>
              <X size={15} aria-hidden="true" />
              Discard
            </Button>
          </div>
          {commit.failed ? (
            <p className={styles.commitError} role="status">
              Could not save that dictation. Try again.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.bar}>
        <div className={styles.status}>
          <span className={styles.dot} data-live={live} aria-hidden="true" />
          <span className={styles.statusText}>{statusLabels[status]}</span>
          <span className={styles.engine}>
            {engine === 'webspeech' ? 'Web Speech' : 'Replay'} · {langLabel(lang)}
          </span>
        </div>

        <div className={styles.meter} aria-hidden="true">
          {Array.from({ length: meterBars }, (_, index) => {
            const level = levels?.[index]
            return (
              <span
                key={index}
                className={cx(styles.meterBar, level !== undefined && styles.measured)}
                data-idle={!live}
                style={
                  level !== undefined
                    ? { transform: `scaleY(${Math.max(0.08, level).toFixed(3)})` }
                    : { animationDelay: `${(index % 5) * 90}ms` }
                }
              />
            )
          })}
        </div>

        <p className={styles.ticker} aria-live="polite">
          {ticker}
        </p>

        <div className={styles.meta}>
          <span className={styles.time}>{formatDuration(elapsedMs)}</span>
          <button type="button" className={styles.expand} onClick={toggleExpanded} disabled={!hasContent}>
            {expanded ? 'Hide transcript' : 'Show transcript'}
          </button>
        </div>

        <div className={styles.controls}>
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
          {live ? (
            <Button variant="accent" size="icon" onClick={stop} aria-label="Stop dictation">
              <Square size={18} aria-hidden="true" />
            </Button>
          ) : (
            <Button variant="accent" size="icon" onClick={start} aria-label="Start dictation">
              <span className={styles.playIcon} aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
    </section>
  )
}
