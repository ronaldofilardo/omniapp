'use client';

import * as React from 'react';
import { captureError } from '@/lib/monitoring';

/**
 * Global Error Boundary para Next.js 13+ App Router
 * 
 * Este componente captura erros não tratados que ocorrem no root layout
 * e em toda a aplicação, incluindo erros durante o Server-Side Rendering.
 * 
 * Referência: https://nextjs.org/docs/app/building-your-application/routing/error-handling
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log do erro para serviço de monitoramento
    console.error('GlobalError capturou:', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    // Enviar erro para serviço de monitoramento
    captureError(error, {
      errorBoundary: 'global',
      digest: error.digest,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <html lang="pt-BR">
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 p-8 text-white">
              <div className="flex items-center gap-4">
                <svg
                  className="h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h1 className="text-3xl font-bold">Erro Crítico</h1>
                  <p className="text-red-100 text-sm mt-1">
                    Algo inesperado aconteceu
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8">
              <p className="text-gray-700 text-lg mb-6">
                Desculpe, ocorreu um erro crítico na aplicação. Nossa equipe foi
                notificada e está trabalhando para resolver o problema.
              </p>

              {process.env.NODE_ENV === 'development' && (
                <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <details className="cursor-pointer">
                    <summary className="font-semibold text-gray-900 mb-2">
                      🔍 Detalhes do erro (somente em desenvolvimento)
                    </summary>
                    <div className="mt-3 space-y-2">
                      <div>
                        <span className="text-xs font-medium text-gray-500 uppercase">
                          Mensagem:
                        </span>
                        <p className="text-sm text-red-600 font-mono mt-1">
                          {error.message}
                        </p>
                      </div>
                      {error.digest && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            Error Digest:
                          </span>
                          <p className="text-sm text-gray-700 font-mono mt-1">
                            {error.digest}
                          </p>
                        </div>
                      )}
                      {error.stack && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            Stack Trace:
                          </span>
                          <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded mt-1 overflow-auto max-h-48">
                            {error.stack}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={reset}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg hover:from-red-700 hover:to-orange-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  🔄 Tentar novamente
                </button>
                <button
                  onClick={() => (window.location.href = '/')}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 font-semibold"
                >
                  🏠 Voltar ao início
                </button>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-3">
                  <svg
                    className="h-5 w-5 text-blue-600 shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">O que fazer?</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li>Tente recarregar a página</li>
                      <li>Verifique sua conexão com a internet</li>
                      <li>Se o problema persistir, entre em contato com o suporte</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
