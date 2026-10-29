import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from 'lucide-react'
import styles from '@/components/Modal/Modal.module.css'

export type ModalVariant = 'danger' | 'warning' | 'info' | 'success' | 'primary'

export interface ConfirmOptions {
  title?: string
  message: ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ModalVariant
  icon?: ReactNode
}

export interface AlertOptions {
  title?: string
  message: ReactNode
  confirmText?: string
  variant?: ModalVariant
  icon?: ReactNode
}

export interface ModalContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
  alert: (options: AlertOptions | string) => Promise<void>
  close: () => void
}

interface ActiveModalState {
  type: 'confirm' | 'alert'
  title: string
  message: ReactNode
  confirmText: string
  cancelText: string
  variant: ModalVariant
  icon?: ReactNode
  resolve: (value: boolean) => void
}

const ModalContext = createContext<ModalContextValue | null>(null)

export function ModalProvider({ children }: { children: ReactNode }) {
  const [activeModal, setActiveModal] = useState<ActiveModalState | null>(null)
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    if (activeModal) {
      activeModal.resolve(false)
      setActiveModal(null)
    }
  }, [activeModal])

  const handleConfirm = useCallback(() => {
    if (activeModal) {
      activeModal.resolve(true)
      setActiveModal(null)
    }
  }, [activeModal])

  const handleCancel = useCallback(() => {
    if (activeModal) {
      activeModal.resolve(false)
      setActiveModal(null)
    }
  }, [activeModal])

  const confirm = useCallback((options: ConfirmOptions | string): Promise<boolean> => {
    const normalized: ConfirmOptions =
      typeof options === 'string' ? { message: options } : options

    return new Promise<boolean>((resolve) => {
      setActiveModal({
        type: 'confirm',
        title: normalized.title || 'Are you sure?',
        message: normalized.message,
        confirmText: normalized.confirmText || 'Confirm',
        cancelText: normalized.cancelText || 'Cancel',
        variant: normalized.variant || 'danger',
        icon: normalized.icon,
        resolve,
      })
    })
  }, [])

  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    const normalized: AlertOptions =
      typeof options === 'string' ? { message: options } : options

    return new Promise<void>((resolve) => {
      setActiveModal({
        type: 'alert',
        title: normalized.title || 'Notice',
        message: normalized.message,
        confirmText: normalized.confirmText || 'Got it',
        cancelText: '',
        variant: normalized.variant || 'info',
        icon: normalized.icon,
        resolve: () => resolve(),
      })
    })
  }, [])

  // Auto focus confirm button when modal opens
  useEffect(() => {
    if (activeModal) {
      const prevActive = document.activeElement as HTMLElement | null
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      const timer = window.setTimeout(() => {
        confirmBtnRef.current?.focus()
      }, 50)

      function handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
          e.preventDefault()
          handleCancel()
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => {
        window.clearTimeout(timer)
        window.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = originalOverflow
        prevActive?.focus?.()
      }
    }
  }, [activeModal, handleCancel])

  // Provide a global window bridge so even uncaught window.alert calls trigger custom alert
  useEffect(() => {
    const originalAlert = window.alert
    window.alert = (msg?: unknown) => {
      void alert(String(msg ?? ''))
    }
    return () => {
      window.alert = originalAlert
    }
  }, [alert])

  function renderDefaultIcon(variant: ModalVariant) {
    switch (variant) {
      case 'danger':
        return <AlertCircle size={22} aria-hidden="true" />
      case 'warning':
        return <AlertTriangle size={22} aria-hidden="true" />
      case 'success':
        return <CheckCircle2 size={22} aria-hidden="true" />
      case 'info':
      default:
        return <Info size={22} aria-hidden="true" />
    }
  }

  return (
    <ModalContext.Provider value={{ confirm, alert, close }}>
      {children}
      {activeModal &&
        createPortal(
          <div
            className={styles.backdrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) handleCancel()
            }}
            role="presentation"
          >
            <div
              className={styles.modal}
              role={activeModal.type === 'confirm' ? 'alertdialog' : 'dialog'}
              aria-modal="true"
              aria-labelledby="custom-modal-title"
              aria-describedby="custom-modal-desc"
            >
              <button
                type="button"
                className={styles.closeBtn}
                onClick={handleCancel}
                aria-label="Close modal"
              >
                <X size={16} aria-hidden="true" />
              </button>

              <div className={styles.header}>
                <div className={styles.iconWrap} data-variant={activeModal.variant}>
                  {activeModal.icon ?? renderDefaultIcon(activeModal.variant)}
                </div>
                <div className={styles.headerContent}>
                  <h3 id="custom-modal-title" className={styles.title}>
                    {activeModal.title}
                  </h3>
                </div>
              </div>

              <div id="custom-modal-desc" className={styles.body}>
                {activeModal.message}
              </div>

              <div className={styles.footer}>
                {activeModal.type === 'confirm' && (
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={handleCancel}
                  >
                    {activeModal.cancelText}
                  </button>
                )}
                <button
                  ref={confirmBtnRef}
                  type="button"
                  className={styles.btnConfirm}
                  data-variant={activeModal.variant}
                  onClick={handleConfirm}
                >
                  {activeModal.confirmText}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </ModalContext.Provider>
  )
}

export function useModal() {
  const context = useContext(ModalContext)
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider')
  }
  return context
}
