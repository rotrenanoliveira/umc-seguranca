Escopo da Atividade
 - O sistema deverá obrigatoriamente:
 - Implementar autenticação de dois fatores (2FA);
 - Armazenar credenciais com hash criptográfico e salt;
 - Garantir criptografia de dados em trânsito e em repouso;
 - Implementar recuperação de senha com token temporário e expiração;
 - Atender aos princípios e direitos do titular previstos na LGPD;
 - Hash criptográfico adequado e parametrizado
 - Uso correto de salt criptográfico
 - Autenticação de dois fatores (2FA) funcional
 - Política de sessão, tentativas e bloqueio

Definições Técnicas
  - nodejs
  - typescript
  - fastify
  - database postgresql
  - drizzle orm
  - entidades mínimas (usuário, codigos_acesso, sessoes)
