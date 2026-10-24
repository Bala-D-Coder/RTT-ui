import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layout/AppLayout/AppLayout'
import { binRoutes } from '@/pages/Bin'
import { homeRoutes } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound/NotFound'
import { notesRoutes } from '@/pages/Notes'
import { settingsRoutes } from '@/pages/Settings'

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      ...homeRoutes,
      ...notesRoutes,
      ...binRoutes,
      ...settingsRoutes,
      { path: '*', element: <NotFound /> },
    ],
  },
])
