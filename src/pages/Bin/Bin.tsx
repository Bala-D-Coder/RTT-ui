import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import { useModal } from '@/context/ModalContext'
import { BIN_RETENTION_DAYS } from '@/constants/bin'
import { usePageTitle } from '@/hooks/usePageTitle'
import { queryKeys, refreshNoteViews } from '@/utils/queryKeys'
import { BinnedRow } from './components/BinnedRow/BinnedRow'
import { emptyBin, listBinned, purgeNote, restoreNote } from './BinApi.services'
import styles from './Bin.module.css'

export function Bin() {
  usePageTitle('Bin')
  const client = useQueryClient()
  const modal = useModal()

  const binQuery = useQuery({ queryKey: queryKeys.binList, queryFn: listBinned })

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreNote(id),
    onSuccess: () => refreshNoteViews(client),
  })
  const purgeMutation = useMutation({
    mutationFn: (id: string) => purgeNote(id),
    onSuccess: () => refreshNoteViews(client),
  })
  const emptyMutation = useMutation({
    mutationFn: () => emptyBin(),
    onSuccess: () => {
      refreshNoteViews(client)
    },
  })

  const notes = binQuery.data?.items ?? []
  const busy = restoreMutation.isPending || purgeMutation.isPending
  const actionFailed = restoreMutation.isError || purgeMutation.isError || emptyMutation.isError

  async function handleEmptyBin() {
    const ok = await modal.confirm({
      title: 'Empty Bin',
      message: `Permanently delete all ${notes.length} note${notes.length === 1 ? '' : 's'} currently in the bin? This action cannot be undone.`,
      confirmText: 'Empty Bin Forever',
      cancelText: 'Cancel',
      variant: 'danger',
    })
    if (ok) {
      emptyMutation.mutate()
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.headMain}>
          <h1 className={styles.title}>Bin</h1>
          <p className={styles.subtitle}>
            Notes in the Bin are deleted forever after {BIN_RETENTION_DAYS} days.
          </p>
          <p className={styles.count}>
            {binQuery.isPending
              ? 'Loading…'
              : `${notes.length} note${notes.length === 1 ? '' : 's'}`}
          </p>
        </div>

        <div className={styles.headActions}>
          <Button
            variant="secondary"
            onClick={handleEmptyBin}
            disabled={notes.length === 0 || emptyMutation.isPending}
          >
            <Trash2 size={15} aria-hidden="true" />
            Empty bin
          </Button>
        </div>
      </header>

      {binQuery.isError ? (
        <div className={styles.errorState}>
          <p>Could not load the Bin.</p>
          <Button variant="secondary" onClick={() => binQuery.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}

      {actionFailed ? (
        <p className={styles.actionError} role="status">
          That action did not go through. Try again.
        </p>
      ) : null}

      {binQuery.isPending ? (
        <ul className={styles.list} aria-busy="true">
          {[0, 1, 2].map((index) => (
            <li key={index} className={`${styles.skel} skeleton`} />
          ))}
        </ul>
      ) : null}

      {!binQuery.isPending && !binQuery.isError && notes.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>The Bin is empty.</p>
          <p className={styles.emptyHint}>
            Notes you delete from anywhere else land here first, and stay for{' '}
            {BIN_RETENTION_DAYS} days before they are purged.
          </p>
        </div>
      ) : null}

      {notes.length > 0 ? (
        <ul className={styles.list}>
          {notes.map((note) => (
            <BinnedRow
              key={note.id}
              note={note}
              busy={busy}
              onRestore={() => restoreMutation.mutate(note.id)}
              onDeleteForever={() => purgeMutation.mutate(note.id)}
            />
          ))}
        </ul>
      ) : null}

      <p className={styles.footnote}>
        Purging is automatic: a note that passes {BIN_RETENTION_DAYS} days in the Bin is removed the
        next time the app runs. The API milestone moves that job to a daily server-side worker so it
        happens even when nobody has the app open.
      </p>
    </div>
  )
}

export default Bin
