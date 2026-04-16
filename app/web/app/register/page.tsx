'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest } from '@/lib/api'

export default function RegisterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [response, setResponse] = useState<unknown>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    consent: false,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await apiRequest('/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      })

      setResponse(result)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Registro realizado!</CardTitle>
            <CardDescription>Sua conta foi criada com sucesso.</CardDescription>
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

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Criar Conta</CardTitle>
          <CardDescription>Preencha os dados para se registrar</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Sua senha"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="reg-consent"
                type="checkbox"
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="reg-consent">Aceito os termos</Label>
            </div>

            {error && <div className="text-sm text-red-500 bg-red-50 p-3 rounded">{error}</div>}
          </CardContent>

          <CardFooter className="flex flex-col gap-3 mt-4">
            <Button type="submit" className="w-full" disabled={loading || !formData.consent}>
              {loading ? 'Registrando...' : 'Criar Conta'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Já tem uma conta?{' '}
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
