import type {
  ISODate,
  Note,
  NoteColor,
  NoteQuery,
  Page,
  Reminder,
  ReminderQuery,
  ReminderRepeat,
  Tag,
} from '@/types/contracts'

export interface NewNoteInput {
  title?: string
  color?: NoteColor
  body?: NewBlockInput[]
}

export type NotePatch = Partial<
  Pick<Note, 'title' | 'color' | 'pinned' | 'body' | 'tags'>
>

export interface NewBlockInput {
  text: string
  source?: 'typed' | 'dictation'
  createdAt?: ISODate
}

export interface NewReminderInput {
  title: string
  dueAt: ISODate
  noteId?: string
  repeat?: ReminderRepeat
  weekdays?: number[]
}

export type ReminderPatch = Partial<
  Pick<Reminder, 'title' | 'dueAt' | 'noteId' | 'repeat' | 'weekdays' | 'status'>
>

/**
 * The whole persistence surface the UI is allowed to touch. `MockDataSource`
 * (localStorage) implements it now; the API milestone adds an `HttpDataSource`
 * behind the same shape, so no component changes.
 */
export interface DataSource {
  notes: {
    list(query?: NoteQuery): Promise<Page<Note>>
    get(id: string): Promise<Note | null>
    create(input?: NewNoteInput): Promise<Note>
    update(id: string, patch: NotePatch): Promise<Note>
    appendBlock(id: string, input: NewBlockInput): Promise<Note>
    removeBlock(id: string, blockId: string): Promise<Note>
    togglePin(id: string): Promise<Note>
    trash(id: string): Promise<Note>
    restore(id: string): Promise<Note>
    purge(id: string): Promise<void>
    emptyTrash(): Promise<{ purged: number }>
    purgeExpired(): Promise<number>
    tags(): Promise<Tag[]>
    /** Look a tag up by name, creating it when it is new, so notes share one identity per tag. */
    ensureTag(name: string): Promise<Tag>
  }
  reminders: {
    list(query?: ReminderQuery): Promise<Page<Reminder>>
    create(input: NewReminderInput): Promise<Reminder>
    update(id: string, patch: ReminderPatch): Promise<Reminder>
    remove(id: string): Promise<void>
    snooze(id: string, to: ISODate): Promise<Reminder>
    complete(id: string): Promise<Reminder>
  }
  resetDemoData(): Promise<void>
}
