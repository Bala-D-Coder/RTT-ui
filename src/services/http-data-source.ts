import { apiFetch } from './api-fetch'
import type {
  DataSource,
  NewBlockInput,
  NewNoteInput,
  NewReminderInput,
  NotePatch,
  ReminderPatch,
} from '@/types/datasource'
import type {
  Note,
  NoteQuery,
  Page,
  Reminder,
  ReminderQuery,
  Tag,
} from '@/types/contracts'

function buildQuery(params: Record<string, unknown>): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      q.set(key, String(value))
    }
  }
  const str = q.toString()
  return str ? `?${str}` : ''
}

export const httpDataSource: DataSource = {
  notes: {
    async list(query?: NoteQuery): Promise<Page<Note>> {
      const q = buildQuery(query ? { ...query } : {})
      return apiFetch<Page<Note>>(`/api/v1/notes${q}`)
    },

    async get(id: string): Promise<Note | null> {
      try {
        return await apiFetch<Note>(`/api/v1/notes/${id}`)
      } catch (err) {
        if ((err as { status?: number }).status === 404) return null
        throw err
      }
    },

    async create(input?: NewNoteInput): Promise<Note> {
      return apiFetch<Note>('/api/v1/notes', {
        method: 'POST',
        body: input ?? {},
      })
    },

    async update(id: string, patch: NotePatch): Promise<Note> {
      // Q1 Two-way diff:
      // 1. If scalars changed, PATCH /api/v1/notes/:id
      const scalarPayload: Record<string, unknown> = {}
      if (patch.title !== undefined) scalarPayload.title = patch.title
      if (patch.color !== undefined) scalarPayload.color = patch.color
      if (patch.pinned !== undefined) scalarPayload.pinned = patch.pinned

      if (Object.keys(scalarPayload).length > 0) {
        await apiFetch<Note>(`/api/v1/notes/${id}`, {
          method: 'PATCH',
          body: scalarPayload,
        })
      }

      // 2. If tags changed, PUT /api/v1/notes/:id/tags
      if (patch.tags !== undefined) {
        await apiFetch<Note>(`/api/v1/notes/${id}/tags`, {
          method: 'PUT',
          body: {
            tags: patch.tags,
            tagIds: patch.tags.map((t) => t.id),
          },
        })
      }

      // 3. If body changed, diff blocks:
      // Fetch current note to compare existing blocks
      if (patch.body !== undefined) {
        const current = await apiFetch<Note>(`/api/v1/notes/${id}`)
        const existingBlocks = current.body || []
        const patchedBlocks = patch.body || []

        // Deleted blocks: in existing but not in patched
        const patchedIds = new Set(patchedBlocks.map((b) => b.id).filter(Boolean))
        for (const existingBlock of existingBlocks) {
          if (!patchedIds.has(existingBlock.id)) {
            await apiFetch(`/api/v1/notes/${id}/blocks/${existingBlock.id}`, {
              method: 'DELETE',
            })
          }
        }

        // Updated blocks: in existing and patched, text changed
        const existingMap = new Map(existingBlocks.map((b) => [b.id, b]))
        for (const patchedBlock of patchedBlocks) {
          if (patchedBlock.id && existingMap.has(patchedBlock.id)) {
            const old = existingMap.get(patchedBlock.id)!
            if (old.text !== patchedBlock.text) {
              await apiFetch(`/api/v1/notes/${id}/blocks/${patchedBlock.id}`, {
                method: 'PUT',
                body: { text: patchedBlock.text },
              })
            }
          }
        }
      }

      return apiFetch<Note>(`/api/v1/notes/${id}`)
    },

    async appendBlock(id: string, input: NewBlockInput): Promise<Note> {
      return apiFetch<Note>(`/api/v1/notes/${id}/blocks`, {
        method: 'POST',
        body: input,
      })
    },

    async removeBlock(id: string, blockId: string): Promise<Note> {
      await apiFetch(`/api/v1/notes/${id}/blocks/${blockId}`, {
        method: 'DELETE',
      })
      return apiFetch<Note>(`/api/v1/notes/${id}`)
    },

    async togglePin(id: string): Promise<Note> {
      return apiFetch<Note>(`/api/v1/notes/${id}/pin`, {
        method: 'POST',
      })
    },

    async trash(id: string): Promise<Note> {
      return apiFetch<Note>(`/api/v1/notes/${id}`, {
        method: 'DELETE',
      })
    },

    async restore(id: string): Promise<Note> {
      return apiFetch<Note>(`/api/v1/notes/${id}/restore`, {
        method: 'POST',
      })
    },

    async purge(id: string): Promise<void> {
      await apiFetch(`/api/v1/notes/${id}/purge`, {
        method: 'DELETE',
      })
    },

    async emptyTrash(): Promise<{ purged: number }> {
      return apiFetch<{ purged: number }>('/api/v1/notes?scope=trashed', {
        method: 'DELETE',
      })
    },

    async purgeExpired(): Promise<number> {
      // No-op over HTTP (B13: server recycler runs daily sweep automatically)
      return 0
    },

    async tags(): Promise<Tag[]> {
      return apiFetch<Tag[]>('/api/v1/tags')
    },

    async ensureTag(name: string): Promise<Tag> {
      return apiFetch<Tag>('/api/v1/tags', {
        method: 'POST',
        body: { name },
      })
    },
  },

  reminders: {
    async list(query?: ReminderQuery): Promise<Page<Reminder>> {
      const q = buildQuery(query ? { ...query } : {})
      return apiFetch<Page<Reminder>>(`/api/v1/reminders${q}`)
    },

    async create(input: NewReminderInput): Promise<Reminder> {
      return apiFetch<Reminder>('/api/v1/reminders', {
        method: 'POST',
        body: input,
      })
    },

    async update(id: string, patch: ReminderPatch): Promise<Reminder> {
      return apiFetch<Reminder>(`/api/v1/reminders/${id}`, {
        method: 'PATCH',
        body: patch,
      })
    },

    async remove(id: string): Promise<void> {
      await apiFetch(`/api/v1/reminders/${id}`, {
        method: 'DELETE',
      })
    },

    async snooze(id: string, to: string): Promise<Reminder> {
      return apiFetch<Reminder>(`/api/v1/reminders/${id}/snooze`, {
        method: 'POST',
        body: { to },
      })
    },

    async complete(id: string): Promise<Reminder> {
      return apiFetch<Reminder>(`/api/v1/reminders/${id}/complete`, {
        method: 'POST',
      })
    },
  },

  async resetDemoData(): Promise<void> {
    await apiFetch('/api/v1/admin/reseed', {
      method: 'POST',
    })
  },
}
