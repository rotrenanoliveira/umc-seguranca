// Configuração da API - altere a URL base conforme necessário
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data: T | null; error: string | null; headers: Headers }> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
      },
      credentials: 'include', // Para incluir cookies
    })

    console.log(response)
    const headers = response.headers

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        data: null,
        error: errorData.error || errorData.message || `Error: ${response.status}`,
        headers,
      }
    }


    const data = await response.json()
    return { data, error: null, headers }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Erro de conexão',
      headers: new Headers(),
    }
  }
}
