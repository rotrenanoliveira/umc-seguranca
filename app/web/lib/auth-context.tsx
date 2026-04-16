'use client'

import { createContext, type ReactNode, useCallback, useContext, useState } from 'react'

interface AuthContextType {
  accessToken: string | null
  setAccessToken: (token: string | null) => void
  isAuthenticated: boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)

  const logout = useCallback(() => {
    setAccessToken(null)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        setAccessToken,
        isAuthenticated: !!accessToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
