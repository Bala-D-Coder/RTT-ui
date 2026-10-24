import { z } from 'zod'

const schema = z.object({
  VITE_DATA_SOURCE: z.enum(['mock', 'http']).default('mock'),
  VITE_TRANSCRIBE: z.enum(['webspeech', 'replay']).default('webspeech'),
  VITE_API_URL: z.string().url().optional(),
})

const parsed = schema.safeParse(import.meta.env)

if (!parsed.success) {
  const detail = parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')
  throw new Error(`Invalid environment: ${detail}`)
}

export const env = {
  dataSource: parsed.data.VITE_DATA_SOURCE,
  transcribe: parsed.data.VITE_TRANSCRIBE,
  apiUrl: parsed.data.VITE_API_URL ?? '',
}
