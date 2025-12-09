/**
 * Componentes de Loading reutilizáveis
 * Para uso com Suspense boundaries e estados de carregamento
 */

import React from 'react';

/**
 * Spinner básico
 */
export function Spinner({ size = 'md', color = 'blue' }: { 
  size?: 'sm' | 'md' | 'lg' | 'xl'; 
  color?: 'blue' | 'gray' | 'white';
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  const colorClasses = {
    blue: 'text-blue-600',
    gray: 'text-gray-600',
    white: 'text-white',
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Loading de página inteira
 */
export function PageLoading({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Spinner size="xl" />
        {message && (
          <p className="mt-4 text-gray-600 text-lg">{message}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Loading de card/seção
 */
export function CardLoading({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="text-center">
        <Spinner size="lg" />
        {message && (
          <p className="mt-3 text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton para listas
 */
export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-200 h-16 rounded-lg"
        />
      ))}
    </div>
  );
}

/**
 * Skeleton para tabelas
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid gap-4 animate-pulse" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-10 bg-gray-300 rounded" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={rowIdx}
          className="grid gap-4 animate-pulse"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div key={colIdx} className="h-8 bg-gray-200 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton para cards de dashboard
 */
export function DashboardCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="h-8 bg-gray-300 rounded w-1/2 mb-2" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
    </div>
  );
}

/**
 * Loading de formulário
 */
export function FormLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-200 rounded" />
      <div className="h-24 bg-gray-200 rounded" />
      <div className="h-10 bg-gray-300 rounded w-32" />
    </div>
  );
}

/**
 * Loading inline (para botões, etc)
 */
export function InlineLoading({ message }: { message?: string }) {
  return (
    <div className="inline-flex items-center gap-2">
      <Spinner size="sm" />
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}

/**
 * Loading overlay (para operações em background)
 */
export function LoadingOverlay({ message, show }: { message?: string; show: boolean }) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-sm w-full mx-4 text-center">
        <Spinner size="xl" />
        {message && (
          <p className="mt-4 text-gray-700 text-lg font-medium">{message}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Loading de progresso
 */
export function ProgressLoading({ 
  progress, 
  message 
}: { 
  progress: number; 
  message?: string;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {message || 'Carregando...'}
        </span>
        <span className="text-sm font-medium text-gray-700">
          {Math.round(progress)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Loading de texto pulsante
 */
export function PulsingText({ text = 'Carregando' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span className="animate-pulse">{text}</span>
      <span className="flex gap-1">
        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
      </span>
    </div>
  );
}
