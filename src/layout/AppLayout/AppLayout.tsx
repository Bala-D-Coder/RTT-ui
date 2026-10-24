import { Outlet } from 'react-router-dom'
import { RecorderBar } from '@/components/RecorderBar/RecorderBar'
import { Sidebar } from '@/components/Sidebar/Sidebar'
import { Toaster } from '@/components/Toaster/Toaster'
import { RecorderProvider, useRecorder } from '@/context/RecorderContext'
import { NotificationsProvider } from '@/context/NotificationsContext'
import { isWebSpeechSupported } from '@/services/web-speech'
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
