import type { RecorderState } from '@/types/contracts'

export const statusLabels: Record<RecorderState, string> = {
  idle: 'Ready',
  requesting: 'Allow microphone…',
  listening: 'Listening',
  error: 'Transcription error',
}

export const meterBars = 16
