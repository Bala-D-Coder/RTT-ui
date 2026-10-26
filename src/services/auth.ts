import { apiFetch, getAccessToken, setAccessToken } from './api-fetch'
import type { Session, User } from '@/types/contracts'

export async function login(email: string, password: string): Promise<Session> {
  const session = await apiFetch<Session>('/api/v1/auth/login', {
    method: 'POST',
    body: { email, password },
    retryOn401: false,
  })
  if (session?.accessToken) {
    setAccessToken(session.accessToken)
  }
  return session
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/v1/auth/logout', { method: 'POST', retryOn401: false })
  } finally {
    setAccessToken(null)
  }
}

export async function getMe(): Promise<User | null> {
  const token = getAccessToken()
  if (!token) return null
  try {
    return await apiFetch<User>('/api/v1/auth/me')
  } catch {
    setAccessToken(null)
    return null
  }
}
