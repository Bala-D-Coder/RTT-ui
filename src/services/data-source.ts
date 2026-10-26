import { env } from '@/constants/env'
import type { DataSource } from '@/types/datasource'
import { mockDataSource } from './mock-data-source'
import { httpDataSource } from './http-data-source'

/**
 * The single persistence seam. Components and page services import `db` and never
 * touch storage directly, so the API milestone only replaces this factory.
 */
export const db: DataSource = createDataSource()

function createDataSource(): DataSource {
  if (env.dataSource === 'http') {
    return httpDataSource
  }
  return mockDataSource
}

/**
 * Mirrors the server's daily recycler (`purge_at <= now()`), scoped to the open tab.
 * Returns how many notes were purged so the shell can toast about it.
 */
export function startPurgeScanner(onPurge?: (count: number) => void) {
  const sweep = () => {
    void db.notes.purgeExpired().then((count) => {
      if (count > 0) onPurge?.(count)
    })
  }
  sweep()
  const id = window.setInterval(sweep, 60_000)
  return () => window.clearInterval(id)
}
