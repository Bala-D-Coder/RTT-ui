import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useNotifications } from '@/context/NotificationsContext'
import styles from './Toaster.module.css'

export function Toaster() {
  const { toasts, dismiss } = useNotifications()
  const navigate = useNavigate()

  if (toasts.length === 0) return null

  return (
    <div className={styles.wrap} role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={styles.toast}>
          <button
            type="button"
            className={styles.body}
            onClick={() => {
              dismiss(toast.id)
              if (toast.to) navigate(toast.to)
            }}
          >
            <span className={styles.title}>{toast.title}</span>
            <span className={styles.text}>{toast.body}</span>
          </button>
          <button type="button" className={styles.close} onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  )
}
