import { useState } from 'react'
import { RotateCcw, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import { daysLeftBeforePurge, purgeProgress } from '@/constants/bin'
import type { Note } from '@/types/contracts'
import { formatRelativeTime } from '@/utils/format'
import styles from './BinnedRow.module.css'

export interface BinnedRowProps {
  note: Note
  busy?: boolean
  onRestore: () => void
  onDeleteForever: () => void
}

export function BinnedRow({ note, busy, onRestore, onDeleteForever }: BinnedRowProps) {
  const [confirming, setConfirming] = useState(false)
  const preview = note.body.map((entry) => entry.text).join(' ').trim()
  const daysLeft = daysLeftBeforePurge(note.purgeAt)
  const progress = purgeProgress(note.purgeAt)
  const countdown =
    daysLeft <= 0 ? 'Due for deletion today' : `Purges in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`
  const deletedLabel = note.deletedAt ? `Deleted ${formatRelativeTime(note.deletedAt)}` : 'Deleted'

  return (
    <li className={styles.row}>
      <div className={styles.info}>
        <h3 className={styles.heading}>{note.title.trim() || 'Untitled note'}</h3>
        {preview ? <p className={styles.preview}>{preview}</p> : null}
        <p className={styles.meta}>{deletedLabel}</p>
        <div className={styles.track} aria-hidden="true">
          {/* Only the width is dynamic; the fill colour is a state class, not a magic hex. */}
          <span
            className={styles.fill}
            data-warning={daysLeft <= 3}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className={styles.countdown}>{countdown}</p>
      </div>

      <div className={styles.actions}>
        <Button variant="secondary" size="sm" onClick={onRestore} disabled={busy}>
          <RotateCcw size={14} aria-hidden="true" />
          Restore
        </Button>
        {confirming ? (
          <>
            <Button variant="danger" size="sm" onClick={onDeleteForever} disabled={busy}>
              <Trash2 size={14} aria-hidden="true" />
              Confirm delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 size={14} aria-hidden="true" />
            Delete forever
          </Button>
        )}
      </div>
    </li>
  )
}
