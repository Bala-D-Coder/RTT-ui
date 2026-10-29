import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { RecorderBar } from '@/components/RecorderBar/RecorderBar'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { Toaster } from '@/components/Toaster/Toaster'
import { RecorderProvider, useRecorder } from '@/context/RecorderContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { isWebSpeechSupported } from '@/services/web-speech'
import { useAuth } from '@/context/AuthContext'
import styles from './AppLayout.module.css'

function EngineNotice() {
  const { engine } = useRecorder()
  if (engine === 'webspeech' || isWebSpeechSupported()) return null
  return (
    <p className={styles.notice}>
      This browser has no speech recognition engine, so dictation replays a cached Hinglish take. The
      server ASR engine covers it from the API milestone.
    </p>
  )
}

export function AppLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--canvas)', color: 'var(--ink)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <img src="/ENGO-.Png" alt="EnGo" width={64} height={64} style={{ opacity: 0.9 }} />
          <span style={{ fontSize: '13px', color: 'var(--muted)', letterSpacing: '0.02em' }}>
            Verifying workspace credentials…
          </span>
        </div>
      </div>
    )
  }

  // Strict Login Guard: cannot access any protected routes without authentication
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return (
    <RecorderProvider>
      <NotificationsProvider>
        <div className={styles.shell}>
          <Sidebar />
          <main className={styles.main}>
            <div className={styles.content}>
              <EngineNotice />
              <Outlet />
            </div>
          </main>
          <RecorderBar />
          <Toaster />
        </div>
      </NotificationsProvider>
    </RecorderProvider>
  )
}
