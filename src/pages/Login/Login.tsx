import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Radio,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import styles from './Login.module.css'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, loading: authLoading, login } = useAuth()

  // Do NOT prefill credentials as requested
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [showForgotTip, setShowForgotTip] = useState(false)

  // Screen Guard: if user is already logged in, they cannot view login screen
  if (user) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/'
    return <Navigate to={from} replace />
  }

  if (authLoading) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100vh', background: 'var(--canvas)', color: 'var(--ink)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <img src="/ENGO-.Png" alt="EnGo" width={64} height={64} style={{ opacity: 0.9 }} />
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>Checking existing session…</span>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setErrorMsg('Please enter both email and password.')
      return
    }

    setLoading(true)
    setErrorMsg(null)
    setErrorCode(null)

    try {
      await login(email.trim(), password)
      navigate('/')
    } catch (err) {
      const apiErr = err as Error & { code?: string; details?: Record<string, unknown> }
      setErrorCode(apiErr.code || 'unknown')

      switch (apiErr.code) {
        case 'invalid_credentials':
          setErrorMsg('Invalid email or password. Please verify your credentials.')
          break
        case 'credentials_disabled':
          setErrorMsg(apiErr.message || 'These credentials have been disabled. Contact support@apex.in.')
          break
        case 'credentials_expired':
          setErrorMsg(apiErr.message || 'These credentials have expired. Please contact support@apex.in.')
          break
        case 'account_locked':
          setErrorMsg('Account is temporarily locked due to repeated failed attempts. Please wait 15 minutes.')
          break
        default:
          setErrorMsg(apiErr.message || 'Failed to sign in. Please verify the backend server is running.')
          break
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.pageLayout}>
      {/* LEFT SIDE: Brand Showcase & Features */}
      <div className={styles.leftPanel}>
        <div className={styles.leftContent}>
          {/* Brand Logo Box */}
          <div className={styles.logoCard}>
            <img src="/ENGO-.Png" alt="EnGo" className={styles.logoImg} />
          </div>

          <h1 className={styles.brandTitle}>EnGo Voice Platform</h1>
          <p className={styles.brandSubtitle}>
            One unified workspace for real-time speech transcription. Manage notes, dictate
            thoughts, and automate smart reminders from a single control plane.
          </p>

          {/* 2x2 Feature Pills */}
          <div className={styles.badgesGrid}>
            <div className={styles.badgePill}>
              <div className={styles.badgeIconWrap}>
                <Radio size={16} />
              </div>
              <span>Streaming ASR</span>
            </div>

            <div className={styles.badgePill}>
              <div className={styles.badgeIconWrap}>
                <Zap size={16} />
              </div>
              <span>Real-time VAD</span>
            </div>

            <div className={styles.badgePill}>
              <div className={styles.badgeIconWrap}>
                <Shield size={16} />
              </div>
              <span>Admin Control</span>
            </div>

            <div className={styles.badgePill}>
              <div className={styles.badgeIconWrap}>
                <Lock size={16} />
              </div>
              <span>Secure Auth</span>
            </div>
          </div>
        </div>

        {/* Ambient background illumination */}
        <div className={styles.ambientLeft} aria-hidden="true" />
      </div>

      {/* RIGHT SIDE: Authentication Form */}
      <div className={styles.rightPanel}>
        <div className={styles.formContainer}>
          {/* Header */}
          <div className={styles.header}>
            <h2 className={styles.welcomeTitle}>Welcome Back</h2>
            <p className={styles.welcomeSubtitle}>Please log in to your account</p>
          </div>

          {/* Elevated Login Card */}
          <div className={styles.formCard}>
            {errorMsg && (
              <div className={styles.errorAlert} role="alert" data-code={errorCode}>
                <AlertCircle size={18} className={styles.errorIcon} />
                <span className={styles.errorText}>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.loginForm} noValidate>
              {/* Email Input */}
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={styles.textInput}
                  autoComplete="email"
                  required
                />
              </div>

              {/* Password Input */}
              <div className={styles.inputGroup}>
                <div className={styles.inputIcon}>
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={styles.textInput}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className={styles.eyeBtn}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Forgot password */}
              <div className={styles.forgotRow}>
                <button
                  type="button"
                  onClick={() => setShowForgotTip((prev) => !prev)}
                  className={styles.forgotLink}
                >
                  Forgot Password?
                </button>
              </div>

              {showForgotTip && (
                <div className={styles.tipBox}>
                  <Sparkles size={14} />
                  <span>
                    Contact <strong>support@apex.in</strong> to reset your password.
                  </span>
                </div>
              )}

              {/* Submit Button */}
              <button type="submit" disabled={loading} className={styles.submitBtn}>
                {loading ? 'LOGGING IN…' : 'LOG IN'}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          <span>© 2026, EnGo Voice Platform. All Rights Reserved.</span>
          <span className={styles.footerSep}>|</span>
          <a href="#terms" className={styles.footerLink}>
            Terms & Conditions
          </a>
          <span className={styles.footerSep}>|</span>
          <a href="#privacy" className={styles.footerLink}>
            Privacy Policy
          </a>
        </footer>
      </div>
    </div>
  )
}
