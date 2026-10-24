import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useRecorder } from '@/context/RecorderContext'
import { db } from '@/services/data-source'
import type { Note } from '@/types/contracts'
import type { NewNoteInput } from '@/types/datasource'
import { refreshNoteViews } from '@/utils/queryKeys'

/**
 * `useCapture()` returns the two create paths. Both land in the editor, which owns
 * the autosave; `start:'dictation'` also opens the mic so the first words arrive
 * while the note is still empty.
 */
export function useCapture() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const recorder = useRecorder()

  async function open(note: Note, startDictation: boolean) {
    refreshNoteViews(client)
    navigate(`/notes/${note.id}`)
    if (startDictation && recorder.status !== 'listening') recorder.start()
  }

  return {
    async createTextNote(input: NewNoteInput = {}) {
      await open(await db.notes.create(input), false)
    },
    async createVoiceNote(input: NewNoteInput = {}) {
      await open(await db.notes.create({ title: 'Dictated note', ...input }), true)
    },
  }
}
