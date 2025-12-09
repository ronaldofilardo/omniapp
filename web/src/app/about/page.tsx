import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sobre - Omni Saúde',
  description: 'Conheça mais sobre o Omni Saúde, o sistema completo de gestão para profissionais da saúde.',
}

// Página estática com SSG
export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F8FAFC] to-white">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#111827] mb-4">Sobre o Omni Saúde</h1>
          <p className="text-xl text-[#6B7280]">
            Tudo em suas mãos - Sistema completo de gestão para profissionais da saúde
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">Nossa Missão</h2>
            <p className="text-[#6B7280]">
              Facilitar o trabalho dos profissionais da saúde através de uma plataforma
              intuitiva e completa, permitindo que se concentrem no que realmente importa:
              cuidar dos pacientes.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-semibold text-[#111827] mb-4">Nossa Visão</h2>
            <p className="text-[#6B7280]">
              Ser a principal ferramenta de gestão para profissionais da saúde no Brasil,
              oferecendo soluções inovadoras e acessíveis para todos os portes de prática.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-2xl font-semibold text-[#111827] mb-6 text-center">
            Funcionalidades Principais
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-[#10B981] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">📅</span>
              </div>
              <h3 className="font-semibold mb-2">Agendamento</h3>
              <p className="text-sm text-[#6B7280]">
                Gerencie consultas, exames e procedimentos com facilidade
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#3B82F6] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">👥</span>
              </div>
              <h3 className="font-semibold mb-2">Profissionais</h3>
              <p className="text-sm text-[#6B7280]">
                Cadastre e gerencie informações de profissionais
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-[#F59E0B] rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold">📄</span>
              </div>
              <h3 className="font-semibold mb-2">Documentos</h3>
              <p className="text-sm text-[#6B7280]">
                Armazene e organize arquivos relacionados aos atendimentos
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}