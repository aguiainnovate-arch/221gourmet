export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">Politica de Privacidade</h1>
          <p className="text-sm text-gray-600">Ultima atualizacao: 28/04/2026</p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">1. Sobre esta politica</h2>
          <p>
            Esta Politica de Privacidade descreve como o aplicativo Noctis coleta, utiliza,
            armazena e protege dados pessoais de usuarios e clientes para operacao do servico
            de pedidos e entregas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">2. Dados coletados</h2>
          <p>Podemos coletar os seguintes dados, conforme uso do aplicativo:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dados de identificacao, como nome, telefone e e-mail.</li>
            <li>Dados de endereco para realizacao de entregas.</li>
            <li>Dados tecnicos de uso, como dispositivo, IP e eventos de acesso.</li>
            <li>Dados de pagamento processados por provedores parceiros.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">3. Finalidade do uso dos dados</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Processar pedidos e entregas.</li>
            <li>Permitir autenticacao e seguranca de conta.</li>
            <li>Realizar suporte, comunicacoes e notificacoes transacionais.</li>
            <li>Melhorar desempenho, estabilidade e experiencia no app.</li>
            <li>Cumprir obrigacoes legais e regulatorias.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">4. Compartilhamento de dados</h2>
          <p>
            Seus dados podem ser compartilhados com prestadores essenciais para o funcionamento
            do servico, como infraestrutura em nuvem, autenticacao, analytics e pagamentos,
            sempre conforme necessidade operacional e obrigacoes legais.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">5. Retencao e seguranca</h2>
          <p>
            Adotamos medidas tecnicas e organizacionais para proteger os dados pessoais contra
            acesso nao autorizado, perda, alteracao ou divulgacao indevida. Os dados sao
            armazenados apenas pelo periodo necessario para as finalidades descritas nesta politica.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">6. Direitos do titular</h2>
          <p>Voce pode solicitar, quando aplicavel:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Confirmacao de tratamento e acesso aos dados.</li>
            <li>Correcao de dados incompletos, inexatos ou desatualizados.</li>
            <li>Anonimizacao, bloqueio ou eliminacao de dados desnecessarios.</li>
            <li>Portabilidade dos dados, nos termos da legislacao aplicavel.</li>
            <li>Revogacao de consentimento, quando esta for a base legal.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">7. Criancas e adolescentes</h2>
          <p>
            O aplicativo nao e direcionado a menores de 13 anos. Se identificado tratamento
            indevido de dados dessa faixa etaria, medidas de remocao e adequacao serao adotadas.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">8. Alteracoes desta politica</h2>
          <p>
            Esta politica pode ser atualizada periodicamente. Recomendamos revisao regular desta
            pagina para acompanhar eventuais alteracoes.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">9. Contato</h2>
          <p>
            Para solicitacoes sobre privacidade e protecao de dados, entre em contato pelo e-mail:
            <a className="ml-1 text-blue-600 underline" href="mailto:privacidade@noctis.app">
              privacidade@noctis.app
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
