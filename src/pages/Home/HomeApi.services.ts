import { db } from '@/services/data-source'
import type { Note, Page } from '@/types/contracts'

export async function listTodayNotes(): Promise<Page<Note>> {
  return db.notes.list({ today: true, sort: 'updated' })
}
