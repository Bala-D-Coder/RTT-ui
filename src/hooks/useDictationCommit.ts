import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRecorder } from '@/context/RecorderContext'
import { db } from '@/services/data-source'
import { refreshNoteViews } from '@/utils/queryKeys'

function titleFrom(text: string) {
  const firstSentence = text.split(/(?<=[.。!?])\s/)[0] ?? text
  return firstSentence.slice(0, 60).trim()
}

/**
 * Two ways to commit one dictation: straight into a new note, or appended to the note
 * already open. Either way the transcript lands as plain text and the bar clears.
 */
export function useDictationCommit() {
  const recorder = useRecorder()
  const client = useQueryClient()

  const text = () => {
    if (!recorder.transcript) throw new Error('Nothing to save')
    return recorder.transcript
  }

  const saveAsNote = useMutation({
    mutationFn: async () => {
      const transcript = text()
      return db.notes.create({ title: titleFrom(transcript), body: [{ text: transcript, source: 'dictation' }] })
    },
    onSuccess: () => {
      refreshNoteViews(client)
      recorder.reset()
    },
  })

  const addToNote = useMutation({
    mutationFn: async (noteId: string) => {
      const body = text()
      return db.notes.appendBlock(noteId, { text: body, source: 'dictation' })
    },
    onSuccess: () => {
      refreshNoteViews(client)
      recorder.reset()
    },
  })

  return { saveAsNote, addToNote, busy: saveAsNote.isPending || addToNote.isPending, failed: saveAsNote.isError || addToNote.isError }
}
