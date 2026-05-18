# Arquitetura — seguranca-api

API de autenticação e gestão de identidade do projeto **UMC Segurança**. Responsável por cadastro, login (senha + 2FA por e-mail), sessões JWT, recuperação de senha e direitos do titular (LGPD).

## Visão geral

```mermaid
flowchart TB
  subgraph Clientes["Clientes"]
    WEB["Frontend / SPA"]
    MOBILE["Apps / integrações"]
  end

  subgraph Proxy["Produção (recomendado)"]
    TLS["Proxy reverso / TLS"]
  end

  subgraph API["seguranca-api (Node.js 20+)"]
    FASTIFY["Fastify 5"]
    PLUGINS["Plugins: JWT, Cookie, CORS, Helmet, Rate Limit"]
    ROUTES["Rotas HTTP v1"]
    LOGGER["Logger de acesso"]
  end

  subgraph Dados["Persistência"]
    PG[("PostgreSQL")]
    LOGFILES["Arquivos log/access-YYYY-MM-DD.log"]
  end

  subgraph Externos["Serviços externos"]
    RESEND["Resend (e-mail)"]
  end

  WEB --> TLS
  MOBILE --> TLS
  TLS --> FASTIFY
  FASTIFY --> PLUGINS
  PLUGINS --> ROUTES
  ROUTES --> PG
  LOGGER --> PG
  LOGGER --> LOGFILES
  ROUTES --> RESEND
```

## Camadas do código

Organização em pastas sob `src/`:

```mermaid
flowchart LR
  subgraph Entrada
    SERVER["infra/http/server.ts"]
    APP["infra/http/app.ts"]
  end

  subgraph HTTP["Camada HTTP (infra/http)"]
    ROUTES["routes/v1/*"]
    PLUG["plugins/logger.ts"]
  end

  subgraph DominioUtil["Utilitários e libs"]
    CRYPTO["utils/crypto.ts"]
    EXPORT["utils/export-personal-data.ts"]
    NANOID["lib/nanoid.ts"]
    RESEND_LIB["lib/resend.ts"]
  end

  subgraph Config["Configuração"]
    ENV["environment-variables.ts"]
    CFG["config.ts"]
  end

  subgraph Persistencia["Persistência (infra/database)"]
    DB["index.ts — Drizzle client"]
    SCHEMA["schema.ts"]
    REPO["repositories.ts"]
  end

  SERVER --> APP
  APP --> ROUTES
  APP --> PLUG
  ROUTES --> DB
  ROUTES --> CRYPTO
  ROUTES --> RESEND_LIB
  ROUTES --> EXPORT
  ROUTES --> NANOID
  APP --> ENV
  ROUTES --> CFG
  DB --> SCHEMA
  REPO --> SCHEMA
```

| Camada | Responsabilidade |
|--------|------------------|
| `infra/http` | Servidor Fastify, registro de plugins, rotas e documentação OpenAPI |
| `infra/database` | Schema Drizzle, conexão PostgreSQL e aliases de repositório |
| `utils` / `lib` | Criptografia de PII, exportação LGPD, IDs e envio de e-mail |
| `config` / `environment-variables` | Constantes de negócio e validação de variáveis de ambiente (Zod) |

## Stack tecnológica

| Componente | Tecnologia |
|------------|------------|
| Runtime | Node.js ≥ 20 |
| Framework HTTP | Fastify 5 |
| Validação / contratos | Zod + fastify-type-provider-zod |
| ORM | Drizzle ORM |
| Banco | PostgreSQL (`pg` / `postgres`) |
| Autenticação | `@fastify/jwt` + `@fastify/cookie` |
| Senhas | bcryptjs |
| Dados sensíveis em repouso | AES-256-CBC (`ENCRYPTION_KEY`) |
| E-mail transacional | Resend |
| Documentação | Swagger + Scalar (`/docs`) |
| Build | tsup → `dist/index.js` |

## Plugins e segurança HTTP

```mermaid
flowchart TD
  REQ["Requisição HTTP"] --> HELMET["Helmet"]
  HELMET --> CORS["CORS (credentials)"]
  CORS --> RATE["Rate Limit (100 req/min)"]
  RATE --> JWT_PLUGIN["JWT (access token)"]
  JWT_PLUGIN --> COOKIE["Cookie assinado (refresh)"]
  COOKIE --> ROUTE["Handler da rota"]
  ROUTE --> RESP["Resposta"]
  RESP --> HOOK["Hook onResponse — access log"]
```

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Referência da API (Scalar) |
| `POST` | `/users` | Cadastro de usuário |
| `POST` | `/auth/authenticate-password` | Login com e-mail e senha (inicia 2FA) |
| `POST` | `/auth/authenticate-access-code` | Valida código e emite tokens |
| `POST` | `/sessions/refresh` | Renova access token via refresh cookie |
| `POST` | `/logout` | Revoga sessão |
| `POST` | `/password/forgot` | Solicita reset de senha |
| `POST` | `/password/reset` | Redefine senha com token |
| `GET` | `/sessions/me` | Perfil do usuário autenticado |
| `GET` | `/sessions/me/personal-data` | Exportação de dados (LGPD) |
| `DELETE` | `/users/me` | Exclusão de conta (LGPD) |

## Fluxo de autenticação (2FA por e-mail)

```mermaid
sequenceDiagram
  participant C as Cliente
  participant API as seguranca-api
  participant DB as PostgreSQL
  participant R as Resend

  C->>API: POST /auth/authenticate-password
  API->>DB: Valida e-mail/senha (bcrypt)
  alt Tentativas excedidas
    API-->>C: 423 Conta bloqueada
  else Senha inválida
    API->>DB: Incrementa failedLoginAttempts
    API-->>C: 401
  else Sucesso
    API->>DB: Cria access_code (TWO_FACTOR_PENDING)
    API->>R: Envia código por e-mail
    API-->>C: 200 (aguardar código)
  end

  C->>API: POST /auth/authenticate-access-code
  API->>DB: Valida código e tipo
  API->>DB: Cria sessão (refresh hash)
  API-->>C: accessToken (JWT) + refreshToken (cookie)

  C->>API: POST /sessions/refresh
  API->>DB: Valida sessão não revogada
  API-->>C: Novo accessToken
```

## Modelo de dados

```mermaid
erDiagram
  users ||--o{ access_code : "possui"
  users ||--o{ sessions : "possui"
  users ||--o{ access_logs : "referencia"

  users {
    text user_id PK
    text email UK
    text name "criptografado AES"
    text password "hash bcrypt"
    int failed_login_attempts
    timestamp locked_until
    boolean two_factor_email_enabled
    timestamp consent_at
  }

  access_code {
    text code_id PK
    text user_id FK
    text token "criptografado"
    enum type "PASSWORD_RESET | TWO_FACTOR_*"
    timestamp used_at
  }

  sessions {
    text session_id PK
    text user_id FK
    text refresh_token_hash UK
    timestamp expires_at
    timestamp revoked_at
  }

  access_logs {
    text log_id PK
    text user_id
    text ip
    text method
    text url
    int status_code
  }
```

## Auditoria e LGPD

```mermaid
flowchart LR
  subgraph Acesso
    HOOK["Hook onResponse"]
    HOOK --> TBL["access_logs (PostgreSQL)"]
    HOOK --> FILE["log/access-*.log"]
  end

  subgraph Titular
    GET_PD["GET /sessions/me/personal-data"]
    DEL["DELETE /users/me"]
    GET_PD --> CSV["export-personal-data.ts → CSV"]
    DEL --> TX["Transação: remove códigos, sessões, logs e usuário"]
    DEL --> AUDIT["erasureAudit() no arquivo de log"]
  end
```

## Variáveis de ambiente

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Conexão PostgreSQL |
| `APP_PUBLIC_URL` | Links em e-mails (reset, etc.) |
| `APP_PORT` / `APP_HOST` | Bind do servidor |
| `ENCRYPTION_KEY` | Chave hex para AES (nome do usuário) |
| `AUTHENTICATION_JWT_SECRET` | Assinatura do access token |
| `AUTHENTICATION_COOKIE_SECRET` | Cookies assinados |
| `RESEND_API_KEY` | API de e-mail |
| `ACCESS_LOG_DIR` | Diretório dos logs de acesso (opcional, padrão `log`) |

## Implantação local

```mermaid
flowchart LR
  DEV["pnpm dev\n(tsx watch server.ts)"]
  COMPOSE["docker-compose.yml\nPostgreSQL :5432"]
  MIGRATE["pnpm db:migrate / db:push"]
  DEV --> API_PROC["API :APP_PORT"]
  COMPOSE --> PG_LOCAL[("PostgreSQL")]
  MIGRATE --> PG_LOCAL
  API_PROC --> PG_LOCAL
```

1. Subir o banco: `docker compose up -d` (pasta `server/`).
2. Configurar `.env` conforme `environment-variables.ts`.
3. Aplicar migrações: `pnpm db:migrate`.
4. Desenvolvimento: `pnpm dev` — produção: `pnpm build` + `pnpm start`.

## Estrutura de diretórios

```
server/
├── src/
│   ├── config.ts
│   ├── environment-variables.ts
│   ├── infra/
│   │   ├── database/
│   │   │   ├── index.ts          # Cliente Drizzle
│   │   │   ├── schema.ts         # Tabelas e tipos
│   │   │   └── repositories.ts
│   │   └── http/
│   │       ├── app.ts            # Composição Fastify
│   │       ├── server.ts         # Entry point
│   │       ├── plugins/
│   │       │   └── logger.ts
│   │       └── routes/v1/
│   │           ├── auth/
│   │           ├── sessions/
│   │           └── users/
│   ├── lib/
│   │   ├── nanoid.ts
│   │   └── resend.ts
│   └── utils/
│       ├── crypto.ts
│       └── export-personal-data.ts
├── docker-compose.yml
├── drizzle.config.*              # Migrações Drizzle Kit
├── tsup.config.ts
└── dist/                         # Bundle de produção
```

---

*Documento gerado com base na estrutura e no código do repositório `seguranca-api`.*
