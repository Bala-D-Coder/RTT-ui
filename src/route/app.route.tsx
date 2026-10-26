import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '@/layout/AppLayout/AppLayout'
import { binRoutes } from '@/pages/Bin'
import { homeRoutes } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound/NotFound'
import { notesRoutes } from '@/pages/Notes'
import { settingsRoutes } from '@/pages/Settings'
import { Login } from '@/pages/Login/Login'
import { Admin } from '@/pages/Admin/Admin'
import { HireMe } from '@/pages/HireMe/HireMe'

export const appRouter = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      ...homeRoutes,
      ...notesRoutes,
      ...binRoutes,
      ...settingsRoutes,
      { path: 'hire-me', element: <HireMe /> },
      { path: 'admin', element: <Admin /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])
