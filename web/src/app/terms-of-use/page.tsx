"use client";

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Termos de Uso
        </h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            Estes são termos de uso simulados para fins de demonstração.
            Em uma aplicação real, esta página conteria os termos completos de uso da plataforma.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            1. Aceitação dos Termos
          </h2>
          <p className="text-gray-700 mb-4">
            Ao acessar e usar nossa plataforma, você concorda em cumprir estes termos de uso.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            2. Uso da Plataforma
          </h2>
          <p className="text-gray-700 mb-4">
            Nossa plataforma é destinada ao compartilhamento seguro de laudos médicos entre profissionais de saúde e pacientes.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            3. Responsabilidades do Usuário
          </h2>
          <p className="text-gray-700 mb-4">
            Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades realizadas em sua conta.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            4. Privacidade e Dados
          </h2>
          <p className="text-gray-700 mb-4">
            O tratamento de dados pessoais é regido por nossa Política de Privacidade, que faz parte integrante destes termos.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            5. Limitação de Responsabilidade
          </h2>
          <p className="text-gray-700 mb-4">
            A plataforma é fornecida "como está" e não garantimos que estará sempre disponível ou livre de erros.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            6. Modificações
          </h2>
          <p className="text-gray-700 mb-4">
            Reservamo-nos o direito de modificar estes termos a qualquer momento, com aviso prévio aos usuários.
          </p>

          <p className="text-gray-700 mt-8">
            Estes termos entram em vigor a partir da data de seu aceite. Para dúvidas, entre em contato com nosso suporte.
          </p>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => window.close()}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}