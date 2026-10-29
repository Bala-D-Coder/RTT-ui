import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { BIN_RETENTION_DAYS } from '@/constants/bin'
import { startPurgeScanner } from '@/services/data-source'
import { startReminderScanner } from '@/services/reminder-scanner'
import { localId } from '@/utils/format'
import { queryKeys, refreshNoteViews } from '@/utils/queryKeys'

export interface Toast {
  id: string
  title: string
  body: string
  to?: string
}

interface NotificationsValue {
  toasts: Toast[]
  push: (toast: Omit<Toast, 'id'>) => void
  dismiss: (id: string) => void
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const client = useQueryClient()

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((entry) => entry.id !== id))
  }, [])

  const push = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = localId('toast')
      setToasts((current) => [...current.slice(-2), { ...toast, id }])
      window.setTimeout(() => dismiss(id), 9000)
    },
    [dismiss],
  )

  const remind = useMemo(
    () => ({
      onDue: (title: string, noteId?: string) => {
        push({ title: 'Reminder', body: title, to: noteId ? `/notes/${noteId}` : undefined })
        client.invalidateQueries({ queryKey: queryKeys.reminders })
      },
      onPurge: (count: number) => {
        push({
          title: 'Bin cleared',
          body: `${count} note${count === 1 ? '' : 's'} passed the ${BIN_RETENTION_DAYS}-day limit and were deleted permanently.`,
          to: '/bin',
        })
        refreshNoteViews(client)
      },
    }),
    [client, push],
  )

  useEffect(() => {
    const stopReminders = startReminderScanner((event) => {
      if (event.type === 'reminder_due') remind.onDue(event.title, event.noteId)
    })
    const stopPurge = startPurgeScanner((count) => remind.onPurge(count))
    return () => {
      stopReminders()
      stopPurge()
    }
  }, [remind])

  const value: NotificationsValue = { toasts, push, dismiss }
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error('useNotifications must be used inside NotificationsProvider')
  return context
}
