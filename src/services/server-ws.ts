import { apiFetch } from './api-fetch'
import type { TranscriptionDriver, TranscriptionOptions } from './transcription'
import type { WsTranscribeEvent } from '@/types/contracts'

export function createServerWsDriver(): TranscriptionDriver {
  const listeners = new Set<(event: WsTranscribeEvent) => void>()
  let ws: WebSocket | null = null
  let audioContext: AudioContext | null = null
  let processor: ScriptProcessorNode | null = null
  let stream: MediaStream | null = null
  let analyser: AnalyserNode | null = null
  let analyserData: Uint8Array<ArrayBuffer> | null = null
  let running = false

  const emit = (event: WsTranscribeEvent) => {
    for (const listener of listeners) listener(event)
  }

  return {
    name: 'whisper',
    model: 'gemini-3.5-transcribe-live',
    supported: Boolean(window.WebSocket && navigator.mediaDevices?.getUserMedia),

    levels(bars) {
      if (!analyser || !analyserData) return null
      analyser.getByteFrequencyData(analyserData)
      const perBand = Math.floor(analyserData.length / bars) || 1
      const values: number[] = []
      for (let index = 0; index < bars; index += 1) {
        let sum = 0
        for (let step = 0; step < perBand; step += 1) {
          sum += analyserData[index * perBand + step] ?? 0
        }
        values.push(Math.min(1, sum / perBand / 140))
      }
      return values
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    async start(_options: TranscriptionOptions) {
      running = true

      try {
        // 1. Fetch single-use ticket from backend
        const ticketRes = await apiFetch<{ ticket: string }>('/api/v1/realtime/ticket', {
          method: 'POST',
        })
        const ticket = ticketRes?.ticket
        if (!ticket) {
          throw new Error('Failed to acquire transcription ticket from backend')
        }

        // 2. Establish WebSocket connection to backend
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsHost = window.location.port === '5173' ? 'localhost:8080' : window.location.host
        const wsUrl = `${protocol}//${wsHost}/ws/transcribe?ticket=${encodeURIComponent(ticket)}`

        ws = new WebSocket(wsUrl)
        ws.binaryType = 'arraybuffer'

        ws.onopen = () => {
          console.log('[ServerWS] WebSocket connected, sending start message')
          ws?.send(
            JSON.stringify({
              sampleRate: 16000,
              encoding: 'pcm16',
              channels: 1,
              mode: 'create',
            })
          )
        }

        ws.onmessage = (event) => {
          if (typeof event.data === 'string') {
            try {
              const msg = JSON.parse(event.data) as WsTranscribeEvent
              if (msg.type === 'partial' || msg.type === 'final') {
                console.log(`[ServerWS] [${msg.type}]`, msg.text)
              }
              emit(msg)
            } catch (err) {
              console.warn('[ServerWS] Failed to parse WS transcribe message', err)
            }
          }
        }

        ws.onerror = (err) => {
          console.error('[ServerWS] WebSocket transcription error', err)
          emit({
            type: 'error',
            code: 'ws_error',
            message: 'Connection to transcription server failed. Ensure Spring Boot backend is active.',
            retryable: true,
          })
        }

        ws.onclose = (event) => {
          console.log('[ServerWS] WebSocket closed:', event.code, event.reason)
          if (running) {
            running = false
            emit({ type: 'closed', reason: event.reason || 'Server closed connection' })
          }
        }

        // 3. Audio capture at NATIVE hardware rate + manual clean downsample to 16000 Hz.
        // NOTE: In Chromium on Windows, passing { sampleRate: 16000 } to AudioContext causes
        // MediaStreamAudioSourceNode to feed raw 48 kHz hardware audio WITHOUT resampling,
        // which stretches speech by 3x into an unintelligible low-frequency rumble.
        // Capturing at native rate and downsampling manually guarantees true 16 kHz audio.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioContext = new AudioContextClass()

        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }

        const nativeRate = audioContext.sampleRate // e.g. 48000 Hz
        const TARGET_RATE = 16000
        const downsampleRatio = nativeRate / TARGET_RATE // e.g. 3.0
        console.log(`[ServerWS] AudioContext running at native ${nativeRate} Hz (resampling to ${TARGET_RATE} Hz, ratio: ${downsampleRatio.toFixed(3)})`)

        const source = audioContext.createMediaStreamSource(stream)

        // Setup visual level meter analyser directly on the source
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.75
        analyserData = new Uint8Array(analyser.frequencyBinCount)
        source.connect(analyser)

        // 4096 samples at 48 kHz ≈ 85.3 ms of audio
        // After downsample by 3.0 → ~1365 samples at 16 kHz (2730 bytes PCM16)
        const bufferSize = 4096
        processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        let chunkCounter = 0
        processor.onaudioprocess = (e) => {
          if (!running || !ws || ws.readyState !== WebSocket.OPEN) return
          const inputData = e.inputBuffer.getChannelData(0)

          // Downsample inputData (nativeRate) to 16000 Hz
          const outputLength = Math.floor(inputData.length / downsampleRatio)
          const pcm16 = new Int16Array(outputLength)
          for (let i = 0; i < outputLength; i++) {
            const srcPos = i * downsampleRatio
            const lo = Math.floor(srcPos)
            const hi = Math.min(lo + 1, inputData.length - 1)
            const frac = srcPos - lo
            const sLo = inputData[lo] ?? 0
            const sHi = inputData[hi] ?? 0
            const sample = sLo * (1 - frac) + sHi * frac
            const clamped = Math.max(-1, Math.min(1, sample))
            pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
          }

          if (pcm16.length > 0) {
            chunkCounter++
            if (chunkCounter === 1 || chunkCounter % 40 === 0) {
              console.log(`[ServerWS] Sent audio chunk #${chunkCounter} (${pcm16.byteLength} bytes @ 16 kHz)`)
            }
            ws.send(pcm16.buffer)
          }
        }

        // Mute node with gain 0 connects to destination to keep processor node running
        // WITHOUT playing microphone audio back into the speakers (prevents feedback howl)
        const muteGain = audioContext.createGain()
        muteGain.gain.value = 0
        source.connect(processor)
        processor.connect(muteGain)
        muteGain.connect(audioContext.destination)
      } catch (err) {
        running = false
        console.error('[ServerWS] Audio capture initialization failed', err)
        emit({
          type: 'error',
          code: 'capture_failed',
          message: (err as Error).message || 'Failed to start microphone transcription streaming',
          retryable: true,
        })
      }
    },

    stop() {
      running = false
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'flush' }))
          ws.send('flush')
        } catch {}
        setTimeout(() => {
          try {
            ws?.close(1000, 'User stopped dictation')
          } catch {}
          ws = null
        }, 300)
      } else {
        ws = null
      }

      if (processor) {
        processor.disconnect()
        processor = null
      }
      if (audioContext) {
        void audioContext.close()
        audioContext = null
      }
      if (stream) {
        for (const track of stream.getTracks()) track.stop()
        stream = null
      }
      analyser = null
      analyserData = null
    },
  }
}
