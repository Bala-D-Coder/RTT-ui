import type { WsTranscribeEvent } from '@/types/contracts'
import { createWebSpeechDriver, isWebSpeechSupported } from './web-speech'
import { createServerWsDriver } from './server-ws'

/** The language the engine is driven in — Web Speech takes exactly one per session. */
export type ResolvedLang = 'en-IN' | 'hi-IN'

/**
 * There is no language picker: the engine listens in the browser's language, and mixed
 * Hindi-English inside one take is a server-engine feature (faster-whisper detects per window).
 */
export function resolveLang(): ResolvedLang {
  const locale = navigator.language.toLowerCase()
  return locale.startsWith('hi') || locale.startsWith('mr') || locale.startsWith('bn') ? 'hi-IN' : 'en-IN'
}

export function langLabel(resolved: ResolvedLang) {
  return resolved === 'hi-IN' ? 'Hindi' : 'English'
}

export interface TranscriptionOptions {
  lang: ResolvedLang
}

/**
 * Everything the recorder UI knows about an engine. `WebSpeechDriver` (browser, $0)
 * and the replay driver satisfy it now; the API milestone adds `ServerWsDriver`
 * with the same surface, so RecorderBar and the editors never change.
 */
export interface TranscriptionDriver {
  readonly name: string
  readonly model: string
  readonly supported: boolean
  /** Live input levels for the meter, 0..1, or null when the engine has no analyser. */
  levels?(bars: number): number[] | null
  subscribe(listener: (event: WsTranscribeEvent) => void): () => void
  start(options: TranscriptionOptions): void
  stop(): void
}

export type EngineName = 'webspeech' | 'gemini' | 'whisper' | 'replay'

const ENGINE_KEY = 'voice-notes.engine'
export const ENGINE_CHANGE = 'voice-notes:engine-change'

const REPLAY_SCRIPT: Array<{ text: string; lang: string }> = [
  { text: 'आज की meeting में deployment plan discuss करेंगे', lang: 'hi-en' },
  { text: 'और owner assign करेंगे Friday तक', lang: 'hi-en' },
  { text: 'Staging pe load test run करना है', lang: 'hi-en' },
  { text: 'Review कल सुबह नौ बजे', lang: 'hi' },
]

function wordChunks(line: string) {
  return line.split(' ').filter(Boolean)
}

export function engineChoice(): EngineName {
  const stored = window.localStorage.getItem(ENGINE_KEY) as EngineName | null
  if (stored === 'whisper') {
    window.localStorage.setItem(ENGINE_KEY, 'gemini')
    return 'gemini'
  }
  if (stored === 'webspeech' || stored === 'gemini' || stored === 'replay') return stored
  return 'gemini'
}

export function setEngineChoice(next: EngineName) {
  window.localStorage.setItem(ENGINE_KEY, next)
  window.dispatchEvent(new Event(ENGINE_CHANGE))
}

export function createReplayDriver(): TranscriptionDriver {
  const listeners = new Set<(event: WsTranscribeEvent) => void>()
  const timers: number[] = []
  let elapsed = 0
  let seq = 0

  const clear = () => {
    for (const id of timers) {
      window.clearInterval(id)
    }
    timers.length = 0
  }

  const emit = (event: WsTranscribeEvent) => {
    for (const listener of listeners) listener(event)
  }

  return {
    name: 'replay',
    model: 'cached-hinglish-script',
    supported: true,

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    start() {
      clear()
      seq = 0
      elapsed = 0
      emit({ type: 'ready', sessionId: 'replay_session' })
      timers.push(
        window.setInterval(() => {
          elapsed += 200
        }, 200),
      )

      let lineIndex = 0
      let wordIndex = 0
      let lineStart = 0

      timers.push(
        window.setInterval(() => {
          const line = REPLAY_SCRIPT[lineIndex % REPLAY_SCRIPT.length]
          if (!line) return
          const words = wordChunks(line.text)
          const partial = words.slice(0, (wordIndex % words.length) + 1).join(' ')
          emit({ type: 'partial', text: partial, source: 'whisper', ts: elapsed })
          wordIndex += 1

          if (wordIndex >= words.length) {
            const startMs = lineStart
            lineStart = elapsed
            seq += 1
            emit({
              type: 'final',
              seq,
              text: line.text,
              startMs,
              endMs: elapsed,
              confidence: 0.86,
              lang: line.lang,
            })
            wordIndex = 0
            lineIndex += 1
          }
        }, 260),
      )
    },

    stop() {
      clear()
      emit({ type: 'closed', reason: 'user_stopped' })
    },
  }
}

export function createDriver(choice: EngineName = engineChoice()): TranscriptionDriver {
  if (choice === 'gemini' || choice === 'whisper') return createServerWsDriver()
  if (choice === 'webspeech' && isWebSpeechSupported()) return createWebSpeechDriver()
  return createReplayDriver()
}
