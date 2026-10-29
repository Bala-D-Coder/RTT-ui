import { useState } from 'react'
import { Check, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import type { Reminder } from '@/types/contracts'
import { formatDate, formatRelativeTime } from '@/utils/format'
import styles from './ReminderRow.module.css'

export interface ReminderRowProps {
  reminder: Reminder
  isOverdue?: boolean
  isDone?: boolean
  onComplete: () => void
  onSnooze: () => void
  onDelete: () => void
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function repeatLabel(reminder: Reminder) {
  if (reminder.repeat === 'daily') return 'Daily'
  if (reminder.repeat === 'weekdays') return 'Weekdays'
  if (reminder.repeat === 'weekly') {
    // Contracts number weekdays 1 = Mon .. 7 = Sun.
    const days = (reminder.weekdays ?? []).map((day) => WEEKDAY_LABELS[day - 1] ?? '').filter(Boolean)
    return days.length > 0 ? `Weekly · ${days.join(', ')}` : 'Weekly'
  }
  return null
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function ReminderRow({
  reminder,
  isOverdue = false,
  isDone = false,
  onComplete,
  onSnooze,
  onDelete,
}: ReminderRowProps) {
  const [confirming, setConfirming] = useState(false)
  const repeat = repeatLabel(reminder)

  return (
    <li className={styles.item}>
      <article className={styles.row} data-overdue={isOverdue ? 'true' : undefined}>
        <div className={styles.main}>
          <p className={styles.title}>{reminder.title}</p>
          <div className={styles.meta}>
            {isDone ? (
              <time className={styles.absolute} dateTime={reminder.dueAt}>
                {formatDate(reminder.dueAt)}, {clockTime(reminder.dueAt)}
              </time>
            ) : (
              <>
                <span className={styles.relative}>{formatRelativeTime(reminder.dueAt)}</span>
                <time className={styles.absolute} dateTime={reminder.dueAt}>
                  {formatDate(reminder.dueAt)}, {clockTime(reminder.dueAt)}
                </time>
              </>
            )}
            {repeat ? <span className={styles.repeat}>{repeat}</span> : null}
            {isDone ? <span className={styles.doneTag}>Done</span> : null}
          </div>
        </div>

        <div className={styles.actions}>
          {confirming ? (
            <>
              <span className={styles.confirmText}>Delete this reminder?</span>
              <Button variant="danger" size="sm" onClick={onDelete}>
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              {isDone ? null : (
                <Button variant="secondary" size="sm" onClick={onComplete}>
                  <Check size={14} aria-hidden="true" />
                  Complete
                </Button>
              )}
              {isDone ? null : (
                <Button variant="ghost" size="sm" onClick={onSnooze}>
                  <Clock size={14} aria-hidden="true" />
                  Snooze 1 h
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={styles.deleteButton}
                onClick={() => setConfirming(true)}
                aria-label={`Delete reminder: ${reminder.title}`}
              >
                <Trash2 size={15} aria-hidden="true" />
              </Button>
            </>
          )}
        </div>
      </article>
    </li>
  )
}
