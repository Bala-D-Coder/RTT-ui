import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { meterBars } from '@/constants/recorderLabels'
import {
  createDriver,
  ENGINE_CHANGE,
  engineChoice,
  resolveLang,
  type EngineName,
  type ResolvedLang,
  type TranscriptionDriver,
} from '@/services/transcription'
import type { RecorderState } from '@/types/contracts'

interface RecorderValue {
  status: RecorderState
  engine: EngineName
  driverName: string
  model: string
  /** What the engine is listening in, resolved from the browser language. */
  lang: ResolvedLang
  interim: string
  transcript: string
  lines: string[]
  wordCount: number
  elapsedMs: number
  levels: number[] | null
  expanded: boolean
  hasContent: boolean
  errorMessage: string | null
  /** The note currently open in the editor, so the bar can offer "Add to note". */
  activeNoteId: string | null
  start: () => void
  stop: () => void
  bindNote: (id: string | null) => void
  toggleExpanded: () => void
  reset: () => void
}

const RecorderContext = createContext<RecorderValue | null>(null)

export function RecorderProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<EngineName>(() => engineChoice())
  const [driver, setDriver] = useState<TranscriptionDriver>(() => createDriver())
  const [status, setStatus] = useState<RecorderState>('idle')
  const [interim, setInterim] = useState('')
  const [lines, setLines] = useState<string[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  const [levels, setLevels] = useState<number[] | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const runningRef = useRef(false)
  // Mirrors `interim` for the Stop handler: words the user already saw must not vanish unlisted.
  const interimRef = useRef('')

  const lang = resolveLang()

  useEffect(() => {
    const onChange = () => {
      const next = engineChoice()
      setEngine(next)
      setDriver(createDriver(next))
      setStatus('idle')
      setInterim('')
      interimRef.current = ''
      setLevels(null)
    }
    window.addEventListener(ENGINE_CHANGE, onChange)
    return () => window.removeEventListener(ENGINE_CHANGE, onChange)
  }, [])

  useEffect(() => {
    const unsubscribe = driver.subscribe((event) => {
      if (event.type === 'partial') {
        interimRef.current = event.text
        setInterim(event.text)
      }
      if (event.type === 'final') {
        interimRef.current = ''
        setLines((current) => [...current, event.text])
        setInterim('')
      }
      if (event.type === 'error') {
        setErrorMessage(event.message)
        if (event.retryable === false) setStatus('error')
      }
      if (event.type === 'closed' && runningRef.current) {
        runningRef.current = false
        setStatus('idle')
      }
    })
    return unsubscribe
  }, [driver])

  useEffect(() => {
    if (status !== 'listening') {
      runningRef.current = false
      return
    }
    runningRef.current = true
    const clock = window.setInterval(() => setElapsedMs((value) => value + 250), 250)
    const meter = window.setInterval(() => {
      setLevels(driver.levels?.(meterBars) ?? null)
    }, 70)
    return () => {
      window.clearInterval(clock)
      window.clearInterval(meter)
    }
  }, [status, driver])

  const start = useCallback(() => {
    setErrorMessage(null)
    setLines([])
    interimRef.current = ''
    setInterim('')
    setStatus('requesting')
    // The browser permission prompt and the first result both land after this tick.
    window.setTimeout(() => {
      setElapsedMs(0)
      setStatus('listening')
      driver.start({ lang: resolveLang() })
    }, 400)
  }, [driver])

  const stop = useCallback(() => {
    driver.stop()
    runningRef.current = false
    const pending = interimRef.current.trim()
    interimRef.current = ''
    if (pending) setLines((current) => [...current, pending])
    setInterim('')
    setLevels(null)
    setStatus('idle')
  }, [driver])

  const reset = useCallback(() => {
    driver.stop()
    runningRef.current = false
    interimRef.current = ''
    setLines([])
    setInterim('')
    setElapsedMs(0)
    setLevels(null)
    setStatus('idle')
    setErrorMessage(null)
  }, [driver])

  const transcript = useMemo(() => lines.join(' ').trim(), [lines])
  const value: RecorderValue = {
    status,
    engine,
    driverName: driver.name,
    model: driver.model,
    lang,
    interim,
    transcript,
    lines,
    wordCount: transcript ? transcript.split(/\s+/).length : 0,
    elapsedMs,
    levels,
    expanded,
    hasContent: lines.length > 0 || interim.length > 0,
    errorMessage,
    activeNoteId,
    start,
    stop,
    bindNote: setActiveNoteId,
    toggleExpanded: () => setExpanded((current) => !current),
    reset,
  }

  return <RecorderContext.Provider value={value}>{children}</RecorderContext.Provider>
}

export function useRecorder() {
  const context = useContext(RecorderContext)
  if (!context) throw new Error('useRecorder must be used inside RecorderProvider')
  return context
}
