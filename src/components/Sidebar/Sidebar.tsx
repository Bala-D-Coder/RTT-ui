import { Mic, MicOff } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/Button/Button'
import { navItems } from '@/constants/navLinks'
import { useRecorder } from '@/context/RecorderContext'
import { useBinCount } from '@/hooks/useBinCount'
import { cx } from '@/utils/format'
import styles from './Sidebar.module.css'

export function Sidebar() {
  const recorder = useRecorder()
  const binCount = useBinCount()
  const live = recorder.status === 'listening' || recorder.status === 'requesting'

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
      </ul>
    </nav>
  )
}
