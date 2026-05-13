import Link from 'next/link'
import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description:
    'Informações sobre o tratamento de dados pessoais neste sistema, em conformidade com a LGPD (Lei nº 13.709/2018).',
}

export default function PoliticaDePrivacidadePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10 pb-16">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Política de Privacidade</h1>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Voltar ao login</Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-8">
          Última atualização: maio de 2026. Este documento descreve como dados pessoais são tratados nesta aplicação, em
          observância à Lei Geral de Proteção de Dados Pessoais (LGPD — Lei nº 13.709/2018).
        </p>

        <div className="space-y-10 text-sm leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">1. Controlador e contato</h2>
            <p className="text-muted-foreground">
              O controlador dos dados pessoais tratados por meio deste sistema é a organização responsável pela sua
              operação e manutenção. Para exercer seus direitos previstos na LGPD ou esclarecer dúvidas sobre esta
              política, utilize o canal de contato institucional disponibilizado pela organização (e-mail ou formulário
              oficial). Quando houver Encarregado de Proteção de Dados (DPO), o contato do DPO será o preferencial para
              questões relacionadas a privacidade.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">2. Quais dados coletamos e por quê</h2>
            <p className="text-muted-foreground">
              Os dados abaixo correspondem às informações persistidas conforme o modelo de dados da aplicação (tabelas de
              usuários, códigos de acesso, sessões e registros de acesso). A finalidade é sempre relacionada à
              prestação do serviço, segurança da informação, autenticação e cumprimento de obrigações legais, quando
              aplicável.
            </p>

            <div className="rounded-lg border border-border bg-card p-4 space-y-4">
              <div>
                <h3 className="font-medium text-foreground mb-1">Conta de usuário (cadastro e perfil)</h3>
                <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                  <li>
                    <strong className="text-foreground">Identificador do usuário:</strong> valor técnico exclusivo para
                    vincular sua conta aos demais registros do sistema.
                  </li>
                  <li>
                    <strong className="text-foreground">E-mail:</strong> identificação do titular na conta, envio de
                    códigos de verificação em duas etapas (quando habilitado), recuperação de senha e comunicações
                    necessárias à operação do serviço.
                  </li>
                  <li>
                    <strong className="text-foreground">Nome:</strong> identificação civil ou social associada à conta.
                    No armazenamento, o nome é tratado com camada de criptografia no banco de dados, reduzindo riscos em
                    caso de acesso não autorizado ao volume de dados.
                  </li>
                  <li>
                    <strong className="text-foreground">Senha:</strong> armazenada somente de forma irreversível (hash),
                    para autenticação. A senha em texto claro não é guardada.
                  </li>
                  <li>
                    <strong className="text-foreground">Tentativas de login sem sucesso e bloqueio temporário:</strong>{' '}
                    contadores e prazos usados para mitigar ataques de força bruta e proteger contas.
                  </li>
                  <li>
                    <strong className="text-foreground">Preferência de segundo fator por e-mail:</strong> indica se o
                    envio de código por e-mail a cada login está ativo, conforme a experiência de segurança oferecida.
                  </li>
                  <li>
                    <strong className="text-foreground">Data e hora do consentimento:</strong> registro de que o titular
                    manifestou concordância com o tratamento no cadastro, quando aplicável.
                  </li>
                  <li>
                    <strong className="text-foreground">Datas de criação e atualização do cadastro:</strong> controle
                    operacional, auditoria interna e integridade dos registros.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Códigos de acesso (redefinição de senha e segundo fator)</h3>
                <p className="text-muted-foreground">
                  São gerados e armazenados tokens associados à sua conta para fluxos como redefinição de senha e
                  confirmação de login em duas etapas. Esses valores são tratados com proteção no armazenamento e têm
                  natureza transitória: após uso ou substituição por novo código, deixam de ser necessários para a
                  finalidade imediata. Registros podem permanecer enquanto forem pertinentes à segurança e ao histórico
                  operacional, observada a minimização de dados.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Sessões autenticadas</h3>
                <p className="text-muted-foreground">
                  Para manter você conectado de forma segura, o sistema armazena identificador de sessão, referência ao
                  usuário, hash do token de atualização (refresh), instantes de emissão e último uso, data de expiração e
                  eventual revogação. A finalidade é exclusivamente permitir e controlar o acesso autenticado à
                  aplicação, com expiração programada.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-foreground mb-1">Registros de acesso (logs)</h3>
                <p className="text-muted-foreground">
                  Em conformidade com o art. 15 da LGPD, podem ser mantidos registros de operações de tratamento,
                  incluindo identificação de quem acessou, quando possível, bem como endereço IP de origem, método HTTP,
                  caminho da requisição, código de status da resposta e momento do evento. A finalidade é segurança,
                  prevenção a incidentes, suporte técnico e demonstração de conformidade.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">3. Bases legais</h2>
            <p className="text-muted-foreground">
              O tratamento fundamenta-se, conforme o caso, no consentimento do titular (por exemplo, manifestação no
              cadastro quando exigida), na execução de procedimentos a seu pedido ou na gestão da relação com o titular
              no uso do sistema, no legítimo interesse para segurança e prevenção a fraudes (como bloqueio por tentativas
              falhas e logs técnicos), e no cumprimento de obrigação legal ou regulatória, inclusive quanto a registros
              de acesso previstos em lei.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">4. Compartilhamento e transferência</h2>
            <p className="text-muted-foreground">
              Os dados tratados neste sistema destinam-se à operação da própria aplicação e infraestrutura que a
              sustenta (por exemplo, provedor de hospedagem ou banco de dados contratado). Não vendemos dados pessoais.
              Eventuais suboperadores (processadores) atuam sob instruções do controlador e medidas contratuais de
              confidencialidade e segurança. Transferências internacionais, se ocorrerem, serão informadas e amparadas
              pelos instrumentos legais aplicáveis.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">5. Prazo de armazenamento</h2>
            <p className="text-muted-foreground">
              Os dados pessoais são mantidos pelo tempo necessário para cumprir as finalidades descritas nesta política,
              enquanto a conta estiver ativa e o serviço existir, ou enquanto houver base legal e interesse legítimo
              compatível com a expectativa do titular. Após solicitação de exclusão da conta ou revogação de
              consentimento, quando esse for a única base para determinado tratamento, os dados serão eliminados ou
              anonimizados, ressalvadas as hipóteses de guarda obrigatória por lei, resolução de litígios ou exercício
              regular de direitos.
            </p>
            <p className="text-muted-foreground">
              Registros técnicos (como logs de acesso e metadados de sessão) podem ser conservados por prazo adicional
              estritamente necessário à segurança e às exigências legais, após o que serão apagados ou anonimizados de
              forma proporcional.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">6. Direitos do titular</h2>
            <p className="text-muted-foreground">
              Nos termos da LGPD, você pode solicitar confirmação da existência de tratamento, acesso, correção de dados
              incompletos ou inexatos, anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em
              desconformidade, portabilidade (quando aplicável), informação sobre compartilhamentos, informação sobre a
              possibilidade de não fornecer consentimento e as consequências, e revogação do consentimento. Também é
              possível opor-se a tratamentos baseados em legítimo interesse e peticionar à Autoridade Nacional de
              Proteção de Dados (ANPD).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">7. Segurança</h2>
            <p className="text-muted-foreground">
              Adotamos medidas técnicas e administrativas aptas a proteger dados pessoais contra acessos não
              autorizados e situações acidentais ou ilícitas, incluindo uso de hash para senhas, criptografia para
              determinados campos sensíveis no banco, controle de sessão e monitoração por registros de acesso. Nenhuma
              medida é absoluta; em caso de incidente com risco relevante, comunicações serão feitas conforme a
              legislação.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-foreground">8. Alterações desta política</h2>
            <p className="text-muted-foreground">
              Esta política pode ser atualizada para refletir mudanças na aplicação, na legislação ou nas práticas de
              privacidade. Recomendamos revisitar esta página periodicamente. Alterações relevantes podem ser comunicadas
              por meio razoável (por exemplo, aviso no sistema ou por e-mail).
            </p>
          </section>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          <Link href="/register" className="text-primary hover:underline">
            Criar conta
          </Link>
          {' · '}
          <Link href="/" className="text-primary hover:underline">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}
