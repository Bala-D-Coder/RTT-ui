import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { env } from '@/constants/env'
import { getMe, login as authLogin, logout as authLogout } from '@/services/auth'
import type { User } from '@/types/contracts'

interface AuthContextValue {
  user: User | null
  loading: boolean
  isAdmin: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(
    env.dataSource === 'mock'
      ? { id: 'mock-user', email: 'demo@apex.in', name: 'Demo User', timezone: 'Asia/Kolkata', role: 'admin' }
      : null,
  )
  const [loading, setLoading] = useState(env.dataSource === 'http')

  useEffect(() => {
    if (env.dataSource !== 'http') return
    let mounted = true
    getMe()
      .then((currentUser) => {
        if (mounted) {
          setUser(currentUser)
          setLoading(false)
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  const login = useCallback(async (email: string, pass: string) => {
    const session = await authLogin(email, pass)
    setUser(session.user)
  }, [])

  const logout = useCallback(async () => {
    await authLogout()
    setUser(null)
  }, [])

  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
