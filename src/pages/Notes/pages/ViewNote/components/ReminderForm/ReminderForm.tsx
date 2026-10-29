import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import { db } from '@/services/data-source'
import type { ReminderRepeat } from '@/types/contracts'
import { cx } from '@/utils/format'
import { refreshNoteViews } from '@/utils/queryKeys'
import styles from './ReminderForm.module.css'

const REPEAT_OPTIONS: Array<{ value: ReminderRepeat; label: string }> = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'weekdays', label: 'Weekdays' },
]

function pad(value: number) {
  return String(value).padStart(2, '0')
}

/** datetime-local wants wall-clock text, so build it from the local parts instead of toISOString(). */
function toInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function nextHourValue() {
  const next = new Date()
  next.setMinutes(0, 0, 0)
  next.setHours(next.getHours() + 1)
  return toInputValue(next)
}

function isAlreadyDue(date: Date) {
  return date.getTime() < Date.now()
}

/** Contracts number weekdays 1 = Mon .. 7 = Sun; the store needs the list to repeat weekly. */
function weekdayNumber(date: Date) {
  return ((date.getDay() + 6) % 7) + 1
}

export interface ReminderFormProps {
  /** Reminders belong to a note — this form only ever lives inside the note editor. */
  noteId: string
  heading?: string
}

export function ReminderForm({ noteId, heading = 'Schedule a reminder' }: ReminderFormProps) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState(nextHourValue)
  const [repeat, setRepeat] = useState<ReminderRepeat>('none')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [dueError, setDueError] = useState<string | null>(null)
  const [scheduled, setScheduled] = useState(false)

  const createMutation = useMutation({
    mutationFn: (input: { title: string; dueAt: string; repeat: ReminderRepeat; weekdays?: number[] }) =>
      db.reminders.create({ ...input, noteId }),
    onSuccess: () => {
      refreshNoteViews(queryClient)
      setTitle('')
      setDue(nextHourValue())
      setRepeat('none')
      setTitleError(null)
      setDueError(null)
      setScheduled(true)
    },
    onError: () => setScheduled(false),
  })

  const dueDate = new Date(due)
  const dueIsValid = due.trim() !== '' && !Number.isNaN(dueDate.getTime())
  const dueInPast = dueIsValid && isAlreadyDue(dueDate)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    setTitleError(trimmed ? null : 'Give the reminder a title.')
    setDueError(dueIsValid ? null : 'Pick the date and time it is due.')
    if (!trimmed || !dueIsValid) return

    setScheduled(false)
    createMutation.mutate({
      title: trimmed,
      dueAt: dueDate.toISOString(),
      repeat,
      weekdays: repeat === 'weekly' ? [weekdayNumber(dueDate)] : undefined,
    })
  }

  const statusLine = createMutation.isPending
    ? 'Scheduling…'
    : createMutation.isError
      ? 'Could not schedule the reminder. Try again.'
      : scheduled
        ? 'Reminder scheduled'
        : ''

  return (
    <section className={styles.panel} aria-label="Schedule a reminder">
      <h2 className={styles.heading}>{heading}</h2>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="reminder-title">
            Title
          </label>
          <input
            id="reminder-title"
            className={styles.input}
            type="text"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setTitleError(null)
              setScheduled(false)
            }}
            placeholder="Send the deployment plan"
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'reminder-title-error' : undefined}
          />
          {titleError ? (
            <p className={styles.fieldError} id="reminder-title-error">
              {titleError}
            </p>
          ) : null}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="reminder-due">
              Due
            </label>
            <input
              id="reminder-due"
              className={styles.input}
              type="datetime-local"
              value={due}
              onChange={(event) => {
                setDue(event.target.value)
                setDueError(null)
                setScheduled(false)
              }}
              aria-invalid={dueError ? true : undefined}
              aria-describedby={dueError ? 'reminder-due-error' : 'reminder-due-hint'}
            />
            {dueError ? (
              <p className={styles.fieldError} id="reminder-due-error">
                {dueError}
              </p>
            ) : (
              <p className={styles.hint} id="reminder-due-hint">
                {dueInPast ? 'This is already due.' : 'Defaults to the next whole hour.'}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="reminder-repeat">
              Repeat
            </label>
            <select
              id="reminder-repeat"
              className={styles.select}
              value={repeat}
              onChange={(event) => {
                setRepeat(event.target.value as ReminderRepeat)
                setScheduled(false)
              }}
            >
              {REPEAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {repeat === 'weekly' ? (
              <p className={styles.hint}>Repeats every week on the weekday of the due date.</p>
            ) : null}
          </div>

        </div>

        <div className={styles.submitRow}>
          <Button type="submit" disabled={createMutation.isPending}>
            <Plus size={16} aria-hidden="true" />
            Schedule reminder
          </Button>
          <p className={cx(styles.status, createMutation.isError && styles.statusError)} role="status">
            {statusLine}
          </p>
        </div>
      </form>
    </section>
  )
}
