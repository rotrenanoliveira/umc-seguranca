'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

interface UserProfile {
  user: {
    name: string
    email: string | null
  }
}

interface PersonalDataResponse {
  message: string
}

export default function DashboardPage() {
  const { accessToken, logout, isAuthenticated } = useAuth()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileError, setProfileError] = useState('')

  const [lgpdLoading, setLgpdLoading] = useState(false)
  const [lgpdMessage, setLgpdMessage] = useState('')
  const [lgpdError, setLgpdError] = useState('')

  const loadProfile = useCallback(async () => {
    if (!accessToken) return

    setProfileLoading(true)
    setProfileError('')

    const { data, error: apiError } = await apiRequest<UserProfile>('/sessions/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    setProfileLoading(false)

    if (apiError) {
      setProfile(null)
      setProfileError(apiError)
      return
    }

    if (data) {
      setProfile(data)
    }
  }, [accessToken])

  useEffect(() => {
    if (isAuthenticated) {
      void loadProfile()
    } else {
      setProfile(null)
      setProfileError('')
    }
  }, [isAuthenticated, loadProfile])

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

  const requestPersonalDataExport = async () => {
    if (!accessToken) return

    setLgpdLoading(true)
    setLgpdMessage('')
    setLgpdError('')

    const { data, error: apiError } = await apiRequest<PersonalDataResponse>('/sessions/me/personal-data', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    setLgpdLoading(false)

    if (apiError) {
      setLgpdError(apiError)
      return
    }

    if (data?.message) {
      setLgpdMessage(data.message)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Painel</h1>
          {isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={handleLogout} className='cursor-pointer'>
              Sair
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/">Entrar</Link>
            </Button>
          )}
        </header>

        {!isAuthenticated ? (
          <Card>
            <CardHeader>
              <CardTitle>Sessão necessária</CardTitle>
              <CardDescription>Faça login para ver seu perfil e usar as opções desta página.</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/">Ir para o login</Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Seu perfil</CardTitle>
              <CardDescription>Dados obtidos de GET /sessions/me</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileLoading && <p className="text-sm text-muted-foreground">Carregando perfil…</p>}
              {profileError && <p className="text-sm text-destructive">{profileError}</p>}
              {profile && (
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Nome</dt>
                    <dd className="font-medium">{profile.user.name}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">E-mail</dt>
                    <dd className="font-medium">{profile.user.email ?? '—'}</dd>
                  </div>
                </dl>
              )}
              {!profileLoading && !profileError && !profile && (
                <p className="text-sm text-muted-foreground">Nenhum dado de perfil disponível.</p>
              )}

              <div className="border-t pt-4">
                <h3 className="mb-1 text-sm font-medium">Cópia dos dados (LGPD)</h3>
                <p className="mb-3 text-sm text-muted-foreground">
                  Solicita a exportação completa dos dados vinculados à sua conta (art. 18, I e II da LGPD). O
                  sistema gera um arquivo CSV e envia para o e-mail cadastrado.
                </p>
                <Button type="button" onClick={requestPersonalDataExport} disabled={lgpdLoading} className='cursor-pointer'>
                  {lgpdLoading ? 'Enviando…' : 'Solicitar exportação dos meus dados'}
                </Button>
                {lgpdError && <p className="mt-2 text-sm text-destructive">{lgpdError}</p>}
                {lgpdMessage && <p className="mt-2 text-sm text-green-700 dark:text-green-400">{lgpdMessage}</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
