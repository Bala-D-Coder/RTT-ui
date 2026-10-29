import { db } from '@/services/data-source'
import type { Note, Page } from '@/types/contracts'

export async function listBinned(): Promise<Page<Note>> {
  return db.notes.list({ scope: 'trashed', sort: 'purged' })
}

export async function restoreNote(id: string): Promise<Note> {
  return db.notes.restore(id)
}

export async function purgeNote(id: string): Promise<void> {
  return db.notes.purge(id)
}

export async function emptyBin(): Promise<{ purged: number }> {
  return db.notes.emptyTrash()
}
