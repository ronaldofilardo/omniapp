"use client";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Política de Privacidade
        </h1>

        <div className="prose prose-gray max-w-none">
          <p className="text-lg text-gray-700 mb-6">
            Esta é uma política de privacidade simulada para fins de demonstração.
            Em uma aplicação real, esta página conteria os termos completos da política de privacidade.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            1. Coleta de Dados
          </h2>
          <p className="text-gray-700 mb-4">
            Coletamos informações pessoais como nome, e-mail, CPF e telefone quando você se registra em nossa plataforma.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            2. Uso dos Dados
          </h2>
          <p className="text-gray-700 mb-4">
            Utilizamos seus dados para fornecer nossos serviços de saúde, manter sua conta segura e melhorar nossa plataforma.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            3. Compartilhamento de Dados
          </h2>
          <p className="text-gray-700 mb-4">
            Não compartilhamos seus dados pessoais com terceiros sem seu consentimento, exceto quando exigido por lei.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            4. Segurança
          </h2>
          <p className="text-gray-700 mb-4">
            Implementamos medidas de segurança para proteger suas informações pessoais contra acesso não autorizado.
          </p>

          <h2 className="text-2xl font-semibold text-gray-900 mt-8 mb-4">
            5. Seus Direitos
          </h2>
          <p className="text-gray-700 mb-4">
            Você tem o direito de acessar, corrigir ou excluir seus dados pessoais a qualquer momento.
          </p>

          <p className="text-gray-700 mt-8">
            Para dúvidas sobre esta política, entre em contato conosco através do suporte.
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