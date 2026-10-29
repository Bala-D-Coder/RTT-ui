import { env } from '@/constants/env'
import type { ApiError } from '@/types/contracts'

const TOKEN_KEY = 'rtt_access_token'

export function getAccessToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string | null) {
  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token)
    } else {
      window.localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    // Ignore storage errors in private browsing
  }
}

let refreshPromise: Promise<string | null> | null = null

async function requestTokenRefresh(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      const baseUrl = env.apiUrl || ''
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        setAccessToken(null)
        return null
      }
      const data = await res.json()
      const newToken = data.accessToken as string
      setAccessToken(newToken)
      return newToken
    } catch {
      setAccessToken(null)
      return null
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: any
  retryOn401?: boolean
}

export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { retryOn401 = true, ...init } = options
  const baseUrl = env.apiUrl || ''
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`

  const headers = new Headers(init.headers)
  const token = getAccessToken()
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (init.body && !(init.body instanceof FormData) && !(init.body instanceof Blob)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (typeof init.body === 'object') {
      init.body = JSON.stringify(init.body)
    }
  }

  init.credentials = 'include'
  init.headers = headers

  const res = await fetch(url, init)

  if (res.status === 401 && retryOn401) {
    const newToken = await requestTokenRefresh()
    if (newToken) {
      return apiFetch<T>(path, { ...options, retryOn401: false })
    }
  }

  if (!res.ok) {
    let errorEnvelope: ApiError | null = null
    try {
      errorEnvelope = (await res.json()) as ApiError
    } catch {
      // Not JSON
    }

    const message = errorEnvelope?.error?.message ?? `Request failed with status ${res.status}`
    const error = new Error(message) as Error & { code?: string; status: number; details?: unknown }
    error.status = res.status
    error.code = errorEnvelope?.error?.code ?? 'http_error'
    error.details = errorEnvelope?.error?.details
    throw error
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return null as T
  }

  const contentType = res.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return (await res.json()) as T
  }

  return (await res.text()) as unknown as T
}
