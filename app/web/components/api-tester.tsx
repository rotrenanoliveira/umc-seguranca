'use client'

import { useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiRequest } from '@/lib/api'

interface ApiTesterProps {
  accessToken: string | null
}

export function ApiTester({ accessToken }: ApiTesterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Testar Rotas da API</CardTitle>
        <CardDescription>Teste todas as rotas disponíveis</CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <RegisterTester />
          <RefreshTokenTester accessToken={accessToken} />
        </Accordion>
      </CardContent>
    </Card>
  )
}

function RegisterTester() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    const { data, error } = await apiRequest<{ userId: string }>('/users', {
      method: 'POST',
      body: JSON.stringify({ email, name, password, consent }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    setLoading(false)
    setResult(error ? `Erro: ${error}` : `Sucesso: ${JSON.stringify(data)}`)
  }

  return (
    <AccordionItem value="register">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</span>
          /users - Registro
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <form onSubmit={handleSubmit} className="space-y-4 p-2">
          <div className="space-y-2">
            <Label htmlFor="reg-name">Nome</Label>
            <Input
              id="reg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome completo"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">Email</Label>
            <Input
              id="reg-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-password">Senha</Label>
            <Input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Senha"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="reg-consent"
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="reg-consent">Aceito os termos</Label>
          </div>
          <Button type="submit" disabled={loading} size="sm">
            {loading ? 'Enviando...' : 'Registrar'}
          </Button>
          {result && <pre className="text-xs bg-muted p-2 rounded mt-2 whitespace-pre-wrap">{result}</pre>}
        </form>
      </AccordionContent>
    </AccordionItem>
  )
}

function RefreshTokenTester({ accessToken }: { accessToken: string | null }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const handleSubmit = async () => {
    setLoading(true)
    setResult(null)

    const { data, error } = await apiRequest<{ token: string }>('/sessions/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })

    setLoading(false)
    setResult(error ? `Erro: ${error}` : `Sucesso: ${JSON.stringify(data)}`)
  }

  return (
    <AccordionItem value="refresh-token">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">POST</span>
          /sessions/refresh - Refresh Token
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-4 p-2">
          <p className="text-sm text-muted-foreground">Usa o cookie refreshToken para obter um novo accessToken</p>
          <Button onClick={handleSubmit} disabled={loading} size="sm">
            {loading ? 'Enviando...' : 'Refresh Token'}
          </Button>
          {result && <pre className="text-xs bg-muted p-2 rounded mt-2 whitespace-pre-wrap">{result}</pre>}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
