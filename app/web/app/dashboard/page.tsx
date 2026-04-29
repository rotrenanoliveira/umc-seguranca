'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ApiTester } from '@/components/api-tester'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { API_BASE_URL, apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'

interface UserProfile {
  user: {
    name: string
    email: string | null
  }
}

export default function DashboardPage() {
  const router = useRouter()
  const { accessToken, logout, isAuthenticated } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchProfile = async () => {
    setLoading(true)
    setError('')

    const { data, error: apiError } = await apiRequest<UserProfile>('/sessions/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    setLoading(false)

    if (apiError) {
      setError(apiError)
      return
    }

    if (data) {
      setProfile(data)
    }
  }

  const handleLogout = async () => {
    await apiRequest('/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    logout()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard - API Tester</h1>
          <div className="flex items-center gap-2">
            <span
              className={`text-sm px-2 py-1 rounded ${isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              {isAuthenticated ? 'Autenticado' : 'Não autenticado'}
            </span>
            {isAuthenticated && (
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            )}
          </div>
        </div>

        {accessToken && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Access Token</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs bg-muted p-2 rounded block break-all">{accessToken}</code>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Perfil do Usuário</CardTitle>
            <CardDescription>GET /sessions/me</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={fetchProfile} disabled={loading || !isAuthenticated}>
              {loading ? 'Carregando...' : 'Buscar Perfil'}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
            {profile && (
              <div className="bg-muted p-4 rounded-md">
                <pre className="text-sm">{JSON.stringify(profile, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <ApiTester />

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              API Base URL: <code className="bg-muted px-1 rounded">{API_BASE_URL}</code>
            </p>
            <span>Veja a documentação da API neste link:</span>
            <Button variant='link' asChild> 
              <Link href={'https://umc-seguranca.onrender.com/docs/'} target='_blank' rel='noopener noreferrer'>aqui</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
