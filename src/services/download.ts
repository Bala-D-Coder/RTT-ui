import { env } from '@/constants/env'
import { getAccessToken } from './api-fetch'
import type { ExportFormat } from '@/types/contracts'

export async function downloadNote(id: string, format: ExportFormat = 'md'): Promise<void> {
  const baseUrl = env.apiUrl || ''
  const token = getAccessToken()
  const headers = new Headers()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${baseUrl}/api/v1/notes/${id}/export?format=${format}`, {
    headers,
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`Export failed with status ${res.status}`)
  }

  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  let filename = `note-${id}.${format}`

  if (disposition) {
    const match = disposition.match(/filename="?([^";]+)"?/i)
    if (match && match[1]) {
      filename = match[1]
    }
  }

  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}
