import type { ISODate } from '@/types/contracts'

// The only place the retention window is written down. The Bin copy, the countdown
// bar and the purge scanner all read it from here.
export const BIN_RETENTION_DAYS = 30

const DAY_MS = 86_400_000

export function purgeDateFor(deletedAt: ISODate): ISODate {
  return new Date(new Date(deletedAt).getTime() + BIN_RETENTION_DAYS * DAY_MS).toISOString()
}

export function daysLeftBeforePurge(purgeAt: ISODate | null): number {
  if (!purgeAt) return BIN_RETENTION_DAYS
  const remaining = new Date(purgeAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(remaining / DAY_MS))
}

export function purgeProgress(purgeAt: ISODate | null): number {
  if (!purgeAt) return 0
  const remaining = new Date(purgeAt).getTime() - Date.now()
  const ratio = 1 - remaining / (BIN_RETENTION_DAYS * DAY_MS)
  return Math.min(1, Math.max(0, ratio))
}

export function isPurgeDue(purgeAt: ISODate | null): boolean {
  if (!purgeAt) return false
  return new Date(purgeAt).getTime() <= Date.now()
}
