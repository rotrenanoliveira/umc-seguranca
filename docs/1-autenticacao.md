# Fluxo de autenticação

Documentação visual do fluxo de identidade do projeto UMC Segurança: login em duas etapas (senha + 2FA por e-mail), sessão com JWT de acesso e refresh em cookie `httpOnly`, renovação, logout e recuperação de senha.

Os diagramas usam [Mermaid](https://mermaid.js.org/) (`flowchart`). Em editores compatíveis (GitHub, GitLab, VS Code com extensão Mermaid), eles são renderizados automaticamente.

---

## Visão geral: do login à sessão ativa

```mermaid
flowchart TD
    A([Início: tela de login]) --> B[Usuário informa email e senha]
    B --> C[POST /auth/authenticate-password]
    C --> D{Usuário existe?}
    D -->|Não| E[400 - usuário não encontrado]
    D -->|Sim| F{Conta bloqueada?}
    F -->|Sim| G[423 - conta bloqueada]
    F -->|Não| H[bcrypt.compare com hash no banco]
    H --> I{Senha válida?}
    I -->|Não| J[Incrementa tentativas / possível bloqueio 15 min]
    I -->|Sim| K[Zera tentativas e remove códigos 2FA antigos]
    K --> L[Gera código 6 caracteres]
    L --> M[Persiste em access_code tipo TWO_FACTOR_EMAIL]
    M --> N[Envia código por e-mail]
    N --> O[Frontend: etapa do código 2FA]
    O --> P[Usuário informa código]
    P --> Q[POST /auth/authenticate-access-code]
    Q --> R{Código válido, do usuário e não expirado?}
    R -->|Não| S[401 ou contagem de tentativas / bloqueio]
    R -->|Sim| T[Cria sessionId e sessão no banco]
    T --> U[Gera accessToken JWT ~15m e refreshToken JWT ~7d]
    U --> V[Salva hash SHA-256 do refresh em sessions]
    V --> W[Remove código usado de access_code]
    W --> X[Define cookie httpOnly refreshToken]
    X --> Y[Retorna accessToken no corpo]
    Y --> Z[Frontend guarda accessToken em memória]
    Z --> AA([Dashboard / rotas protegidas])
```

---

## Requisições autenticadas e exemplo de perfil

```mermaid
flowchart LR
    subgraph Cliente
        FE[Frontend]
    end
    subgraph API
        EP[Rota protegida]
        JWT[Validação JWT]
    end
    FE -->|Authorization: Bearer accessToken| EP
    EP --> JWT
    JWT -->|sub = user id| FE
```

Exemplo documentado no projeto: `GET /sessions/me` com o cabeçalho `Authorization: Bearer <accessToken>`.

---

## Renovação do access token

```mermaid
flowchart TD
    A([Access token próximo de expirar ou expirado]) --> B[POST /sessions/refresh]
    B --> C[API lê refreshToken do cookie]
    C --> D{JWT válido e hash confere com sessions?}
    D -->|Não| E[Resposta de erro]
    D -->|Sim| F[Revoga sessão anterior]
    F --> G[Cria nova sessão]
    G --> H[Novo accessToken + novo refreshToken em cookie]
```

---

## Logout

```mermaid
flowchart TD
    A([Usuário encerra sessão]) --> B[POST /logout com accessToken]
    B --> C[API identifica sessão via cookie refreshToken]
    C --> D[Marca sessão como revogada]
    D --> E[Frontend remove accessToken da memória]
    E --> F([Redireciona para login])
```

---

## Recuperação de senha (fluxo paralelo ao login)

Independente do 2FA de login; usa `access_code` com tipo `PASSWORD_RESET` e TTL configurável (`PASSWORD_RESET_TTL_MIN`, ex.: 60 minutos).

```mermaid
flowchart TD
    subgraph Esqueci a senha
        A1([Usuário solicita recuperação]) --> A2[POST /password/forgot com email]
        A2 --> A3{Usuário existe?}
        A3 -->|Não| A4[400]
        A3 -->|Sim| A5[Gera código 6 caracteres]
        A5 --> A6[Persiste PASSWORD_RESET em access_code]
        A6 --> A7[Envia e-mail com o código]
    end
    subgraph Nova senha
        B1([Usuário define nova senha]) --> B2[POST /password/reset code + password]
        B2 --> B3{Código existe e dentro do prazo?}
        B3 -->|Não| B4[401]
        B3 -->|Sim| B5[Atualiza hash bcrypt da senha]
        B5 --> B6[Zera tentativas e lockedUntil]
        B6 --> B7[Revoga todas as sessões do usuário]
    end
```

---

## Referência rápida de endpoints

| Etapa | Método e caminho |
|-------|------------------|
| 1ª etapa login | `POST /auth/authenticate-password` |
| 2ª etapa login (2FA) | `POST /auth/authenticate-access-code` |
| Perfil autenticado | `GET /sessions/me` |
| Renovar tokens | `POST /sessions/refresh` |
| Encerrar sessão | `POST /logout` |
| Solicitar reset | `POST /password/forgot` |
| Confirmar nova senha | `POST /password/reset` |

Para detalhes em texto e números (tentativas, bloqueio, TTL do código 2FA), consulte o `README.md` na raiz do repositório.
