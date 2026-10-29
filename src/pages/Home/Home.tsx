import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button/Button'
import { useRecorder } from '@/context/RecorderContext'
import { useCapture } from '@/hooks/useCapture'
import { usePageTitle } from '@/hooks/usePageTitle'
import { Capture } from '@/pages/shared/components/Capture/Capture'
import { NoteCard } from '@/pages/shared/components/NoteCard/NoteCard'
import { db } from '@/services/data-source'
import { queryKeys, refreshNoteViews } from '@/utils/queryKeys'
import { listTodayNotes } from './HomeApi.services'
import styles from './Home.module.css'

const longDate = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

function greetingFor(hour: number) {
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

export function Home() {
  usePageTitle('Home')
  const client = useQueryClient()
  const capture = useCapture()
  const recorder = useRecorder()
  const [today] = useState(() => new Date())

  const notesQuery = useQuery({
    queryKey: [...queryKeys.noteList, 'today'],
    queryFn: listTodayNotes,
  })

  const pinMutation = useMutation({
    mutationFn: (id: string) => db.notes.togglePin(id),
    onSuccess: () => refreshNoteViews(client),
  })
  const trashMutation = useMutation({
    mutationFn: (id: string) => db.notes.trash(id),
    onSuccess: () => refreshNoteViews(client),
  })

  const notes = notesQuery.data?.items ?? []

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>{greetingFor(today.getHours())}</h1>
        <p className={styles.date}>{longDate.format(today)}</p>
        <Capture
          onDictate={() => capture.createVoiceNote()}
          onNewNote={() => capture.createTextNote()}
          busy={recorder.status === 'requesting'}
        />
      </header>

      {notesQuery.isError ? (
        <div className={styles.errorState}>
          <p>Could not load today’s notes.</p>
          <Button variant="secondary" onClick={() => notesQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      <section className={styles.today} aria-label="Notes captured today">
        <div className={styles.todayHead}>
          <h2 className={styles.sectionTitle}>Today</h2>
          <p className={styles.count}>
            {notesQuery.isPending
              ? 'Loading…'
              : `${notes.length} note${notes.length === 1 ? '' : 's'}`}
          </p>
        </div>

        {notesQuery.isPending ? (
          <ul className={styles.grid} aria-busy="true">
            {[0, 1, 2, 3].map((index) => (
              <li key={index} className={`${styles.skel} skeleton`} />
            ))}
          </ul>
        ) : null}

        {!notesQuery.isPending && !notesQuery.isError && notes.length === 0 ? (
          <div className={styles.empty}>
            <p className={styles.emptyTitle}>Nothing captured today</p>
            <p className={styles.emptyHint}>
              Press Dictate above and the mic starts — every word becomes a note.
            </p>
          </div>
        ) : null}

        {notes.length > 0 ? (
          <ul className={styles.grid}>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onTogglePin={() => pinMutation.mutate(note.id)}
                onDelete={() => trashMutation.mutate(note.id)}
              />
            ))}
          </ul>
        ) : null}

        <Link to="/notes" className={styles.viewAll}>
          View all notes
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </section>
    </div>
  )
}

export default Home
