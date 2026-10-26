import { useEffect, useState } from 'react'
import {
  Shield,
  KeyRound,
  Copy,
  Check,
  UserPlus,
  RefreshCw,
  Trash2,
  Eye,
  EyeOff,
  Sparkles,
  AlertCircle,
  Clock,
  Search,
  Briefcase,
  Cpu,
  Layers,
  Star,
} from 'lucide-react'
import { apiFetch } from '@/services/api-fetch'
import { useAuth } from '@/context/AuthContext'
import { useModal } from '@/context/ModalContext'
import { useBinCount } from '@/hooks/useBinCount'
import { BIN_RETENTION_DAYS } from '@/constants/bin'
import { env } from '@/constants/env'
import { isWebSpeechSupported } from '@/services/web-speech'
import { engineChoice, setEngineChoice, type EngineName } from '@/services/transcription'
import {
  isHireMeVisible,
  setHireMeVisible,
  getLocalFeedbacks,
  getLocalHireInvitations,
  type FeedbackPayload,
  type HireInvitationPayload,
} from '@/services/feedback'
import type { CredentialRow } from '@/types/contracts'
import styles from './Admin.module.css'

interface IssuedResult {
  email: string
  password: string
  expiresAt?: string
}

const ENGINES: Array<{ value: EngineName; label: string; blurb: string }> = [
  { value: 'webspeech', label: 'Browser Web Speech', blurb: 'Live microphone, $0, no quota. Chromium and Safari only.' },
  { value: 'replay', label: 'Replay take', blurb: 'Canned Hinglish transcript for demos and CI where no mic is available.' },
]

export function Admin() {
  const { user, isAdmin } = useAuth()
  const binCount = useBinCount()
  const modal = useModal()

  // Tab State
  const [activeTab, setActiveTab] = useState<'credentials' | 'feedback' | 'diagnostics'>('credentials')

  // Credentials State
  const [credentials, setCredentials] = useState<CredentialRow[]>([])
  const [loading, setLoading] = useState(true)
  const [issued, setIssued] = useState<IssuedResult | null>(null)
  const [reseedMsg, setReseedMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [label, setLabel] = useState('')
  const [daysValid, setDaysValid] = useState<number>(14)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<'email' | 'password' | 'all' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Feedback & Hire Me Navigation State
  const [hireMeToggle, setHireMeToggle] = useState(isHireMeVisible)
  const [feedbacks] = useState<FeedbackPayload[]>(getLocalFeedbacks)
  const [hireInvitations] = useState<HireInvitationPayload[]>(getLocalHireInvitations)

  // Engine Diagnostics State
  const [selectedEngine, setSelectedEngine] = useState<EngineName>(() => engineChoice())

  async function loadCredentials() {
    setLoading(true)
    try {
      const data = await apiFetch<CredentialRow[]>('/api/v1/admin/credentials')
      setCredentials(data || [])
    } catch (e) {
      console.error('Failed to load credentials', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      void loadCredentials()
    }
  }, [isAdmin])

  if (!isAdmin) {
    return (
      <div className={styles.wrap}>
        <div className={styles.card} style={{ textAlign: 'center', padding: '48px 24px' }}>
          <Shield size={48} style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
          <h1 className={styles.title}>Access Restricted</h1>
          <p className={styles.subtitle} style={{ marginTop: '8px' }}>
            This workspace administration console is strictly limited to administrators.
          </p>
        </div>
      </div>
    )
  }

  async function handleIssue(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const payload: {
        email?: string
        password?: string
        label?: string
        daysValid?: number
      } = {}

      if (email.trim()) payload.email = email.trim()
      if (password.trim()) payload.password = password.trim()
      if (label.trim()) payload.label = label.trim()
      payload.daysValid = daysValid

      const res = await apiFetch<{ user: { email: string; name?: string; expiresAt?: string }; password: string }>(
        '/api/v1/admin/credentials',
        {
          method: 'POST',
          body: payload,
        }
      )

      setIssued({
        email: res.user.email,
        password: res.password,
        expiresAt: res.user.expiresAt,
      })
      setEmail('')
      setPassword('')
      setLabel('')
      await loadCredentials()
    } catch (e) {
      setErrorMsg((e as Error).message || 'Failed to issue credentials')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleQuickDemo() {
    setIsSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await apiFetch<{ user: { email: string; name?: string; expiresAt?: string }; password: string }>(
        '/api/v1/admin/credentials',
        {
          method: 'POST',
          body: { label: 'Demo Reviewer', daysValid: 14 },
        }
      )

      setIssued({
        email: res.user.email,
        password: res.password,
        expiresAt: res.user.expiresAt,
      })
      await loadCredentials()
    } catch (e) {
      setErrorMsg((e as Error).message || 'Failed to issue demo credentials')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function copyToClipboard(text: string, field: 'email' | 'password' | 'all') {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  function copyAllLoginDetails() {
    if (!issued) return
    const loginUrl = `${window.location.origin}/login`
    const details = `Real-time Transcription Workspace Login:
Email: ${issued.email}
Password: ${issued.password}
Login URL: ${loginUrl}`
    void copyToClipboard(details, 'all')
  }

  async function handleExtend(id: string) {
    try {
      await apiFetch(`/api/v1/admin/credentials/${id}`, {
        method: 'PATCH',
        body: { extend: true },
      })
      await loadCredentials()
    } catch (e) {
      await modal.alert({
        title: 'Action Failed',
        message: 'Failed to extend credential: ' + (e as Error).message,
        variant: 'danger',
      })
    }
  }

  async function handleToggleDisable(id: string, currentlyDisabled: boolean) {
    try {
      await apiFetch(`/api/v1/admin/credentials/${id}`, {
        method: 'PATCH',
        body: { disabled: !currentlyDisabled },
      })
      await loadCredentials()
    } catch (e) {
      await modal.alert({
        title: 'Action Failed',
        message: 'Failed to update credential: ' + (e as Error).message,
        variant: 'danger',
      })
    }
  }

  async function handleRevoke(id: string, credEmail: string) {
    const ok = await modal.confirm({
      title: 'Revoke Credentials',
      message: (
        <span>
          Revoke credentials for <strong>{credEmail}</strong>? User will immediately lose access and no longer be able to log in.
        </span>
      ),
      confirmText: 'Revoke Access',
      cancelText: 'Keep Active',
      variant: 'danger',
    })
    if (!ok) {
      return
    }
    try {
      await apiFetch(`/api/v1/admin/credentials/${id}`, {
        method: 'DELETE',
      })
      await loadCredentials()
    } catch (e) {
      await modal.alert({
        title: 'Revocation Failed',
        message: 'Failed to revoke credential: ' + (e as Error).message,
        variant: 'danger',
      })
    }
  }

  async function handleReseed() {
    const ok = await modal.confirm({
      title: 'Reseed Demo Data',
      message: 'Reseed demo notes, tags, and reminders? Existing data will be preserved and refreshed.',
      confirmText: 'Reseed Data',
      cancelText: 'Cancel',
      variant: 'warning',
    })
    if (!ok) {
      return
    }
    try {
      const res = await apiFetch<{ created: { notes: number; blocks: number; reminders: number; tags: number } }>(
        '/api/v1/admin/reseed',
        { method: 'POST' }
      )
      const c = res.created
      setReseedMsg(`Workspace reseeded! Created: ${c.notes} notes, ${c.blocks} blocks, ${c.reminders} reminders, ${c.tags} tags.`)
      setTimeout(() => setReseedMsg(null), 8000)
    } catch (e) {
      await modal.alert({
        title: 'Reseed Failed',
        message: 'Reseed failed: ' + (e as Error).message,
        variant: 'danger',
      })
    }
  }

  function handleToggleHireMe(newVal: boolean) {
    setHireMeToggle(newVal)
    setHireMeVisible(newVal)
  }

  // Filter credentials
  const filteredCredentials = credentials.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return c.email.toLowerCase().includes(q) || (c.label && c.label.toLowerCase().includes(q))
  })

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <span className={styles.badgeAdmin}>
            <Shield size={12} /> Super Admin Console
          </span>
          <h1 className={styles.title}>Workspace Administration</h1>
          <p className={styles.subtitle}>
            Logged in as <strong>{user?.email}</strong>. Manage accounts, connect Google Sheets, and configure system runtime.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleReseed} className={styles.btnSecondary} title="Populate demo notes and tags idempotently">
            <RefreshCw size={14} /> Reseed Demo Data
          </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className={styles.tabsBar}>
        <button
          type="button"
          onClick={() => setActiveTab('credentials')}
          className={`${styles.tabBtn} ${activeTab === 'credentials' ? styles.tabBtnActive : ''}`}
        >
          <KeyRound size={15} /> Access Credentials ({credentials.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('feedback')}
          className={`${styles.tabBtn} ${activeTab === 'feedback' ? styles.tabBtnActive : ''}`}
        >
          <Star size={15} /> Feedback & Inquiries ({feedbacks.length + hireInvitations.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('diagnostics')}
          className={`${styles.tabBtn} ${activeTab === 'diagnostics' ? styles.tabBtnActive : ''}`}
        >
          <Cpu size={15} /> Engine & Diagnostics
        </button>
      </nav>

      {/* Reseed Message Banner */}
      {reseedMsg && (
        <div className={styles.issuedBanner} style={{ borderColor: 'rgba(59, 130, 246, 0.4)', background: 'rgba(59, 130, 246, 0.1)' }}>
          <div style={{ color: '#60a5fa', fontWeight: 600 }}>{reseedMsg}</div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TAB 1: ACCESS CREDENTIALS */}
      {activeTab === 'credentials' && (
        <>
          {/* Newly Issued Credential Notification */}
          {issued && (
            <div className={styles.issuedBanner}>
              <div className={styles.issuedHeader}>
                <div className={styles.issuedTitle}>
                  <Check size={18} /> Credential Created & Ready to Share
                </div>
                <button
                  onClick={() => setIssued(null)}
                  className={styles.btnSecondary}
                  style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '6px' }}
                >
                  Dismiss
                </button>
              </div>

              <div className={styles.issuedGrid}>
                <div className={styles.credentialBox}>
                  <div className={styles.credInfo}>
                    <span className={styles.credLabel}>Email Address</span>
                    <span className={styles.credValue}>{issued.email}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(issued.email, 'email')}
                    className={`${styles.copyBtn} ${copiedField === 'email' ? styles.copyBtnSuccess : ''}`}
                  >
                    {copiedField === 'email' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedField === 'email' ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className={styles.credentialBox}>
                  <div className={styles.credInfo}>
                    <span className={styles.credLabel}>Password</span>
                    <span className={styles.credValue}>{issued.password}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(issued.password, 'password')}
                    className={`${styles.copyBtn} ${copiedField === 'password' ? styles.copyBtnSuccess : ''}`}
                  >
                    {copiedField === 'password' ? <Check size={13} /> : <Copy size={13} />}
                    {copiedField === 'password' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className={styles.issuedNotice}>
                <span>
                  Share these credentials with the user. They can log in immediately at <code>/login</code>.
                </span>
                <button
                  type="button"
                  onClick={copyAllLoginDetails}
                  className={styles.btnPrimary}
                  style={{ padding: '7px 14px', fontSize: '12px' }}
                >
                  {copiedField === 'all' ? <Check size={13} /> : <Copy size={13} />}
                  {copiedField === 'all' ? 'Copied Details!' : 'Copy Full Login Details'}
                </button>
              </div>
            </div>
          )}

          {/* Credential Issuance Form */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <UserPlus size={20} style={{ color: 'var(--accent)' }} />
                Issue Access Credentials
              </div>
              <div className={styles.cardDesc}>
                Generate custom credentials for interviewers (e.g. <code>intervie@tcs.com</code>) or temporary demo accounts.
              </div>
            </div>

            <form onSubmit={handleIssue}>
              <div className={styles.formGrid}>
                {/* Email Field */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="custom-email">
                    <span>Email Address</span>
                    <span className={styles.fieldHint}>Custom or Auto</span>
                  </label>
                  <input
                    id="custom-email"
                    type="email"
                    className={styles.input}
                    placeholder="e.g. intervie@tcs.com (leave blank for demo-xx@apex.in)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <span className={styles.fieldHint}>
                    Specify an exact email, or leave blank to assign the next <code>demo-XX@apex.in</code>.
                  </span>
                </div>

                {/* Password Field */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="custom-password">
                    <span>Password</span>
                    <span className={styles.fieldHint}>Optional</span>
                  </label>
                  <div className={styles.inputWrap}>
                    <input
                      id="custom-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`${styles.input} ${styles.inputWithBtn}`}
                      placeholder="Leave blank to auto-generate passphrase"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                    />
                    <button
                      type="button"
                      className={styles.togglePassBtn}
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span className={styles.fieldHint}>
                    Min 6 chars if specified, or auto-generates a readable secure passphrase.
                  </span>
                </div>

                {/* Label / Organization */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="custom-label">
                    <span>User Label / Note</span>
                    <span className={styles.fieldHint}>Optional</span>
                  </label>
                  <input
                    id="custom-label"
                    type="text"
                    className={styles.input}
                    placeholder="e.g. TCS Technical Interviewer"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                  <span className={styles.fieldHint}>
                    Reference tag to easily identify who this account belongs to.
                  </span>
                </div>

                {/* Validity Duration */}
                <div className={styles.field}>
                  <label className={styles.fieldLabel} htmlFor="validity-select">
                    <span>Access Expiry</span>
                    <span className={styles.fieldHint}>Duration</span>
                  </label>
                  <select
                    id="validity-select"
                    className={styles.select}
                    value={daysValid}
                    onChange={(e) => setDaysValid(Number(e.target.value))}
                  >
                    <option value={14}>14 Days (Standard Evaluation)</option>
                    <option value={30}>30 Days (Extended Review)</option>
                    <option value={7}>7 Days (Short Trial)</option>
                    <option value={1}>24 Hours (Quick Demo)</option>
                    <option value={0}>Permanent (Never Expires)</option>
                  </select>
                  <span className={styles.fieldHint}>
                    Determines how long these credentials can authenticate.
                  </span>
                </div>
              </div>

              <div className={styles.formActions}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.btnPrimary}
                >
                  <KeyRound size={15} />
                  {isSubmitting ? 'Issuing Credentials…' : 'Generate & Grant Access'}
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleQuickDemo}
                  className={styles.btnSecondary}
                  title="Quickly issue standard demo-XX account in one click"
                >
                  <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                  Quick Demo Account
                </button>
              </div>
            </form>
          </section>

          {/* Credentials Table */}
          <section className={styles.tableCard}>
            <div className={styles.tableHeaderBar}>
              <div className={styles.tableTitleWrap}>
                <h2 className={styles.tableTitle}>Issued Credentials</h2>
                <span className={styles.countPill}>
                  {credentials.length} account{credentials.length === 1 ? '' : 's'}
                </span>
              </div>

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--muted)' }} />
                <input
                  type="text"
                  placeholder="Filter by email or label…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchBox}
                  style={{ paddingLeft: '30px' }}
                />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Validity / Expires</th>
                    <th>Last Active</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyState}>
                        Loading credentials…
                      </td>
                    </tr>
                  ) : filteredCredentials.length === 0 ? (
                    <tr>
                      <td colSpan={5} className={styles.emptyState}>
                        {searchQuery
                          ? 'No credentials match your filter.'
                          : 'No custom or demo credentials issued yet. Use the form above to grant access.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCredentials.map((cred) => {
                      const nowMs = new Date().getTime()
                      const isExpired = cred.expiresAt && new Date(cred.expiresAt).getTime() <= nowMs
                      const isDisabled = Boolean(cred.disabledAt)

                      let statusBadge = (
                        <span className={`${styles.badge} ${styles.badgeActive}`}>
                          <Check size={11} /> Active
                        </span>
                      )
                      if (isDisabled) {
                        statusBadge = (
                          <span className={`${styles.badge} ${styles.badgeDisabled}`}>
                            <AlertCircle size={11} /> Disabled
                          </span>
                        )
                      } else if (isExpired) {
                        statusBadge = (
                          <span className={`${styles.badge} ${styles.badgeExpired}`}>
                            <Clock size={11} /> Expired
                          </span>
                        )
                      }

                      return (
                        <tr key={cred.id}>
                          <td>
                            <div className={styles.emailCell}>
                              <span className={styles.emailText}>{cred.email}</span>
                              {cred.label && <span className={styles.labelSubtext}>{cred.label}</span>}
                            </div>
                          </td>
                          <td>{statusBadge}</td>
                          <td>
                            {cred.expiresAt ? (
                              <span title={new Date(cred.expiresAt).toString()}>
                                {new Date(cred.expiresAt).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--muted)' }}>Permanent</span>
                            )}
                          </td>
                          <td>
                            {cred.lastLoginAt ? (
                              new Date(cred.lastLoginAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            ) : (
                              <span style={{ color: 'var(--muted)' }}>Never</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.actionBtns} style={{ justifyContent: 'flex-end' }}>
                              <button
                                type="button"
                                onClick={() => handleExtend(cred.id)}
                                className={styles.actionBtn}
                                title="Extend validity by 24 hours"
                              >
                                +24h
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleDisable(cred.id, isDisabled)}
                                className={styles.actionBtn}
                              >
                                {isDisabled ? 'Enable' : 'Disable'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevoke(cred.id, cred.email)}
                                className={styles.btnDanger}
                                title="Revoke credential"
                              >
                                <Trash2 size={12} /> Revoke
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* TAB 2: GOOGLE SHEETS & FEEDBACK */}
      {activeTab === 'feedback' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Navigation Controls: Hire Me Toggle */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Briefcase size={18} style={{ color: 'var(--accent)' }} />
                "Hire Me" Sidebar Navigation Control
              </div>
            </div>
            <p className={styles.cardDesc}>
              Control whether the "Hire Me" interview invitation link appears in the left sidebar navigation for candidates and reviewers.
            </p>
            <div>
              <label className={styles.switchLabel}>
                <input
                  type="checkbox"
                  className={styles.switchInput}
                  checked={hireMeToggle}
                  onChange={(e) => handleToggleHireMe(e.target.checked)}
                />
                <div className={styles.switchTrack}>
                  <div className={styles.switchThumb} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>
                  {hireMeToggle ? 'Visible in Sidebar Navigation' : 'Hidden from Sidebar Navigation'}
                </span>
              </label>
            </div>
          </section>

          {/* Received Feedback & Interview Requests */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Star size={18} style={{ color: '#facc15' }} />
                Locally Recorded Reviews & Interview Invitations
              </div>
            </div>
            <p className={styles.cardDesc}>
              Submissions are backed up here in this browser so you never miss feedback even without an active Google Sheet.
            </p>

            {feedbacks.length === 0 && hireInvitations.length === 0 ? (
              <div className={styles.emptyState}>No ratings or interview requests recorded yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {feedbacks.map((f, i) => (
                  <div key={i} className={styles.credentialBox}>
                    <div className={styles.credInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#facc15', fontWeight: 700 }}>
                          {'★'.repeat(f.rating)}
                          {'☆'.repeat(5 - f.rating)}
                        </span>
                        <strong style={{ fontSize: '13px' }}>{f.email}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                          {f.timestamp ? new Date(f.timestamp).toLocaleDateString() : ''}
                        </span>
                      </div>
                      {f.review && (
                        <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                          "{f.review}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {hireInvitations.map((h, i) => (
                  <div key={i} className={styles.credentialBox} style={{ borderColor: 'rgba(255, 122, 26, 0.3)' }}>
                    <div className={styles.credInfo}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`${styles.badge} ${styles.badgeActive}`}>
                          <Briefcase size={11} /> {h.interviewType}
                        </span>
                        <strong style={{ fontSize: '13px' }}>{h.company} ({h.contactName})</strong>
                        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{h.email}</span>
                      </div>
                      {h.message && (
                        <p style={{ fontSize: '13px', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                          "{h.message}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 3: ENGINE & SYSTEM DIAGNOSTICS */}
      {activeTab === 'diagnostics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Cpu size={18} style={{ color: 'var(--accent)' }} />
                Speech Dictation Engine
              </div>
            </div>
            <p className={styles.cardDesc}>
              Select the primary speech-to-text recognition driver for dictation.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ENGINES.map((option) => (
                <label
                  key={option.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 16px',
                    background: 'var(--surface-raised)',
                    border: `1px solid ${selectedEngine === option.value ? 'var(--accent)' : 'var(--line-strong)'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="engineChoice"
                    value={option.value}
                    checked={selectedEngine === option.value}
                    onChange={() => {
                      setSelectedEngine(option.value)
                      setEngineChoice(option.value)
                    }}
                    style={{ marginTop: '3px', accentColor: 'var(--accent)' }}
                  />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>{option.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{option.blurb}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.cardTitle}>
                <Layers size={18} style={{ color: 'var(--accent)' }} />
                Runtime & Environment
              </div>
            </div>

            <div className={styles.diagList}>
              <div className={styles.diagRow}>
                <span className={styles.diagLabel}>Data Source</span>
                <span className={styles.diagValue}>{env.dataSource === 'mock' ? 'Local Fixtures (Mock)' : env.apiUrl}</span>
              </div>
              <div className={styles.diagRow}>
                <span className={styles.diagLabel}>Browser Web Speech Support</span>
                <span className={styles.diagValue}>{isWebSpeechSupported() ? 'Available' : 'Not Available'}</span>
              </div>
              <div className={styles.diagRow}>
                <span className={styles.diagLabel}>Bin Retention Window</span>
                <span className={styles.diagValue}>{BIN_RETENTION_DAYS} Days ({binCount} notes queued)</span>
              </div>
              <div className={styles.diagRow}>
                <span className={styles.diagLabel}>Build Mode</span>
                <span className={styles.diagValue}>{import.meta.env.MODE}</span>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default Admin
