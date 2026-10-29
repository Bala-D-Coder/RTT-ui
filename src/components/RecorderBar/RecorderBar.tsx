import { useCallback, useEffect } from 'react'
import { Check, Plus, Square, X } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import { meterBars, statusLabels } from '@/constants/recorderLabels'
import { useRecorder } from '@/context/RecorderContext'
import { useModal } from '@/context/ModalContext'
import { useDictationCommit } from '@/hooks/useDictationCommit'
import { langLabel, setEngineChoice } from '@/services/transcription'
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
  const modal = useModal()

  const live = status === 'listening'
  const hasActiveSession = live || hasContent || elapsedMs > 0
  const readyToSave = hasContent && !live
  const ticker = interim || transcript || 'Press the mic and speak — words appear here.'

  const handleCycleEngine = () => {
    if (live) return
    if (engine === 'webspeech') {
      setEngineChoice('gemini')
    } else {
      setEngineChoice('webspeech')
    }
  }

  const handleCancel = useCallback(async () => {
    const wasLive = status === 'listening' || status === 'requesting'
    if (wasLive) {
      stop()
    }
    // If user has substantial text recorded, confirm with custom modal to avoid accidental loss
    if (wordCount > 3) {
      const ok = await modal.confirm({
        title: 'Cancel Transcription?',
        message: `You have ${wordCount} words transcribed. Are you sure you want to cancel and discard this transcription?`,
        confirmText: 'Discard Transcription',
        cancelText: wasLive ? 'Keep & Save' : 'Keep',
        variant: 'danger',
      })
      if (!ok) return
    }
    reset()
  }, [status, stop, wordCount, modal, reset])

  // Escape key cancels live recording
  useEffect(() => {
    if (!live) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        void handleCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [live, handleCancel])

  return (
    <section className={styles.wrap} data-status={status} aria-label="Dictation">
      {expanded ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>
              Transcript {wordCount > 0 ? `(${wordCount} word${wordCount === 1 ? '' : 's'})` : ''}
            </span>
            <button
              type="button"
              className={styles.panelCancelBtn}
              onClick={handleCancel}
              title="Cancel and discard transcription"
            >
              <X size={14} aria-hidden="true" />
              Cancel transcription
            </button>
          </div>
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
            <Button variant="danger" size="sm" onClick={handleCancel} disabled={commit.busy}>
              <X size={15} aria-hidden="true" />
              Cancel & discard
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
          <button
            type="button"
            className={styles.engineBtn}
            onClick={handleCycleEngine}
            disabled={live}
            title={live ? 'Engine locked while recording' : 'Click to toggle speech engine (Gemini Live / Web Speech)'}
          >
            {engine === 'gemini' || engine === 'whisper' ? '✨ Gemini Live' : engine === 'webspeech' ? '🌐 Web Speech' : '📼 Replay'} · {langLabel(lang)}
          </button>
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
          <div className={styles.metaLinks}>
            <button type="button" className={styles.expand} onClick={toggleExpanded} disabled={!hasContent}>
              {expanded ? 'Hide transcript' : 'Show transcript'}
            </button>
            {hasActiveSession ? (
              <>
                <span className={styles.metaDot} aria-hidden="true">·</span>
                <button
                  type="button"
                  className={styles.cancelLink}
                  onClick={handleCancel}
                  title="Cancel transcription"
                >
                  Cancel
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className={styles.controls}>
          {errorMessage ? <span className={styles.error}>{errorMessage}</span> : null}
          {live ? (
            <>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={handleCancel}
                aria-label="Cancel dictation"
                title="Cancel transcription (discard)"
              >
                <X size={18} aria-hidden="true" />
              </button>
              <Button variant="accent" size="icon" onClick={stop} aria-label="Stop dictation" title="Stop & keep dictation">
                <Square size={18} aria-hidden="true" />
              </Button>
            </>
          ) : (
            <>
              {hasActiveSession ? (
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={handleCancel}
                  aria-label="Cancel and discard transcription"
                  title="Cancel & discard transcription"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              ) : null}
              <Button variant="accent" size="icon" onClick={start} aria-label="Start dictation" title="Start dictation">
                <span className={styles.playIcon} aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

