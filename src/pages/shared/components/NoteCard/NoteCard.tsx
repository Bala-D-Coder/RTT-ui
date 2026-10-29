import { Link } from 'react-router-dom'
import { Pin, Trash2 } from 'lucide-react'
import type { Note } from '@/types/contracts'
import { formatDate, formatRelativeTime } from '@/utils/format'
import styles from './NoteCard.module.css'

export interface NoteCardProps {
  note: Note
  dense?: boolean
  onTogglePin: () => void
  onDelete: () => void
}

function isToday(iso: string) {
  const then = new Date(iso)
  const now = new Date()
  return then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth() && then.getDate() === now.getDate()
}

export function NoteCard({ note, dense, onTogglePin, onDelete }: NoteCardProps) {
  const preview = note.body.map((entry) => entry.text).join(' ')

  return (
    <li className={styles.item}>
      <article className={styles.card} data-color={note.color} data-dense={dense ? 'true' : 'false'}>
        <div className={styles.body}>
          <h3 className={styles.heading}>
            <Link to={`/notes/${note.id}`} className={styles.open}>
              {note.title.trim() || 'Untitled note'}
            </Link>
          </h3>
          <p className={styles.preview}>{preview || 'Empty note — press the mic to fill it.'}</p>
        </div>

        <footer className={styles.footer}>
          <time className={styles.date} dateTime={note.updatedAt}>
            {isToday(note.updatedAt) ? formatRelativeTime(note.updatedAt) : formatDate(note.updatedAt)}
          </time>
          {note.tags.slice(0, 2).map((tag) => (
            <span key={tag.id} className={styles.tag}>
              {tag.name}
            </span>
          ))}
          <span className={styles.actions}>
            <button
              type="button"
              className={styles.iconButton}
              data-active={note.pinned}
              onClick={onTogglePin}
              aria-pressed={note.pinned}
              aria-label={note.pinned ? 'Unpin note' : 'Pin note'}
            >
              <Pin size={14} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.iconButton}
              onClick={onDelete}
              aria-label="Move note to bin"
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </span>
        </footer>
      </article>
    </li>
  )
}
