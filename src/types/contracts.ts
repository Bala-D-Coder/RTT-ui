// Single source of truth for UI<->API shapes. When RTT-api is built this file is
// mirrored to RTT-api/src/modules/contracts.ts and drift-checked in CI.

export type ISODate = string

export interface Page<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface ApiError {
  error: { code: string; message: string; details?: unknown }
}

export interface User {
  id: string
  email: string
  name: string
  timezone: string
}

export interface Session {
  user: User
  accessToken: string
  refreshToken: string
}

export type NoteColor = 'sand' | 'coral' | 'violet' | 'aqua' | 'lime' | 'mint'

export interface Tag {
  id: string
  name: string
}

/**
 * A note is a list of text blocks. Dictation is transcribed and stored as text here —
 * there is no separate audio or transcription-session record to keep.
 */
export interface NoteBlock {
  id: string
  text: string
  createdAt: ISODate
}

export interface Note {
  id: string
  title: string
  body: NoteBlock[]
  color: NoteColor
  pinned: boolean
  tags: Tag[]
  createdAt: ISODate
  updatedAt: ISODate
  // Bin truth lives in these two fields only. A parallel `status` enum is the
  // classic drift bug (deletedAt=null while status='deleted'), so it is derived.
  deletedAt: ISODate | null
  purgeAt: ISODate | null
}

export type NoteScope = 'active' | 'trashed' | 'all'

export interface NoteQuery {
  q?: string
  tag?: string
  color?: NoteColor
  scope?: NoteScope
  today?: boolean
  sort?: 'updated' | 'created' | 'title' | 'purged'
  page?: number
  pageSize?: number
}

export type ReminderRepeat = 'none' | 'daily' | 'weekly' | 'weekdays'
export type ReminderStatus = 'pending' | 'sent' | 'snoozed' | 'done' | 'failed'

export interface Reminder {
  id: string
  noteId?: string
  title: string
  dueAt: ISODate
  timezone: string
  repeat: ReminderRepeat
  weekdays?: number[]
  status: ReminderStatus
  createdAt: ISODate
}

export interface ReminderQuery {
  scope?: 'upcoming' | 'all'
  noteId?: string
}

export type RecorderState = 'idle' | 'requesting' | 'listening' | 'error'

export type TranscribeSource = 'webspeech' | 'whisper' | 'gemini'

export type WsTranscribeEvent =
  | { type: 'ready'; sessionId: string }
  | { type: 'partial'; text: string; source: TranscribeSource; ts: number }
  | {
      type: 'final'
      seq: number
      text: string
      startMs: number
      endMs: number
      confidence?: number
      lang?: string
    }
  | { type: 'error'; code: string; message: string; retryable: boolean }
  | { type: 'closed'; reason: string }

export type WsNotificationEvent =
  | { type: 'reminder_due'; reminderId: string; title: string; noteId?: string }
  | { type: 'note_updated'; noteId: string }
  | { type: 'reconnected'; missed: number }
