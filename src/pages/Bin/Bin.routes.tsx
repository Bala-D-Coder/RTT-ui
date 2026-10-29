import type { RouteObject } from 'react-router-dom'
import { createLazyRoute } from '@/route/route.helpers'

export const binRoutes: RouteObject[] = [{ path: 'bin', ...createLazyRoute(() => import('./Bin')) }]
