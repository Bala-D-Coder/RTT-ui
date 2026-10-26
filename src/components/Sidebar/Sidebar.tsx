import { useEffect, useState } from 'react'
import { Briefcase, LogOut, Mic, MicOff, Shield } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/Button/Button'
import { navItems } from '@/constants/navLinks'
import { useRecorder } from '@/context/RecorderContext'
import { useAuth } from '@/context/AuthContext'
import { useModal } from '@/context/ModalContext'
import { useBinCount } from '@/hooks/useBinCount'
import { isHireMeVisible } from '@/services/feedback'
import { cx } from '@/utils/format'
import styles from './Sidebar.module.css'

export function Sidebar() {
  const recorder = useRecorder()
  const binCount = useBinCount()
  const { user, isAdmin, logout } = useAuth()
  const modal = useModal()
  const [hireMeVisible, setHireMeVisibleState] = useState(isHireMeVisible)
  const live = recorder.status === 'listening' || recorder.status === 'requesting'

  useEffect(() => {
    function handleToggle() {
      setHireMeVisibleState(isHireMeVisible())
    }
    window.addEventListener('rtt_hire_me_toggle', handleToggle)
    window.addEventListener('storage', handleToggle)
    return () => {
      window.removeEventListener('rtt_hire_me_toggle', handleToggle)
      window.removeEventListener('storage', handleToggle)
    }
  }, [])

  async function handleLogout() {
    const ok = await modal.confirm({
      title: 'Sign Out',
      message: `Log out of ${user?.email || 'this session'}?`,
      confirmText: 'Log Out',
      cancelText: 'Cancel',
      variant: 'warning',
    })
    if (ok) {
      await logout()
    }
  }

  return (
    <nav className={styles.rail} aria-label="Primary">
      <img className={styles.brand} src="/ENGO-.Png" alt="EnGo" width={120} height={120} />

      <Button
        size="fab"
        variant="accent"
        className={styles.fab}
        onClick={live ? recorder.stop : recorder.start}
        aria-label={live ? 'Stop dictation' : 'Start dictation'}
        aria-pressed={live}
      >
        {live ? <MicOff size={20} aria-hidden="true" /> : <Mic size={20} aria-hidden="true" />}
      </Button>

      <ul className={styles.list}>
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => cx(styles.link, isActive && styles.linkActive)}
              title={item.label}
            >
              <span className={styles.iconSlot}>
                <item.icon size={19} aria-hidden="true" />
                {item.to === '/bin' && binCount > 0 ? (
                  <span className={styles.badge} aria-label={`${binCount} notes in bin`}>
                    {binCount}
                  </span>
                ) : null}
              </span>
              <span className={styles.linkLabel}>{item.label}</span>
            </NavLink>
          </li>
        ))}

        {hireMeVisible && (
          <li>
            <NavLink
              to="/hire-me"
              className={({ isActive }) =>
                cx(styles.link, styles.hireMeLink, isActive && styles.linkActive)
              }
              title="Hire Me / Interview Invitation"
            >
              <span className={styles.iconSlot}>
                <Briefcase size={19} aria-hidden="true" />
              </span>
              <span className={styles.linkLabel}>Hire Me</span>
            </NavLink>
          </li>
        )}

        {isAdmin ? (
          <li>
            <NavLink
              to="/admin"
              className={({ isActive }) => cx(styles.link, isActive && styles.linkActive)}
              title="Admin"
            >
              <span className={styles.iconSlot}>
                <Shield size={19} aria-hidden="true" />
              </span>
              <span className={styles.linkLabel}>Admin</span>
            </NavLink>
          </li>
        ) : null}
      </ul>

      <div className={styles.bottomGroup}>
        <button
          type="button"
          onClick={handleLogout}
          className={styles.logoutBtn}
          title={`Log out (${user?.email || ''})`}
        >
          <span className={styles.iconSlot}>
            <LogOut size={18} aria-hidden="true" />
          </span>
          <span className={styles.linkLabel}>Logout</span>
        </button>
      </div>
    </nav>
  )
}
