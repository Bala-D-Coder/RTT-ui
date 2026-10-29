import type { RouteObject } from 'react-router-dom'
import { createLazyRoute } from '@/route/route.helpers'

export const settingsRoutes: RouteObject[] = [
  { path: 'settings', ...createLazyRoute(() => import('./Settings')) },
]
