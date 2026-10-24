import styles from './PageLoader.module.css'

export function PageLoader() {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className="visually-hidden">Loading</span>
    </div>
  )
}
