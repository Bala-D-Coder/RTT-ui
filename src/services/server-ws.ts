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

  // A server engine that accepts audio but never emits text leaves the bar stuck on
  // "Listening…" forever, so a silent session is reported as a failure instead.
  const NO_TRANSCRIPT_MS = 12_000
  let noTextTimer: number | null = null

  const emit = (event: WsTranscribeEvent) => {
    for (const listener of listeners) listener(event)
  }

  function clearNoTextTimer() {
    if (noTextTimer !== null) {
      window.clearTimeout(noTextTimer)
      noTextTimer = null
    }
  }

  function armNoTextTimer() {
    clearNoTextTimer()
    noTextTimer = window.setTimeout(() => {
      noTextTimer = null
      emit({
        type: 'error',
        code: 'no_transcript',
        message: 'The Gemini Live model returned no transcript. Switch the engine to Web Speech or Whisper.',
        retryable: false,
      })
      stopSession()
    }, NO_TRANSCRIPT_MS)
  }

  function stopSession() {
    running = false
    clearNoTextTimer()

    // 1. Immediately cut off microphone and audio processing so no unwanted thumps/clicks are sent
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

    // 2. Request backend flush and allow 2.5s graceful drain period for in-flight transcripts to arrive
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: 'flush' }))
        ws.send('flush')
      } catch {}

      const activeWs = ws
      setTimeout(() => {
        try {
          if (activeWs.readyState === WebSocket.OPEN) {
            activeWs.close(1000, 'User stopped dictation')
          }
        } catch {}
        if (ws === activeWs) ws = null
      }, 2500)
    } else {
      ws = null
    }
  }

  return {
    name: 'gemini',
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
      clearNoTextTimer()

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
                armNoTextTimer()
              }
              if (msg.type === 'ready') armNoTextTimer()
              if (msg.type === 'closed') clearNoTextTimer()
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
          clearNoTextTimer()
          if (running) {
            running = false
            emit({ type: 'closed', reason: event.reason || 'Server closed connection' })
          }
        }

        // 3. Audio capture at NATIVE hardware rate + manual clean downsample to 16000 Hz.
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })

        const track = stream.getAudioTracks()[0]
        console.log(`[ServerWS] 🎤 Mic acquired: "${track?.label ?? 'default'}"`, track?.getSettings())

        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        audioContext = new AudioContextClass()

        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }

        const nativeRate = audioContext.sampleRate // e.g. 48000 Hz
        const TARGET_RATE = 16000
        const downsampleRatio = nativeRate / TARGET_RATE // e.g. 3.0
        console.log(`[ServerWS] 🎛️ AudioContext native rate: ${nativeRate} Hz (resampling to ${TARGET_RATE} Hz, ratio: ${downsampleRatio.toFixed(3)})`)

        const source = audioContext.createMediaStreamSource(stream)

        // 100 Hz highpass filter: strips AC electrical ground hum (50/100 Hz) while preserving human speech
        const highpass = audioContext.createBiquadFilter()
        highpass.type = 'highpass'
        highpass.frequency.value = 100
        source.connect(highpass)

        // Speech booster gain node (6.0x digital boost) to amplify quiet laptop built-in microphones into VAD range
        const micBoost = audioContext.createGain()
        micBoost.gain.value = 6.0
        highpass.connect(micBoost)

        // Setup visual level meter analyser
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.75
        analyserData = new Uint8Array(analyser.frequencyBinCount)
        micBoost.connect(analyser)

        // 4096 samples at 48 kHz ≈ 85.3 ms of audio (~1365 samples at 16 kHz = 2730 bytes PCM16)
        const bufferSize = 4096
        processor = audioContext.createScriptProcessor(bufferSize, 1, 1)

        let chunkCounter = 0
        processor.onaudioprocess = (e) => {
          if (!running || !ws || ws.readyState !== WebSocket.OPEN) return
          const inputData = e.inputBuffer.getChannelData(0)

          // Downsample inputData (nativeRate) to 16000 Hz
          const outputLength = Math.floor(inputData.length / downsampleRatio)
          const pcm16 = new Int16Array(outputLength)
          let framePeak = 0
          for (let i = 0; i < outputLength; i++) {
            const srcPos = i * downsampleRatio
            const lo = Math.floor(srcPos)
            const hi = Math.min(lo + 1, inputData.length - 1)
            const frac = srcPos - lo
            const sLo = inputData[lo] ?? 0
            const sHi = inputData[hi] ?? 0
            const sample = sLo * (1 - frac) + sHi * frac
            const clamped = Math.max(-1, Math.min(1, sample))
            const val = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff
            pcm16[i] = val
            const abs = Math.abs(val)
            if (abs > framePeak) framePeak = abs
          }

          if (pcm16.length > 0) {
            chunkCounter++
            if (chunkCounter === 1 || chunkCounter % 40 === 0) {
              const peakPct = ((framePeak / 32767) * 100).toFixed(1)
              console.log(`[ServerWS] 📤 Sent audio chunk #${chunkCounter} (${pcm16.byteLength} bytes @ 16 kHz, peak: ${Math.round(framePeak)} / 32767 [${peakPct}%])`)
            }
            ws.send(pcm16.buffer)
          }
        }

        // Mute node with gain 0 connects to destination to keep processor node running
        // WITHOUT playing microphone audio back into the speakers (prevents feedback howl)
        const muteGain = audioContext.createGain()
        muteGain.gain.value = 0
        micBoost.connect(processor)
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
      stopSession()
    },
  }
}
