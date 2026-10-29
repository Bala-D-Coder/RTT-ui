export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function formatDuration(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatRelativeTime(iso: string) {
  const diffMs = new Date(iso).getTime() - Date.now()
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['day', 86_400_000],
    ['hour', 3_600_000],
    ['minute', 60_000],
    ['second', 1_000],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(diffMs) >= size) {
      return formatter.format(Math.round(diffMs / size), unit)
    }
  }
  return 'now'
}

export function localId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
