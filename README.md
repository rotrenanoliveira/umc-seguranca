# Projeto de Conclusão da Disciplina - Segurança

Este projeto implementa uma aplicação web com foco em autenticação segura, controle de sessão e autentificação em dois fatores (2FA) por e-mail. A solução foi dividida em dois blocos principais:

- `app/web`: frontend em Next.js responsável pelas telas de cadastro, login em duas etapas e dashboard para teste dos endpoints.
- `server`: API em Fastify com PostgreSQL + Drizzle ORM, onde ficam a autenticação, as sessões, o bloqueio por tentativas falhas e a emissão/validação dos códigos de acesso.
- Link para testar o projeto: [WEB](https://umc-seguranca.vercel.app/)
- Link para ver a documentação da API do projeto: [API](https://umc-seguranca.onrender.com/)

## O que foi implementado

O projeto atende ao objetivo da disciplina ao concentrar os principais controles de segurança no fluxo de identidade:

- Cadastro de usuário com aceite de consentimento e armazenamento de senha com hash `bcrypt`;
- Login em duas etapas: senha + código de verificação enviado por e-mail;
- Criação de sessão autenticada somente apos validação do segundo fator;
- Uso combinado de `access token` de curta duração e `refresh token` em cookie `httpOnly`;
- Renovação de sessão via endpoint dedicado;
- Logout com revogação de sessão no servidor;
- Bloqueio temporário da conta apos múltiplas tentativas invalidas;
- Estrutura de dados separada para `users`, `access_code` e `sessions`;
- Recuperação de senha por e-mail com código de uso único na tabela `access_code` (tipo `PASSWORD_RESET`) e revogação de todas as sessões ativas após a troca de senha.


## Estrutura de segurança

### 1. Credenciais

As senhas não são armazenadas em texto puro. No cadastro, a API aplica hash com `bcrypt` antes de persistir o usuário. Isso reduz o impacto de exposição do banco de dados.

### 2. Autenticação em duas etapas

L login foi separado em dois momentos:

1. o usuário informa `email` e `senha`;
2. se a senha estiver correta, a API gera um código temporário de 6 caracteres;
3. esse código e enviado por e-mail;
4. somente apos informar o código corretamente a sessão e criada.

Na pratica, o segundo fator implementado no projeto e o canal de e-mail, funcionando como uma camada adicional de verificação além da senha.

### 3. Sessões

Depois do 2FA, o sistema cria uma sessão persistida no banco e entrega dois artefatos:

- `accessToken`: JWT de curta duração (15 minutos), usado pelo frontend no cabeçalho `Authorization`;
- `refreshToken`: JWT enviado em cookie `httpOnly`, usado para renovar a autenticação sem expor esse token ao JavaScript da pagina.

O banco armazena apenas o hash SHA-256 do `refreshToken`, não o valor bruto. Isso melhora a segurança em caso de acesso indevido aos dados.

### 4. Proteção contra abuso

O projeto também implementa:

- Limite de `3` tentativas invalidas antes de bloquear a conta;
- Bloqueio temporário por `15` minutos;
- Expiração do código de 2FA em `10` minutos;

## Modelo de dados

As entidades centrais para autenticação sao:

- `users`: dados do usuário, hash da senha, tentativas falhas, bloqueio temporário, flag de 2FA por e-mail e registro de consentimento;
- `access_code`: códigos temporários usados no segundo fator (`TWO_FACTOR_EMAIL`) e na recuperação de senha (`PASSWORD_RESET`);
- `sessions`: sessões emitidas, hash do refresh token, datas de emissão, expiração, ultimo uso e revogação.

## Fluxo das informações

## Cadastro

1. O usuário preenche nome, e-mail, senha e aceite dos termos no frontend.
2. O frontend envia `POST /users`.
3. A API valida os dados, verifica duplicidade de e-mail e gera o hash da senha com `bcrypt`.
4. O registro do usuário e salvo no banco.
5. O sistema retorna o identificador do usuário criado.

## Login com senha + 2FA

1. O usuário informa `email` e `senha` na tela inicial.
2. O frontend envia `POST /auth/authenticate-password`.
3. A API busca o usuário no banco.
4. Se a conta estiver bloqueada, o acesso e negado.
5. A senha recebida e comparada com o hash armazenado usando `bcrypt.compare`.
6. Se a senha estiver errada, a API incrementa as tentativas falhas e pode bloquear a conta.
7. Se a senha estiver correta, a API zera tentativas falhas e remove códigos anteriores do usuário.
8. A API gera um novo código de 6 caracteres para o segundo fator.
9. O código e salvo na tabela `access_code` com tipo `TWO_FACTOR_EMAIL`.
10. O código e enviado ao e-mail do usuário.
11. O frontend troca para a segunda etapa do login e solicita o código.

## Validação do código 2FA e abertura da sessão

1. O usuário informa o código recebido por e-mail.
2. O frontend envia `POST /auth/authenticate-access-code` com `email` e `code`.
3. A API localiza o usuário e o código correspondente.
4. A API valida formato, vinculação ao usuário e expiração do código.
5. Em caso de falha, as tentativas sao contabilizadas e a conta pode ser bloqueada após 3 tentativas.
6. Em caso de sucesso, a API cria um `sessionId`.
7. A API gera:
   - um `accessToken` JWT com expiração curta;
   - um `refreshToken` JWT com referencia da sessão.
8. O hash do `refreshToken` e salvo na tabela `sessions`.
9. O código 2FA usado e removido da tabela `access_code`.
10. O `refreshToken` e enviado em cookie `httpOnly`.
11. O `accessToken` e retornado no corpo da resposta.
12. O frontend salva o `accessToken` em memoria e libera o acesso ao dashboard.

## Uso da sessão autenticada

1. Para acessar rotas protegidas, o frontend envia o `accessToken` no header `Authorization: Bearer ...`.
2. A API valida o JWT e identifica o usuário autenticado.
3. Um exemplo desse fluxo e `GET /sessions/me`, que retorna o perfil do usuário logado.

## Renovação da autenticação

1. Quando necessário, o cliente pode chamar `POST /sessions/refresh`.
2. A API le o `refreshToken` a partir do cookie.
3. O token recebido e validado e comparado com o hash salvo no banco.
4. A sessão anterior e marcada como revogada.
5. Uma nova sessão e criada.
6. A API devolve novo `accessToken` e novo `refreshToken` em cookie.

Observação: no estado atual do código, o frontend ja envia cookies com `credentials: 'include'`, mas o fluxo automático de renovação ainda pode ser expandido para ocorrer de forma transparente na interface.

## Logout

1. O frontend chama `POST /logout` enviando o `accessToken`.
2. A API identifica a sessão atual pelo cookie de `refreshToken`.
3. A sessão e marcada como revogada no banco.
4. O frontend limpa o `accessToken` em memoria e retorna o usuário para a tela de login.

## Recuperação de senha

O fluxo é independente do 2FA de login: o usuário solicita um código por e-mail e, em seguida, define uma nova senha informando esse código. O tempo de validade do token de recuperação é configurado em `PASSWORD_RESET_TTL_MIN` (atualmente **60 minutos**), contados a partir da criação do registro em `access_code`.

### Solicitar o código (`POST /password/forgot`)

1. O cliente envia o corpo `{ "email": "..." }`.
2. Se não existir usuário com esse e-mail, a API responde com **400** e mensagem de usuário não encontrado.
3. Se o usuário existir, a API gera um token alfanumérico de **6 caracteres**, persiste em `access_code` com tipo `PASSWORD_RESET` e dispara o e-mail (Resend) com instruções e o código.
4. A resposta **200** traz uma mensagem confirmando o envio ou informando falha no provedor de e-mail, quando aplicável.

### Redefinir a senha (`POST /password/reset`)

1. O cliente envia `{ "code": "<token recebido>", "password": "<nova senha>" }`. A nova senha deve ter entre **8** e **128** caracteres.
2. A API localiza o registro em `access_code` pelo token. Se não existir, responde **401** com credenciais inválidas.
3. Se o token estiver fora do prazo definido por `PASSWORD_RESET_TTL_MIN`, responde **401** com token expirado.
4. Em caso de sucesso, a API:
   - atualiza o hash da senha do usuário com `bcrypt`;
   - zera tentativas falhas de login e remove bloqueio temporário (`lockedUntil`);
   - **revoga todas as sessões ativas** daquele usuário, forçando novo login em todos os dispositivos.

## Saúde da API

- `GET /health`: retorno simples `{ ok: true, ... }` para verificação de disponibilidade (útil em balanceadores e monitoramento).

## Endpoints principais

- `POST /users`: cadastro de usuário
- `POST /auth/authenticate-password`: primeira etapa do login
- `POST /auth/authenticate-access-code`: segunda etapa do login (2FA)
- `POST /password/forgot`: inicia recuperação de senha e envia código por e-mail
- `POST /password/reset`: redefine a senha com o código recebido e encerra sessões ativas
- `POST /sessions/refresh`: renova a autenticação
- `GET /sessions/me`: retorna dados do usuário autenticado
- `POST /logout`: revoga a sessão atual
- `GET /health`: verificação de saúde do serviço
- `GET /docs`: documentação da API
