# Changelog

Registro das mudanças em **`app/web`** e **`server`**. O detalhe de autenticação, logs e criptografia continua em `1-autenticacao.md`, `2-logs.md` e `3-criptografia.md`.

---

## Por pull request

Ordem do mais recente para o mais antigo. O título da PR reproduz o sufixo do merge no Git.

| PR | Branch / título no merge | Data do merge |
|----|--------------------------|---------------|
| #13 | `fix/user-mail-case-sensitive` | **2026-05-14** |
| #12 | `/docs` | **2026-05-14** |
| #11 | `feat/delete-user` | **2026-05-13** |
| #10 | `feat/privacy-policies` | **2026-05-13** |
| #9 | `fix/password-reset` | **2026-05-13** |
| #8 | `feat/dashboard` | **2026-05-13** |
| #7 | `feat/user-data` | **2026-05-12** |
| #6 | `fix/package-json` | **2026-05-12** |
| #5 | `feat/log` | **2026-05-12** |
| #4 | `refact/remove-access-token-card` | **2026-05-06** |
| #3 | Entrega 4 | **2026-04-29** |
| #2 | `refact/sessions` | **2026-04-15** |
| #1 | `refact/authenticate` | **2026-04-15** |

### PR #13 — `fix/user-mail-case-sensitive` — 2026-05-14

- **Normalização do e-mail** para minúsculas antes do envio à API no **cadastro** e na etapa de **código 2FA** do login, evitando divergência quando o usuário digita o endereço com maiúsculas diferentes das salvas no servidor.

### PR #12 — `/docs` — 2026-05-14

- **Documentação** no repositório: textos em `docs/` (autenticação, logs, criptografia), changelog e índice `docs/README.md`; ajustes correlatos no README principal.

### PR #11 — `feat/delete-user` — 2026-05-13

- Fluxo para o usuário solicitar **exclusão da conta e dos dados** associados.

### PR #10 — `feat/privacy-policies` — 2026-05-13

- Texto de **política de privacidade** disponível na aplicação.

### PR #9 — `fix/password-reset` — 2026-05-13

- Correção do fluxo de **reset de senha** (API/UI).
- Remoção de **`console.log`** residuais (chore no mesmo período).

### PR #8 — `feat/dashboard` — 2026-05-13

- **Cartão** com dados do usuário e botão para **solicitar todos os dados** salvos (exportação).

### PR #7 — `feat/user-data` — 2026-05-12

- Suporte a **exportação dos dados** do usuário.

### PR #6 — `fix/package-json` — 2026-05-12

- Ajuste da **versão do gerenciador de pacotes** no `package.json`.

### PR #5 — `feat/log` — 2026-05-12

- **Logger** estruturado no servidor.

### PR #4 — `refact/remove-access-token-card` — 2026-05-06

- Remoção do cartão de **access token** na interface (alinhado a tokens em cookie/httpOnly).

### PR #3 — Entrega 4 — 2026-04-29

- **Criptografia** de dados sensíveis em repouso (ex.: nome de usuário e token). Ver `3-criptografia.md`.

### PR #2 — `refact/sessions` — 2026-04-15

- Refatoração de **sessões** e rotas organizadas **por pasta**.

### PR #1 — `refact/authenticate` — 2026-04-15

- Refatoração do fluxo de **código de acesso** (2FA) e ajuste de **caminhos de rotas**.

---

## Outras alterações (sem merge `Merge PR #` no histórico)

Entradas com **data do commit**; úteis para ver o que entrou fora das PRs listadas acima.

### 2026-05-05

- Documentação: arquivo **TODO** para acompanhamento de tarefas.

### 2026-04-22

- Documentação: README na raiz, comentários e link do projeto; README da **entrega 3**.
- **Correção** de erro no fetch (integração).
- Link para **documentação da API**; botões com **Radix**.

### 2026-04-16

- **App web** Next.js; **reset de senha** (primeira versão do fluxo).
- **Build**: `setup build`, comando alinhado a `pre:start`, **postinstall**.
- **`.gitignore`**.

### 2026-04-13

- **Bootstrap**: setup do projeto, config da aplicação, **Resend**, estrutura do banco (**Drizzle**), rotas de usuário e autenticação, rota de **perfil** do usuário logado, **servidor HTTP** (Fastify), primeiro ajuste de **caminhos de rotas**.

---

## Legenda de prefixos em commits

| Prefixo | Uso comum |
|---------|-----------|
| `feat:` | nova funcionalidade ou integração |
| `fix:` | correção de bug ou comportamento |
| `refact:` | mudança interna sem alterar o comportamento pretendido |
| `chore:` / `build:` | ferramentas, scripts, dependências |
| `docs:` | documentação |
