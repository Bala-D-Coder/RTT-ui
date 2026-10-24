import type { RouteObject } from 'react-router-dom'
import { createLazyRoute } from '@/route/route.helpers'

export const homeRoutes: RouteObject[] = [
  { index: true, ...createLazyRoute(() => import('./Home')) },
]
