import { db } from '@/services/data-source'
import type { Note, NoteQuery, Page, Tag } from '@/types/contracts'
import type { NewBlockInput, NewNoteInput, NotePatch } from '@/types/datasource'

export async function listNotes(query: NoteQuery = {}): Promise<Page<Note>> {
  return db.notes.list(query)
}

export async function getNote(id: string): Promise<Note | null> {
  return db.notes.get(id)
}

export async function createNote(input: NewNoteInput = {}): Promise<Note> {
  return db.notes.create(input)
}

export async function updateNote(id: string, patch: NotePatch): Promise<Note> {
  return db.notes.update(id, patch)
}

export async function togglePin(id: string): Promise<Note> {
  return db.notes.togglePin(id)
}

export async function appendBlock(id: string, input: NewBlockInput): Promise<Note> {
  return db.notes.appendBlock(id, input)
}

export async function removeBlock(id: string, blockId: string): Promise<Note> {
  return db.notes.removeBlock(id, blockId)
}

/** Soft delete only — a live note can never be destroyed from the UI. */
export async function trashNote(id: string): Promise<Note> {
  return db.notes.trash(id)
}

export async function listTags(): Promise<Tag[]> {
  return db.notes.tags()
}

export async function ensureTag(name: string): Promise<Tag> {
  return db.notes.ensureTag(name)
}
