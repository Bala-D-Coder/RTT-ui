import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Pin, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import { useRecorder } from '@/context/RecorderContext'
import { usePageTitle } from '@/hooks/usePageTitle'
import { ReminderForm } from './components/ReminderForm/ReminderForm'
import { ReminderRow } from './components/ReminderRow/ReminderRow'
import { db } from '@/services/data-source'
import type { Note, NoteBlock } from '@/types/contracts'
import type { NotePatch } from '@/types/datasource'
import { formatDate } from '@/utils/format'
import { queryKeys, refreshNoteViews } from '@/utils/queryKeys'
import { appendBlock, getNote, removeBlock, trashNote, updateNote } from '../../NotesApi.services'
import styles from './ViewNote.module.css'

const COLORS = ['sand', 'coral', 'violet', 'aqua', 'lime', 'mint'] as const
const HOUR_MS = 3_600_000

// Kept out of the render body so the overdue bucket follows refetches, not re-renders.
function nowMs() {
  return Date.now()
}

export function ViewNote() {
  const { noteId } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const bindNote = useRecorder().bindNote
  const id = noteId ?? ''

  usePageTitle('Note')

  const noteQuery = useQuery({ queryKey: queryKeys.note(id), queryFn: () => getNote(id) })
  const remindersQuery = useQuery({
    queryKey: queryKeys.reminderList(id),
    queryFn: () => db.reminders.list({ noteId: id }),
  })
  const note = noteQuery.data

  // Bucketed outside the render body: the clock is read once per data change, not per element.
  const overdueIds = useMemo(() => {
    const now = nowMs()
    return new Set(
      (remindersQuery.data?.items ?? [])
        .filter((entry) => entry.status !== 'done' && new Date(entry.dueAt).getTime() < now)
        .map((entry) => entry.id),
    )
  }, [remindersQuery.data])

  const [title, setTitle] = useState('')
  const [draftText, setDraftText] = useState('')
  const [blockDrafts, setBlockDrafts] = useState<Record<string, string>>({})
  const [tagName, setTagName] = useState('')
  const loadedId = useRef<string | null>(null)

  useEffect(() => {
    if (!note || loadedId.current === note.id) return
    loadedId.current = note.id
    setTitle(note.title)
    setBlockDrafts({})
  }, [note])

  // The dictation bar offers "Add to open note" while this editor is on screen.
  useEffect(() => {
    bindNote(id)
    return () => bindNote(null)
  }, [bindNote, id])

  const patch = useMutation({
    mutationFn: (input: NotePatch) => updateNote(id, input),
    onSuccess: (updated) => {
      client.setQueryData<Note>(queryKeys.note(id), updated)
      refreshNoteViews(client)
    },
  })

  // Title autosave: debounce so a typed sentence is one write, not forty.
  useEffect(() => {
    if (!note || title === note.title) return
    const timer = window.setTimeout(() => patch.mutate({ title }), 700)
    return () => window.clearTimeout(timer)
  }, [title, note, patch])

  const append = useMutation({
    mutationFn: (text: string) => appendBlock(id, { text }),
    onSuccess: () => {
      setDraftText('')
      refreshNoteViews(client)
    },
  })

  const dropBlock = useMutation({
    mutationFn: (blockId: string) => removeBlock(id, blockId),
    onSuccess: () => refreshNoteViews(client),
  })

  const toBin = useMutation({
    mutationFn: () => trashNote(id),
    onSuccess: () => {
      refreshNoteViews(client)
      navigate('/notes')
    },
  })

  const refreshReminders = () => client.invalidateQueries({ queryKey: queryKeys.reminders })
  const completeReminder = useMutation({ mutationFn: db.reminders.complete, onSuccess: refreshReminders })
  const snoozeReminder = useMutation({
    mutationFn: (reminderId: string) => db.reminders.snooze(reminderId, new Date(Date.now() + HOUR_MS).toISOString()),
    onSuccess: refreshReminders,
  })
  const deleteReminder = useMutation({ mutationFn: db.reminders.remove, onSuccess: refreshReminders })

  function commitBlock(blockId: string, text: string) {
    if (!note) return
    const body = note.body.map((entry: NoteBlock) => (entry.id === blockId ? { ...entry, text } : entry))
    patch.mutate({ body })
  }

  async function addTag() {
    const name = tagName.trim()
    if (!name) return
    setTagName('')
    const tag = await db.notes.ensureTag(name)
    const current = client.getQueryData<Note>(queryKeys.note(id))
    if (!current || current.tags.some((entry) => entry.id === tag.id)) return
    patch.mutate({ tags: [...current.tags, tag] })
  }

  if (noteQuery.isPending) return <p className={styles.loading}>Loading note…</p>

  if (!note) {
    return (
      <div className={styles.missing}>
        <p>This note is not in your list any more. Check the Bin.</p>
        <Button variant="secondary" onClick={() => navigate('/notes')}>
          Back to notes
        </Button>
      </div>
    )
  }

  const reminders = remindersQuery.data?.items ?? []
  const reminderActionFailed =
    completeReminder.isError || snoozeReminder.isError || deleteReminder.isError

  return (
    <article className={styles.wrap} data-color={note.color}>
      <header className={styles.bar}>
        <Link to="/notes" className={styles.back}>
          <ArrowLeft size={15} aria-hidden="true" />
          All notes
        </Link>
        <div className={styles.barActions}>
          <span className={styles.saveState} role="status">
            {patch.isPending ? 'Saving…' : 'Saved'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => patch.mutate({ pinned: !note.pinned })}
            aria-pressed={note.pinned}
            aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
          >
            <Pin size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toBin.mutate()}
            aria-label="Move note to bin"
          >
            <Trash2 size={16} aria-hidden="true" />
          </Button>
        </div>
      </header>

      <input
        className={styles.title}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Untitled note"
        aria-label="Note title"
      />

      <div className={styles.meta}>
        <div className={styles.dots} role="group" aria-label="Note colour">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={styles.dot}
              data-color={color}
              data-active={note.color === color}
              onClick={() => patch.mutate({ color })}
              aria-pressed={note.color === color}
              aria-label={`Use ${color}`}
            />
          ))}
        </div>

        <div className={styles.tags}>
          {note.tags.map((tag) => (
            <span key={tag.id} className={styles.tag}>
              {tag.name}
              <button
                type="button"
                className={styles.tagRemove}
                onClick={() => patch.mutate({ tags: note.tags.filter((entry) => entry.id !== tag.id) })}
                aria-label={`Remove ${tag.name} tag`}
              >
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          ))}
          <input
            className={styles.tagInput}
            value={tagName}
            onChange={(event) => setTagName(event.target.value)}
            onBlur={() => void addTag()}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void addTag()
              }
            }}
            placeholder="+ tag"
            aria-label="Add tag"
          />
        </div>

        <p className={styles.dates}>
          Created {formatDate(note.createdAt)} · edited {formatDate(note.updatedAt)}
        </p>
      </div>

      <div className={styles.blocks}>
        {note.body.length === 0 ? <p className={styles.empty}>Empty note. Type below or dictate into it.</p> : null}
        {note.body.map((entry) => (
          <section key={entry.id} className={styles.block}>
            <textarea
              className={styles.blockText}
              rows={3}
              value={blockDrafts[entry.id] ?? entry.text}
              onChange={(event) => setBlockDrafts((current) => ({ ...current, [entry.id]: event.target.value }))}
              onBlur={(event) => {
                const next = event.target.value
                setBlockDrafts((current) => {
                  const draft = { ...current }
                  delete draft[entry.id]
                  return draft
                })
                if (next !== entry.text) commitBlock(entry.id, next)
              }}
              aria-label="Note text"
            />
            <Button
              variant="ghost"
              size="icon"
              className={styles.blockDelete}
              onClick={() => dropBlock.mutate(entry.id)}
              aria-label="Delete this block"
              disabled={dropBlock.isPending}
            >
              <Trash2 size={15} aria-hidden="true" />
            </Button>
          </section>
        ))}
      </div>

      <footer className={styles.composer}>
        <div className={styles.composerRow}>
          <textarea
            className={styles.typeBox}
            value={draftText}
            onChange={(event) => setDraftText(event.target.value)}
            placeholder="Type a block…"
            aria-label="New text block"
            rows={2}
          />
          <div className={styles.composerButtons}>
            <Button size="sm" onClick={() => append.mutate(draftText.trim())} disabled={!draftText.trim() || append.isPending}>
              <Plus size={15} aria-hidden="true" />
              Add block
            </Button>
          </div>
        </div>
        <p className={styles.dictationHint}>
          Dictating with the bar at the bottom lands here: press Stop, then <strong>Add to open note</strong>.
        </p>
        {append.isError ? (
          <p className={styles.recorderError}>Could not add that block. Try again.</p>
        ) : null}
      </footer>

      <section className={styles.reminders} aria-label="Reminders for this note">
        <div className={styles.remindersHead}>
          <h2 className={styles.remindersTitle}>Reminders</h2>
          <p className={styles.remindersCount}>
            {remindersQuery.isPending
              ? 'Loading…'
              : reminders.length === 0
                ? 'Nothing scheduled for this note yet'
                : `${reminders.length} scheduled for this note`}
          </p>
        </div>

        {reminders.length > 0 ? (
          <ul className={styles.reminderList}>
            {reminders.map((reminder) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                isOverdue={overdueIds.has(reminder.id)}
                isDone={reminder.status === 'done'}
                onComplete={() => completeReminder.mutate(reminder.id)}
                onSnooze={() => snoozeReminder.mutate(reminder.id)}
                onDelete={() => deleteReminder.mutate(reminder.id)}
              />
            ))}
          </ul>
        ) : null}

        {reminderActionFailed ? (
          <p className={styles.recorderError} role="status">
            That reminder action did not go through. Try again.
          </p>
        ) : null}

        <ReminderForm noteId={id} heading={reminders.length > 0 ? 'Add another reminder' : 'Add a reminder'} />
      </section>

      <p className={styles.deleteNote}>
        Deleting moves this note to the Bin, where it stays for 30 days before permanent deletion.
      </p>
    </article>
  )
}

export default ViewNote
