import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LayoutGrid, List, X } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import { useCapture } from '@/hooks/useCapture'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Capture } from '@/pages/shared/components/Capture/Capture'
import { NoteCard } from '@/pages/shared/components/NoteCard/NoteCard'
import { listNotes, listTags, togglePin, trashNote } from './NotesApi.services'
import type { NoteQuery } from '@/types/contracts'
import { cx } from '@/utils/format'
import { queryKeys, refreshNoteViews } from '@/utils/queryKeys'
import styles from './Notes.module.css'

type SortKey = 'updated' | 'created' | 'title'

const SORT_LABELS: Record<SortKey, string> = {
  updated: 'Last edited',
  created: 'Date created',
  title: 'Title',
}

export function Notes() {
  usePageTitle('Notes')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('updated')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const queryClient = useQueryClient()
  const capture = useCapture()

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(search), 250)
    return () => window.clearTimeout(id)
  }, [search])

  const query = useMemo<NoteQuery>(() => ({ q: debounced, tag: tag ?? undefined, sort }), [debounced, tag, sort])

  const notesQuery = useQuery({ queryKey: queryKeys.notes(query), queryFn: () => listNotes(query) })
  const tagsQuery = useQuery({ queryKey: queryKeys.tags, queryFn: listTags })

  const refresh = () => refreshNoteViews(queryClient)
  const pinMutation = useMutation({ mutationFn: togglePin, onSuccess: refresh })
  const trashMutation = useMutation({ mutationFn: trashNote, onSuccess: refresh })

  const notes = notesQuery.data?.items ?? []
  const filters = tag ? [tag].join(' ') : ''

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Notes</h1>
          <p className={styles.subtitle}>
            {notesQuery.isPending
              ? 'Loading…'
              : `${notes.length} note${notes.length === 1 ? '' : 's'}${filters ? ` tagged ${filters}` : ''}`}
          </p>
        </div>

        <div className={styles.tools}>
          <input
            className={styles.search}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search notes"
            aria-label="Search notes"
          />
          <select
            className={styles.select}
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Sort notes"
          >
            {Object.entries(SORT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView((current) => (current === 'grid' ? 'list' : 'grid'))}
            aria-label={view === 'grid' ? 'Switch to list view' : 'Switch to grid view'}
            aria-pressed={view === 'list'}
          >
            {view === 'grid' ? <List size={16} aria-hidden="true" /> : <LayoutGrid size={16} aria-hidden="true" />}
          </Button>
        </div>
      </header>

      <div className={styles.filters}>
        <Capture
          onDictate={() => void capture.createVoiceNote()}
          onNewNote={() => void capture.createTextNote()}
          busy={notesQuery.isFetching}
        />
        <div className={styles.pills}>
          {(tagsQuery.data ?? []).map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={styles.pill}
              data-active={tag === entry.name}
              onClick={() => setTag((current) => (current === entry.name ? null : entry.name))}
              aria-pressed={tag === entry.name}
            >
              {entry.name}
            </button>
          ))}
          {tag ? (
            <button type="button" className={styles.clear} onClick={() => setTag(null)}>
              <X size={13} aria-hidden="true" />
              Clear filter
            </button>
          ) : null}
        </div>
      </div>

      {notesQuery.isError ? (
        <div className={styles.errorState}>
          <p>Could not load your notes.</p>
          <Button variant="secondary" onClick={() => notesQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {notesQuery.isPending ? (
        <ul className={styles.grid} aria-busy="true">
          {[0, 1, 2, 3].map((index) => (
            <li key={index} className={`${styles.skel} skeleton`} />
          ))}
        </ul>
      ) : null}

      {!notesQuery.isPending && !notesQuery.isError && notes.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>{debounced || tag ? 'No matching notes' : 'No notes yet'}</p>
          <p className={styles.emptyHint}>
            {debounced || tag
              ? 'Try a different word, or clear the filter.'
              : 'Dictate a note with the mic, or start one with the pen.'}
          </p>
        </div>
      ) : null}

      {notes.length > 0 ? (
        <ul className={cx(styles.grid, view === 'list' && styles.list)}>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              dense={view === 'list'}
              onTogglePin={() => pinMutation.mutate(note.id)}
              onDelete={() => trashMutation.mutate(note.id)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default Notes
