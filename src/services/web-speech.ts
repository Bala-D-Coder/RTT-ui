import { localId } from '@/utils/format'
import type { LevelMeter } from './level-meter'
import { createLevelMeter } from './level-meter'
import type { TranscriptionDriver, TranscriptionOptions } from './transcription'
import type { WsTranscribeEvent } from '@/types/contracts'

interface SpeechAlternative {
  transcript: string
  confidence: number
}

interface SpeechResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechAlternative
}

interface SpeechResultList {
  length: number
  [index: number]: SpeechResult
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechResultList
}

interface SpeechRecognitionErrorLike {
  error: string
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onstart: (() => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

function resolveCtor(): SpeechRecognitionCtor | null {
  const withSpeech = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return withSpeech.SpeechRecognition ?? withSpeech.webkitSpeechRecognition ?? null
}

export function isWebSpeechSupported() {
  return resolveCtor() !== null
}

// Only the failures the user can act on. `no-speech` and `aborted` are routine
// between pauses and must not flash an error banner.
const ERRORS: Record<string, { message: string; fatal: boolean }> = {
  'not-allowed': { message: 'Microphone access was blocked. Allow it in the browser address bar and try again.', fatal: true },
  'service-not-allowed': { message: 'The browser blocked the speech service. Check site permission settings.', fatal: true },
  'audio-capture': { message: 'No microphone found. Connect an input device and retry.', fatal: true },
  network: { message: 'The browser speech service is unreachable. Check your connection.', fatal: true },
  'not-supported': { message: 'Speech recognition is not supported in this browser.', fatal: true },
}

export function createWebSpeechDriver(): TranscriptionDriver {
  const Ctor = resolveCtor()
  const listeners = new Set<(event: WsTranscribeEvent) => void>()
  const meter: LevelMeter = createLevelMeter()
  let recognition: SpeechRecognitionLike | null = null
  let running = false
  let seq = 0
  let startedAt = 0
  let cursorMs = 0
  let lang = 'en-IN'

  const emit = (event: WsTranscribeEvent) => {
    for (const listener of listeners) listener(event)
  }

  const elapsed = () => Date.now() - startedAt

  function build() {
    if (!Ctor) return null
    const instance = new Ctor()
    instance.lang = lang
    instance.continuous = true
    instance.interimResults = true
    instance.maxAlternatives = 1

    instance.onstart = () => {
      emit({ type: 'ready', sessionId: localId('ws') })
    }

    instance.onresult = (event) => {
      let interim = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const alternative = result?.[0]
        if (!result || !alternative) continue
        const text = alternative.transcript.trim()
        if (!text) continue

        if (result.isFinal) {
          const endMs = elapsed()
          seq += 1
          emit({
            type: 'final',
            seq,
            text,
            startMs: cursorMs,
            endMs,
            confidence: alternative.confidence,
            lang,
          })
          cursorMs = endMs
        } else {
          interim += `${interim ? ' ' : ''}${text}`
        }
      }
      if (interim) emit({ type: 'partial', text: interim, source: 'webspeech', ts: elapsed() })
    }

    instance.onerror = (event) => {
      const entry = ERRORS[event.error]
      if (!entry) return
      emit({ type: 'error', code: event.error, message: entry.message, retryable: !entry.fatal })
      if (entry.fatal) running = false
    }

    instance.onend = () => {
      if (!running) {
        emit({ type: 'closed', reason: 'user_stopped' })
        return
      }
      // Chrome closes the stream after a silence gap; reopen so the bar stays live.
      try {
        instance.start()
      } catch {
        running = false
        emit({ type: 'closed', reason: 'ended' })
      }
    }

    return instance
  }

  return {
    name: 'webspeech',
    model: 'browser-speech',
    supported: Boolean(Ctor),

    levels(bars) {
      return meter.levels(bars)
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    start(options: TranscriptionOptions) {
      lang = options.lang
      running = true
      seq = 0
      cursorMs = 0
      startedAt = Date.now()
      // Analysis is best-effort: if capture fails the transcript still streams.
      void meter.start().catch(() => undefined)
      recognition = build()
      try {
        recognition?.start()
      } catch {
        running = false
        emit({
          type: 'error',
          code: 'start-failed',
          message: 'Speech recognition could not start. Close other tabs using the microphone and retry.',
          retryable: true,
        })
      }
    },

    stop() {
      running = false
      recognition?.stop()
      recognition = null
      meter.stop()
    },
  }
}
