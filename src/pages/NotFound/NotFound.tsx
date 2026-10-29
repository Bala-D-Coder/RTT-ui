import { Link } from 'react-router-dom'
import { usePageTitle } from '@/hooks/usePageTitle'
import styles from './NotFound.module.css'

export function NotFound() {
  usePageTitle('Not found')

  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>That screen does not exist yet</h1>
      <p className={styles.hint}>
        The page you asked for is not part of this build.{' '}
        <Link to="/notes" className={styles.link}>
          Back to notes
        </Link>
      </p>
    </div>
  )
}
