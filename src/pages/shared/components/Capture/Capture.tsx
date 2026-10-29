import { Mic, SquarePen } from 'lucide-react'
import { Button } from '@/components/Button/Button'
import styles from './Capture.module.css'

export interface CaptureProps {
  onDictate: () => void
  onNewNote: () => void
  busy?: boolean
}

/**
 * The two ways in. Distinct icons, distinct verbs, both above the fold — no menu
 * that hides one of them.
 */
export function Capture({ onDictate, onNewNote, busy }: CaptureProps) {
  return (
    <div className={styles.wrap}>
      <Button variant="accent" onClick={onDictate} disabled={busy} aria-label="Create a note by dictation">
        <Mic size={16} aria-hidden="true" />
        Dictate
      </Button>
      <Button variant="primary" onClick={onNewNote} disabled={busy} aria-label="Create a blank text note">
        <SquarePen size={16} aria-hidden="true" />
        Text note
      </Button>
    </div>
  )
}
