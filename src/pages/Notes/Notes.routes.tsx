import type { RouteObject } from 'react-router-dom'
import { createLazyRoute } from '@/route/route.helpers'

export const notesRoutes: RouteObject[] = [
  { path: 'notes', ...createLazyRoute(() => import('./Notes')) },
  { path: 'notes/:noteId', ...createLazyRoute(() => import('./pages/ViewNote/ViewNote')) },
]
