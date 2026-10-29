import type { Reminder, WsNotificationEvent } from '@/types/contracts'
import { db } from './data-source'

/**
 * Client-side stand-in for the server scheduler: it can only fire while a tab is
 * open, which is exactly the WebSocket channel's job later. The event shape is the
 * one `/ws/notifications` will emit, so the UI does not change when it lands.
 */
export function startReminderScanner(emit: (event: WsNotificationEvent) => void) {
  const tick = async () => {
    try {
      const { items } = await db.reminders.list({ scope: 'upcoming' })
      const now = Date.now()
      const due = items.filter((reminder: Reminder) => new Date(reminder.dueAt).getTime() <= now)
      for (const reminder of due) {
        await db.reminders.update(reminder.id, { status: 'sent' })
        emit({ type: 'reminder_due', reminderId: reminder.id, title: reminder.title, noteId: reminder.noteId })
      }
    } catch {
      // A failed sweep must not spam toasts; the next tick retries.
    }
  }

  void tick()
  const id = window.setInterval(() => void tick(), 20_000)
  return () => window.clearInterval(id)
}
