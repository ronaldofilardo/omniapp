import * as React from 'react'
import { Loader2, AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { Button } from './button'
import { cn } from './utils'

// ============================================================================
// SKELETON LOADERS
// ============================================================================

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div data-testid="skeleton-card" className={cn("animate-pulse space-y-3 p-4 rounded-lg bg-white border border-gray-200", className)}>
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 6, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div data-testid="skeleton-table" className={cn("animate-pulse space-y-2", className)}>
      {/* Header */}
      <div className="flex gap-4 p-3 bg-gray-100 rounded">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={`header-${i}`} className="h-4 bg-gray-300 rounded flex-1"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 p-3 bg-white border border-gray-200 rounded">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={`cell-${rowIndex}-${colIndex}`} className="h-3 bg-gray-200 rounded flex-1"></div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonMetricsCard({ className }: { className?: string }) {
  return (
    <div data-testid="skeleton-metrics" className={cn("animate-pulse space-y-2 p-4 rounded-lg bg-white border border-gray-200", className)}>
      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      <div className="h-8 bg-gray-300 rounded w-1/3"></div>
    </div>
  )
}

export function SkeletonList({ items = 3, className }: { items?: number; className?: string }) {
  return (
    <div data-testid="skeleton-list" className={cn("animate-pulse space-y-3", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={`item-${i}`} className="flex gap-3 items-center p-3 bg-white border border-gray-200 rounded">
          <div className="h-10 w-10 bg-gray-200 rounded-full shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

function SkeletonLoader({ className }: { className?: string }) {
  return (
    <div data-testid="skeleton-loader" className={cn("animate-pulse bg-muted rounded", className)}>
      <div className="h-4 bg-muted-foreground/20 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-muted-foreground/20 rounded w-1/2"></div>
    </div>
  )
}

function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("animate-spin", className)} />
}

export function LoadingState({ type = 'default', className }: { type?: 'skeleton' | 'spinner' | 'default'; className?: string }) {
  switch (type) {
    case 'skeleton':
      return <SkeletonLoader className={className} />
    case 'spinner':
      return (
        <div data-testid="spinner-loader" className={cn("flex items-center justify-center p-4", className)}>
          <Spinner className="h-6 w-6" />
        </div>
      )
    default:
      return <div className={cn("p-4 animate-pulse", className)}>Carregando...</div>
  }
}

// ============================================================================
// PROGRESS BAR & STATUS INDICATORS
// ============================================================================

export function ProgressBar({
  progress,
  status = 'in-progress',
  label,
  showPercentage = true,
  className
}: {
  progress: number; // 0-100
  status?: 'in-progress' | 'success' | 'error';
  label?: string;
  showPercentage?: boolean;
  className?: string;
}) {
  const statusColors = {
    'in-progress': 'bg-blue-600',
    'success': 'bg-green-600',
    'error': 'bg-red-600'
  }

  const statusIcons = {
    'in-progress': <Upload className="h-4 w-4 animate-pulse" />,
    'success': <CheckCircle2 className="h-4 w-4" />,
    'error': <AlertCircle className="h-4 w-4" />
  }

  return (
    <div data-testid="progress-bar" className={cn("space-y-2", className)}>
      {label && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            {statusIcons[status]}
            <span>{label}</span>
          </div>
          {showPercentage && (
            <span className="text-gray-600 font-medium">{Math.round(progress)}%</span>
          )}
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-300 ease-out",
            statusColors[status]
          )}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

export function UploadProgressIndicator({
  fileName,
  progress,
  status,
  onCancel,
  className
}: {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'success' | 'error';
  onCancel?: () => void;
  className?: string;
}) {
  const statusMessages = {
    'uploading': 'Enviando arquivo...',
    'processing': 'Processando...',
    'success': 'Concluído!',
    'error': 'Erro no upload'
  }

  const progressStatus = status === 'error' ? 'error' : status === 'success' ? 'success' : 'in-progress'

  return (
    <div data-testid="upload-progress" className={cn("bg-white border border-gray-200 rounded-lg p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{fileName}</p>
          <p className="text-xs text-gray-500 mt-1">{statusMessages[status]}</p>
        </div>
        {onCancel && status === 'uploading' && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 text-sm ml-2"
            type="button"
          >
            Cancelar
          </button>
        )}
      </div>
      <ProgressBar
        progress={progress}
        status={progressStatus}
        showPercentage={true}
      />
    </div>
  )
}

// ============================================================================
// ERROR STATE
// ============================================================================

export function ErrorState({
  error,
  retry,
  userFriendly = true,
  className
}: {
  error: Error | string;
  retry?: () => void;
  userFriendly?: boolean;
  className?: string;
}) {
  const message = userFriendly
    ? getUserFriendlyMessage(error)
    : error.toString();

  return (
    <div data-testid="error-state" className={cn("flex flex-col items-center justify-center p-4 text-center", className)}>
      <AlertCircle className="h-8 w-8 text-destructive mb-2" />
      <p className="text-sm text-muted-foreground mb-4">{message}</p>
      {retry && (
        <Button onClick={retry} variant="outline" size="sm">
          Tentar Novamente
        </Button>
      )}
    </div>
  );
}

function getUserFriendlyMessage(error: Error | string): string {
  const errorStr = typeof error === 'string' ? error : error.message;
  const errorMap: Record<string, string> = {
    'Network error': 'Erro de conexão. Verifique sua internet.',
    'Unauthorized': 'Sessão expirada. Faça login novamente.',
    'Not found': 'Recurso não encontrado.',
    'Internal server error': 'Erro interno do servidor. Tente novamente mais tarde.',
    'Bad request': 'Dados inválidos. Verifique as informações.',
    'Forbidden': 'Acesso negado.',
    'Timeout': 'Tempo limite excedido. Tente novamente.',
  };

  // Verificar se a mensagem de erro contém alguma chave do mapa
  for (const [key, friendlyMessage] of Object.entries(errorMap)) {
    if (errorStr.toLowerCase().includes(key.toLowerCase())) {
      return friendlyMessage;
    }
  }

  // Se não encontrar mapeamento, retornar uma mensagem genérica
  return 'Ocorreu um erro inesperado. Tente novamente.';
}