/**
 * Drives the RecorderBar level meter from real microphone energy.
 * The mic stream is analysed only — it is never connected to `audioContext.destination`,
 * which is what causes the feedback howl in naive implementations.
 * If capture fails (no device, denied, non-secure context) the meter reports
 * `available = false` and the bar falls back to its idle animation.
 */
export interface LevelMeter {
  available: boolean
  start(): Promise<void>
  stop(): void
  levels(bars: number): number[] | null
}

type AudioContextCtor = new () => AudioContext

function resolveAudioContext(): AudioContextCtor | null {
  const withPrefix = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor }
  return withPrefix.AudioContext ?? withPrefix.webkitAudioContext ?? null
}

export function createLevelMeter(): LevelMeter {
  let context: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let stream: MediaStream | null = null
  let data: Uint8Array<ArrayBuffer> | null = null
  let available = false

  return {
    get available() {
      return available
    },

    async start() {
      if (context || !navigator.mediaDevices?.getUserMedia) return
      const Ctor = resolveAudioContext()
      if (!Ctor) return
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      })
      context = new Ctor()
      const source = context.createMediaStreamSource(stream)
      analyser = context.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      data = new Uint8Array(analyser.frequencyBinCount)
      available = true
    },

    stop() {
      for (const track of stream?.getTracks() ?? []) track.stop()
      void context?.close()
      context = null
      analyser = null
      stream = null
      data = null
      available = false
    },

    levels(bars: number) {
      if (!analyser || !data) return null
      analyser.getByteFrequencyData(data)
      const perBand = Math.floor(data.length / bars) || 1
      const values: number[] = []
      for (let index = 0; index < bars; index += 1) {
        let sum = 0
        for (let step = 0; step < perBand; step += 1) {
          sum += data[index * perBand + step] ?? 0
        }
        // Speech energy sits in the lower bins; normalise against that instead of full scale.
        values.push(Math.min(1, sum / perBand / 140))
      }
      return values
    },
  }
}
