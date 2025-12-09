/**
 * Configuração centralizada da aplicação
 * 
 * Este arquivo consolida TODAS as configurações em um único local para:
 * - Evitar duplicação e inconsistências
 * - Facilitar manutenção e updates
 * - Manter padrões consistentes em toda aplicação
 * 
 * IMPORTANTE: Sempre importar configurações deste arquivo,
 * nunca criar valores hardcoded em outros lugares.
 */

import { FILE_SIZE_LIMITS, ALLOWED_MIME_TYPES } from '../constants/fileLimits';

/**
 * Configurações de Upload e Storage
 */
export const UPLOAD_CONFIG = {
  /** Tamanho máximo para uploads (2MB para imagens e PDFs) */
  MAX_FILE_SIZE: FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE,
  
  /** Tipos MIME permitidos para upload */
  ALLOWED_MIME_TYPES: [...ALLOWED_MIME_TYPES],
  
  /** Timeout para operações de upload (30 segundos) */
  UPLOAD_TIMEOUT: 30000,
  
  /** Suporte a arquivos grandes (desabilitado para manter 2MB) */
  ALLOW_LARGE_FILES: false,
} as const;

/**
 * Configurações de Autenticação
 */
export const AUTH_CONFIG = {
  /** Timeout para operações de autenticação (10 segundos) */
  AUTH_TIMEOUT: 10000,
  
  /** Tempo de expiração da sessão (7 dias em segundos) */
  SESSION_EXPIRY: 7 * 24 * 60 * 60,
  
  /** Número máximo de tentativas de login */
  MAX_LOGIN_ATTEMPTS: 5,
  
  /** Tempo de bloqueio após tentativas excedidas (15 minutos) */
  LOCKOUT_DURATION: 15 * 60 * 1000,
} as const;

/**
 * Configurações de API
 */
export const API_CONFIG = {
  /** Timeout padrão para requisições API (30 segundos) */
  DEFAULT_TIMEOUT: 30000,
  
  /** Número de tentativas de retry */
  RETRY_ATTEMPTS: 3,
  
  /** Delay entre retries (em ms) */
  RETRY_DELAY: 1000,
  
  /** Rate limit - requisições por minuto */
  RATE_LIMIT: 60,
} as const;

/**
 * Configurações de Notificações
 */
export const NOTIFICATION_CONFIG = {
  /** Tempo de exibição de toast (5 segundos) */
  TOAST_DURATION: 5000,
  
  /** Máximo de notificações simultâneas */
  MAX_NOTIFICATIONS: 5,
  
  /** Auto-refresh de notificações (30 segundos) */
  REFRESH_INTERVAL: 30000,
  
  /** Habilitar som de notificação */
  ENABLE_SOUND: false,
} as const;

/**
 * Configurações de Paginação
 */
export const PAGINATION_CONFIG = {
  /** Itens por página padrão */
  DEFAULT_PAGE_SIZE: 10,
  
  /** Opções de itens por página */
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  
  /** Máximo de itens por página */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Configurações de Cache
 */
export const CACHE_CONFIG = {
  /** Tempo de cache padrão (5 minutos) */
  DEFAULT_TTL: 5 * 60 * 1000,
  
  /** Tempo de cache para dados estáticos (1 hora) */
  STATIC_TTL: 60 * 60 * 1000,
  
  /** Tempo de cache para dados dinâmicos (1 minuto) */
  DYNAMIC_TTL: 60 * 1000,
} as const;

/**
 * Configurações de Validação
 */
export const VALIDATION_CONFIG = {
  /** Tamanho mínimo de senha */
  MIN_PASSWORD_LENGTH: 8,
  
  /** Tamanho máximo de senha */
  MAX_PASSWORD_LENGTH: 128,
  
  /** Tamanho mínimo de nome */
  MIN_NAME_LENGTH: 2,
  
  /** Tamanho máximo de nome */
  MAX_NAME_LENGTH: 100,
  
  /** Tamanho máximo de descrição */
  MAX_DESCRIPTION_LENGTH: 1000,
  
  /** Regex para validação de email */
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  
  /** Regex para validação de telefone brasileiro */
  PHONE_REGEX: /^\(?[1-9]{2}\)?\s?9?\d{4}-?\d{4}$/,
  
  /** Regex para validação de CPF */
  CPF_REGEX: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  
  /** Regex para validação de CNPJ */
  CNPJ_REGEX: /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/,
} as const;

/**
 * Configurações de UI/UX
 */
export const UI_CONFIG = {
  /** Delay para debounce em buscas (300ms) */
  SEARCH_DEBOUNCE: 300,
  
  /** Duração de animações (200ms) */
  ANIMATION_DURATION: 200,
  
  /** Delay para tooltips (500ms) */
  TOOLTIP_DELAY: 500,
  
  /** Largura máxima do container (1280px) */
  MAX_CONTENT_WIDTH: 1280,
} as const;

/**
 * Configurações de Storage Provider
 */
export const STORAGE_PROVIDER_CONFIG = {
  /** Provider para desenvolvimento */
  DEVELOPMENT_PROVIDER: 'local' as const,
  
  /** Provider para produção */
  PRODUCTION_PROVIDER: 'cloudinary' as const,
  
  /** Provider para testes */
  TEST_PROVIDER: 'local' as const,
  
  /** Timeout para operações de storage */
  STORAGE_TIMEOUT: 30000,
} as const;

/**
 * Configurações de Ambiente
 */
export const ENV_CONFIG = {
  /** Verifica se está em produção */
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  
  /** Verifica se está em desenvolvimento */
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  /** Verifica se está em teste */
  IS_TEST: process.env.NODE_ENV === 'test',
  
  /** Verifica se está no cliente */
  IS_CLIENT: typeof window !== 'undefined',
  
  /** Verifica se está no servidor */
  IS_SERVER: typeof window === 'undefined',
} as const;

/**
 * Configurações de Logs
 */
export const LOG_CONFIG = {
  /** Habilitar logs detalhados em desenvolvimento */
  VERBOSE_LOGS: ENV_CONFIG.IS_DEVELOPMENT,
  
  /** Habilitar logs de performance */
  PERFORMANCE_LOGS: ENV_CONFIG.IS_DEVELOPMENT,
  
  /** Habilitar logs de erros */
  ERROR_LOGS: true,
  
  /** Habilitar logs de API */
  API_LOGS: ENV_CONFIG.IS_DEVELOPMENT,
} as const;

/**
 * Export consolidado de todas as configurações
 */
export const APP_CONFIG = {
  upload: UPLOAD_CONFIG,
  auth: AUTH_CONFIG,
  api: API_CONFIG,
  notification: NOTIFICATION_CONFIG,
  pagination: PAGINATION_CONFIG,
  cache: CACHE_CONFIG,
  validation: VALIDATION_CONFIG,
  ui: UI_CONFIG,
  storage: STORAGE_PROVIDER_CONFIG,
  env: ENV_CONFIG,
  log: LOG_CONFIG,
} as const;

export default APP_CONFIG;
