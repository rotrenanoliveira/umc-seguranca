'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest } from '@/lib/api'

type Step = 'request' | 'reset' | 'success'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<unknown>(null)

  const [email, setEmail] = useState('')
  const [resetData, setResetData] = useState({
    token: '',
    password: '',
  })

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await apiRequest('/password/forgot', {
        method: 'POST',
        body: JSON.stringify({ email }),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      setResponse(result)
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao solicitar recuperação')
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await apiRequest('/password/reset', {
        method: 'PATCH',
        body: JSON.stringify(resetData),
        headers: {
          'Content-Type': 'application/json',
        },
      })

      setResponse(result)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Senha redefinida!</CardTitle>
            <CardDescription>Sua senha foi alterada com sucesso.</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-48">
              {JSON.stringify(response, null, 2)}
            </pre>
          </CardContent>
          <CardFooter>
            <Link href="/" className="w-full">
              <Button className="w-full">Ir para Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </main>
    )
  }

  if (step === 'reset') {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Redefinir Senha</CardTitle>
            <CardDescription>Insira o token recebido e sua nova senha</CardDescription>
          </CardHeader>
          <form onSubmit={handleResetPassword}>
            <CardContent className="space-y-4">
              <div className="bg-muted p-3 rounded">
                <p className="text-sm text-muted-foreground mb-2">Resposta da solicitação:</p>
                <pre className="text-xs overflow-auto max-h-24">{JSON.stringify(response, null, 2)}</pre>
              </div>

              <div className="space-y-2">
                <Label htmlFor="token">Token de Recuperação</Label>
                <Input
                  id="token"
                  type="text"
                  placeholder="Token recebido por email"
                  value={resetData.token}
                  onChange={(e) => setResetData({ ...resetData, token: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Sua nova senha"
                  value={resetData.password}
                  onChange={(e) => setResetData({ ...resetData, password: e.target.value })}
                  required
                />
              </div>

              {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</div>}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => setStep('request')}>
                Voltar
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Recuperar Senha</CardTitle>
          <CardDescription>Insira seu email para receber o token de recuperação</CardDescription>
        </CardHeader>
        <form onSubmit={handleRequestReset}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</div>}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Enviando...' : 'Solicitar Recuperação'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Lembrou a senha?{' '}
              <Link href="/" className="text-primary hover:underline">
                Fazer login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </main>
  )
}
