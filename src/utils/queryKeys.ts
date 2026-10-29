import type { QueryClient } from '@tanstack/react-query'
import type { NoteQuery } from '@/types/contracts'

export const queryKeys = {
  notes: (query: NoteQuery = {}) => ['notes', query] as const,
  noteList: ['notes'] as const,
  note: (id: string) => ['note', id] as const,
  tags: ['note-tags'] as const,
  binList: ['bin'] as const,
  reminders: ['reminders'] as const,
  reminderList: (noteId?: string) => ['reminders', noteId ?? 'all'] as const,
}

/** Any note write can change the grid, the editor, Home's "Today" and the Bin count. */
export function refreshNoteViews(client: QueryClient) {
  client.invalidateQueries({ queryKey: queryKeys.noteList })
  client.invalidateQueries({ queryKey: ['note'] })
  client.invalidateQueries({ queryKey: queryKeys.binList })
  client.invalidateQueries({ queryKey: queryKeys.reminders })
}
