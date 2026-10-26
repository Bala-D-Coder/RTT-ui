import { isPurgeDue, purgeDateFor } from '@/constants/bin'
import type {
  ISODate,
  Note,
  NoteBlock,
  NoteQuery,
  Page,
  Reminder,
  ReminderQuery,
  Tag,
} from '@/types/contracts'
import type {
  DataSource,
  NewBlockInput,
  NewNoteInput,
  NewReminderInput,
  NotePatch,
  ReminderPatch,
} from '@/types/datasource'
import { localId } from '@/utils/format'
import { seedNotes, seedReminders } from './seed-data'

const STORAGE_KEY = 'voice-notes.v2'
const DAY_MS = 86_400_000

interface StoreShape {
  notes: Note[]
  reminders: Reminder[]
}

function freshStore(): StoreShape {
  return { notes: seedNotes(), reminders: seedReminders() }
}

function readStore(): StoreShape {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshStore()
    const parsed = JSON.parse(raw) as Partial<StoreShape>
    if (!Array.isArray(parsed.notes) || !Array.isArray(parsed.reminders)) return freshStore()
    return { notes: parsed.notes, reminders: parsed.reminders }
  } catch {
    return freshStore()
  }
}

let store: StoreShape = readStore()

function persist() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Quota or private-mode failures must not take the UI down; the in-memory store still works.
  }
}

const failMode = new URLSearchParams(window.location.search).get('fail') === '1'

function latency() {
  return 160 + Math.floor(Math.random() * 160)
}

async function call<T>(run: () => T, ms = latency()): Promise<T> {
  await new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
  if (failMode) throw new Error('Simulated failure (?fail=1)')
  const value = run()
  persist()
  return value
}

function startOfToday() {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now.getTime()
}

function isBinned(note: Note | undefined) {
  return Boolean(note?.deletedAt)
}

function mustFind(id: string): Note {
  const note = store.notes.find((entry) => entry.id === id)
  if (!note) throw new Error('Note not found')
  return note
}

function textOf(note: Note) {
  return [note.title, ...note.body.map((entry) => entry.text)].join(' ').toLowerCase()
}

const COLOR_ORDER: Note['color'][] = ['sand', 'coral', 'violet', 'aqua', 'lime', 'mint']

function nextColor() {
  return COLOR_ORDER[store.notes.filter((note) => !note.deletedAt).length % COLOR_ORDER.length] ?? 'sand'
}

function newBlock(input: NewBlockInput): NoteBlock {
  return {
    id: localId('blk'),
    text: input.text,
    source: input.source ?? 'typed',
    createdAt: input.createdAt ?? new Date().toISOString(),
  }
}

function matchesScope(note: Note, scope: NoteQuery['scope']) {
  if (scope === 'trashed') return Boolean(note.deletedAt)
  if (scope === 'all') return true
  return !note.deletedAt
}

function compare(a: Note, b: Note, sort: NoteQuery['sort']) {
  if (sort === 'purged') {
    return new Date(a.deletedAt ?? 0).getTime() - new Date(b.deletedAt ?? 0).getTime()
  }
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  if (sort === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  if (sort === 'title') return (a.title || 'Untitled').localeCompare(b.title || 'Untitled')
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
}

function isReminderSilenced(reminder: Reminder) {
  if (!reminder.noteId) return false
  return isBinned(store.notes.find((note) => note.id === reminder.noteId))
}

function nextDueAt(reminder: Reminder): ISODate {
  const from = new Date(reminder.dueAt).getTime()
  const cursor = new Date(Math.max(from, Date.now()))
  for (let step = 1; step <= 8; step += 1) {
    cursor.setDate(cursor.getDate() + 1)
    if (reminder.repeat === 'daily') return cursor.toISOString()
    const weekday = ((cursor.getDay() + 6) % 7) + 1
    const wanted = reminder.repeat === 'weekdays' ? [1, 2, 3, 4, 5] : (reminder.weekdays ?? [cursor.getDay()])
    if (wanted.includes(weekday)) return cursor.toISOString()
  }
  return new Date(from + 7 * DAY_MS).toISOString()
}

export const mockDataSource: DataSource = {
  notes: {
    list(query: NoteQuery = {}) {
      return call(() => {
        const needle = query.q?.trim().toLowerCase() ?? ''
        const from = startOfToday()
        const items = store.notes
          .filter((note) => matchesScope(note, query.scope))
          .filter((note) => (query.tag ? note.tags.some((tag) => tag.name === query.tag) : true))
          .filter((note) => (query.color ? note.color === query.color : true))
          .filter((note) => (query.today ? new Date(note.updatedAt).getTime() >= from : true))
          .filter((note) => (query.source === 'dictation' ? note.body.some((b) => b.source === 'dictation') : true))
          .filter((note) => (needle ? textOf(note).includes(needle) : true))
          .sort((a, b) => compare(a, b, query.sort))
        return { items, page: 1, pageSize: items.length, total: items.length } satisfies Page<Note>
      })
    },

    get(id) {
      return call(() => store.notes.find((note) => note.id === id) ?? null, 120)
    },

    create(input: NewNoteInput = {}) {
      return call(() => {
        const now = new Date().toISOString()
        const note: Note = {
          id: localId('note'),
          title: input.title ?? '',
          body: (input.body ?? []).map(newBlock),
          color: input.color ?? nextColor(),
          pinned: false,
          tags: [],
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          purgeAt: null,
        }
        store = { ...store, notes: [note, ...store.notes] }
        return note
      }, 140)
    },

    update(id, patch: NotePatch) {
      return call(() => {
        const current = mustFind(id)
        const next: Note = { ...current, ...patch, updatedAt: new Date().toISOString() }
        store = { ...store, notes: store.notes.map((note) => (note.id === id ? next : note)) }
        return next
      }, 140)
    },

    appendBlock(id, input: NewBlockInput) {
      return call(() => {
        const current = mustFind(id)
        const next: Note = {
          ...current,
          body: [...current.body, newBlock(input)],
          updatedAt: new Date().toISOString(),
        }
        store = { ...store, notes: store.notes.map((note) => (note.id === id ? next : note)) }
        return next
      }, 120)
    },

    removeBlock(id, blockId) {
      return call(() => {
        const current = mustFind(id)
        const next: Note = {
          ...current,
          body: current.body.filter((entry) => entry.id !== blockId),
          updatedAt: new Date().toISOString(),
        }
        store = { ...store, notes: store.notes.map((note) => (note.id === id ? next : note)) }
        return next
      }, 120)
    },

    togglePin(id) {
      const current = mustFind(id)
      return mockDataSource.notes.update(id, { pinned: !current.pinned })
    },

    trash(id) {
      return call(() => {
        const current = mustFind(id)
        // Idempotent: re-deleting from the Bin must not restart the 30-day clock.
        if (current.deletedAt) return current
        const deletedAt = new Date().toISOString()
        const next: Note = { ...current, deletedAt, purgeAt: purgeDateFor(deletedAt) }
        store = { ...store, notes: store.notes.map((note) => (note.id === id ? next : note)) }
        return next
      }, 130)
    },

    restore(id) {
      return call(() => {
        const current = mustFind(id)
        const next: Note = { ...current, deletedAt: null, purgeAt: null, updatedAt: new Date().toISOString() }
        store = { ...store, notes: store.notes.map((note) => (note.id === id ? next : note)) }
        return next
      }, 130)
    },

    purge(id) {
      return call(() => {
        store = {
          notes: store.notes.filter((note) => note.id !== id),
          // Reminders outlive nothing: an unattached reminder would fire for a note that cannot exist.
          reminders: store.reminders.filter((reminder) => reminder.noteId !== id),
        }
      }, 150)
    },

    emptyTrash() {
      return call(() => {
        const doomed = store.notes.filter((note) => note.deletedAt)
        const doomedIds = new Set(doomed.map((note) => note.id))
        store = {
          notes: store.notes.filter((note) => !note.deletedAt),
          reminders: store.reminders.filter((reminder) => !reminder.noteId || !doomedIds.has(reminder.noteId)),
        }
        return { purged: doomed.length }
      }, 200)
    },

    purgeExpired() {
      const expired = store.notes.filter((note) => isPurgeDue(note.purgeAt))
      if (expired.length === 0) return Promise.resolve(0)
      return call(() => {
        const expiredIds = new Set(expired.map((note) => note.id))
        store = {
          notes: store.notes.filter((note) => !isPurgeDue(note.purgeAt)),
          reminders: store.reminders.filter((reminder) => !reminder.noteId || !expiredIds.has(reminder.noteId)),
        }
        return expired.length
      }, 60)
    },

    tags() {
      return call(() => {
        const seen = new Map<string, Tag>()
        for (const note of store.notes) {
          if (note.deletedAt) continue
          for (const tag of note.tags) seen.set(tag.name, tag)
        }
        return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
      }, 90)
    },

    ensureTag(name) {
      const clean = name.trim().replace(/^#/, '')
      if (!clean) return Promise.reject(new Error('Tag name is empty'))
      return call(() => {
        for (const note of store.notes) {
          const match = note.tags.find((tag) => tag.name.toLowerCase() === clean.toLowerCase())
          if (match) return match
        }
        return { id: localId('tag'), name: clean } satisfies Tag
      }, 90)
    },
  },

  reminders: {
    list(query: ReminderQuery = {}) {
      return call(() => {
        let items = [...store.reminders]
        if (query.noteId) items = items.filter((reminder) => reminder.noteId === query.noteId)
        if (query.scope === 'upcoming') {
          items = items.filter(
            (reminder) =>
              (reminder.status === 'pending' || reminder.status === 'snoozed') && !isReminderSilenced(reminder),
          )
          items.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
        } else {
          // Pending work attached to a binned note stays silent until the note is restored.
          items = items.filter(
            (reminder) => reminder.status === 'done' || !isReminderSilenced(reminder),
          )
          items.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
        }
        return { items, page: 1, pageSize: items.length, total: items.length } satisfies Page<Reminder>
      })
    },

    create(input: NewReminderInput) {
      return call(() => {
        const reminder: Reminder = {
          id: localId('rem'),
          noteId: input.noteId,
          title: input.title,
          dueAt: input.dueAt,
          timezone: 'Asia/Kolkata',
          repeat: input.repeat ?? 'none',
          weekdays: input.weekdays,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
        store = { ...store, reminders: [...store.reminders, reminder] }
        return reminder
      }, 150)
    },

    update(id, patch: ReminderPatch) {
      return call(() => {
        const current = store.reminders.find((reminder) => reminder.id === id)
        if (!current) throw new Error('Reminder not found')
        const next: Reminder = { ...current, ...patch }
        store = { ...store, reminders: store.reminders.map((entry) => (entry.id === id ? next : entry)) }
        return next
      }, 140)
    },

    remove(id) {
      return call(() => {
        store = { ...store, reminders: store.reminders.filter((reminder) => reminder.id !== id) }
      }, 130)
    },

    snooze(id, to) {
      return mockDataSource.reminders.update(id, { dueAt: to, status: 'pending' })
    },

    complete(id) {
      return call(() => {
        const current = store.reminders.find((reminder) => reminder.id === id)
        if (!current) throw new Error('Reminder not found')
        const repeats = current.repeat !== 'none'
        const next: Reminder = repeats
          ? { ...current, status: 'pending', dueAt: nextDueAt(current) }
          : { ...current, status: 'done' }
        store = { ...store, reminders: store.reminders.map((entry) => (entry.id === id ? next : entry)) }
        return next
      }, 130)
    },
  },

  resetDemoData() {
    return call(() => {
      store = freshStore()
      persist()
    }, 80)
  },
}
