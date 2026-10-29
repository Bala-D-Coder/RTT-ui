import { useState, useMemo, type FormEvent } from 'react'
import { Check, Clock, LogOut, Moon, Sparkles, Star, Sun, User as UserIcon } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useModal } from '@/context/ModalContext'
import { useTheme } from '@/hooks/useTheme'
import { usePageTitle } from '@/hooks/usePageTitle'
import { submitFeedback } from '@/services/feedback'
import styles from './Settings.module.css'

export function Settings() {
  usePageTitle('Settings & Profile')
  const { user, isAdmin, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const modal = useModal()

  // Star Rating & Review State
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [review, setReview] = useState<string>('')
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [feedbackSuccess, setFeedbackSuccess] = useState(false)

  async function handleLogout() {
    const ok = await modal.confirm({
      title: 'Sign Out',
      message: `Are you sure you want to log out of ${user?.email || 'your account'}?`,
      confirmText: 'Log Out',
      cancelText: 'Stay Signed In',
      variant: 'warning',
    })
    if (ok) {
      await logout()
    }
  }

  async function handleSubmitReview(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    setSubmittingFeedback(true)
    try {
      await submitFeedback({
        email: user.email,
        rating,
        review: review.trim() || undefined,
        role: user.role,
      })
      setFeedbackSuccess(true)
      setTimeout(() => setFeedbackSuccess(false), 7000)
    } catch (err) {
      await modal.alert({
        title: 'Review Failed',
        message: 'Failed to submit review: ' + (err as Error).message,
        variant: 'danger',
      })
    } finally {
      setSubmittingFeedback(false)
    }
  }

  // Calculate remaining days / hours
  const expiryInfo = useMemo(() => {
    if (!user?.expiresAt) return 'Permanent Access'
    const expiresMs = new Date(user.expiresAt).getTime()
    const nowMs = Date.now()
    const diffHours = Math.round((expiresMs - nowMs) / (1000 * 60 * 60))
    if (diffHours <= 0) {
      return 'Expired'
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} remaining`
    } else {
      const diffDays = Math.round(diffHours / 24)
      return `${diffDays} day${diffDays === 1 ? '' : 's'} remaining`
    }
  }, [user?.expiresAt])

  const ratingDescriptions: Record<number, string> = {
    1: 'Poor — Significant issues encountered',
    2: 'Fair — Needs improvement in speed or accuracy',
    3: 'Good — Works as expected',
    4: 'Very Good — Smooth and responsive transcription',
    5: 'Excellent — Extremely fast, accurate, and impressed!',
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings & Profile</h1>
        <p className={styles.subtitle}>
          Manage your workspace session, theme preferences, and share feedback.
        </p>
      </header>

      {/* Account Profile & Validity Card */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <UserIcon size={18} style={{ color: 'var(--accent)' }} />
            Account & Session Validity
          </div>
          <span className={`${styles.pill} ${isAdmin ? styles.pillAdmin : styles.pillActive}`}>
            {isAdmin ? 'Super Admin' : 'Active User'}
          </span>
        </div>

        <div className={styles.accountList}>
          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>Email Address</span>
            <span className={styles.accountValue}>{user?.email || '—'}</span>
          </div>

          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>User Name / Role</span>
            <span className={styles.accountValue}>{user?.name || user?.role || 'Reviewer'}</span>
          </div>

          <div className={styles.accountRow}>
            <span className={styles.accountLabel}>Session Expiry</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={styles.accountValue}>
                {user?.expiresAt
                  ? new Date(user.expiresAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  : 'Never Expires'}
              </span>
              <span className={`${styles.pill} ${styles.pillActive}`}>
                <Clock size={11} /> {expiryInfo}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance Theme Card */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <Sun size={18} style={{ color: 'var(--accent)' }} />
            Interface Theme
          </div>
        </div>
        <p className={styles.cardDesc}>
          Switch between crisp Obsidian Dark mode and clean Light mode.
        </p>
        <div className={styles.segment} role="group" aria-label="Theme">
          <button
            type="button"
            className={styles.segmentButton}
            data-active={theme === 'dark'}
            onClick={() => setTheme('dark')}
          >
            <Moon size={14} /> Dark Mode
          </button>
          <button
            type="button"
            className={styles.segmentButton}
            data-active={theme === 'light'}
            onClick={() => setTheme('light')}
          >
            <Sun size={14} /> Light Mode
          </button>
        </div>
      </section>

      {/* 5-Star Application Rating & Review Card */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <Star size={18} style={{ color: '#facc15' }} />
            Rate EnGo Transcription
          </div>
        </div>
        <p className={styles.cardDesc}>
          How was your experience with real-time speech transcription, speed, and accuracy?
          <br />
          Your rating will be logged.
        </p>

        {feedbackSuccess ? (
          <div className={styles.reviewSuccess}>
            <Check size={18} />
            <span>Thank you for your review! Your 5-star rating and feedback were successfully recorded.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmitReview} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div className={styles.starRow}>
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const effectiveRating = hoverRating !== null ? hoverRating : rating
                  const isFilled = starValue <= effectiveRating
                  return (
                    <button
                      key={starValue}
                      type="button"
                      className={`${styles.starBtn} ${isFilled ? styles.starFilled : ''}`}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(starValue)}
                      aria-label={`Rate ${starValue} stars`}
                    >
                      <Star size={26} />
                    </button>
                  )
                })}
                <span className={styles.ratingLabel}>
                  {ratingDescriptions[hoverRating !== null ? hoverRating : rating]}
                </span>
              </div>
            </div>

            <textarea
              className={styles.textarea}
              placeholder="What did you like about the voice transcription? Any latency or accuracy feedback?"
              value={review}
              onChange={(e) => setReview(e.target.value)}
            />

            <button type="submit" disabled={submittingFeedback} className={styles.submitBtn}>
              {submittingFeedback ? <Sparkles size={14} /> : <Check size={14} />}
              {submittingFeedback ? 'Sending Feedback…' : 'Submit Review to Google Sheets'}
            </button>
          </form>
        )}
      </section>

      {/* Logout Card */}
      <section className={`${styles.card} ${styles.logoutCard}`}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle} style={{ color: '#f87171' }}>
            <LogOut size={18} />
            Session Security & Logout
          </div>
        </div>
        <p className={styles.cardDesc}>
          End your active session on this device. You will need your login credentials to sign in again.
        </p>
        <button type="button" onClick={handleLogout} className={styles.logoutBtn}>
          <LogOut size={15} /> Log Out of Workspace
        </button>
      </section>
    </div>
  )
}

export default Settings
