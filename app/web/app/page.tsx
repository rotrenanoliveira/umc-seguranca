'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

type LoginStep = 'password' | 'code'

export default function LoginPage() {
  const router = useRouter()
  const { setAccessToken } = useAuth()

  const [step, setStep] = useState<LoginStep>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: apiError } = await apiRequest<{ expiresInMinutes: number; message: string }>(
      '/auth/authenticate-password',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        headers: {
          'Content-Type': 'application/json',
        },
      },
    )

    setLoading(false)

    if (apiError) {
      setError(apiError)
      return
    }

    if (data) {
      setMessage(data.message)
      setStep('code')
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: apiError } = await apiRequest<{ token: string }>('/auth/authenticate-access-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    setLoading(false)

    if (apiError) {
      setError(apiError)
      return
    }

    if (data?.token) {
      setAccessToken(data.token)
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>
            {step === 'password'
              ? 'Digite seu email e senha para continuar'
              : 'Digite o código de acesso enviado para seu email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'password' ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Autenticando...' : 'Continuar'}
              </Button>
              <div className="flex justify-between text-sm">
                <Link href="/register" className="text-primary hover:underline">
                  Criar conta
                </Link>
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Esqueci a senha
                </Link>
              </div>
            </form>
          ) : (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              {message && <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{message}</p>}
              <div className="space-y-2">
                <Label htmlFor="code">Código de Acesso</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Digite o código"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setStep('password')
                  setCode('')
                  setError('')
                  setMessage('')
                }}
              >
                Voltar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
