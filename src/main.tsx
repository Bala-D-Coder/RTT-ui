import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { appRouter } from '@/route/app.route'
import { applyTheme, themeChoice } from '@/services/theme'
import '@/index.css'

// Before the first paint, otherwise a dark preference flashes white.
applyTheme(themeChoice())

const queryClient = new QueryClient({
  defaultOptions: {
    // retry 1 keeps the ?fail=1 demo honest and quick instead of eight seconds of skeleton.
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={appRouter} />
    </QueryClientProvider>
  </StrictMode>,
)
