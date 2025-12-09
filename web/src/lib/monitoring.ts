/**
 * Serviço de Monitoramento e Observabilidade
 *
 * Centraliza o envio de logs, métricas e erros para serviços de monitoramento
 * como Sentry, LogRocket, DataDog, etc.
 */

import { AppError } from './errors';

// Tipos de provedores de monitoramento suportados
export type MonitoringProvider = 'sentry' | 'logrocket' | 'datadog' | 'console';

// Configuração do monitoramento
interface MonitoringConfig {
  provider: MonitoringProvider;
  dsn?: string; // Para Sentry
  appId?: string; // Para LogRocket
  apiKey?: string; // Para DataDog
  environment: string;
  release?: string;
  enabled: boolean;
}

// Estado global do monitoramento
let monitoringConfig: MonitoringConfig = {
  provider: 'console',
  environment: process.env.NODE_ENV || 'development',
  enabled: process.env.NODE_ENV === 'production' || process.env.MONITORING_ENABLED === 'true'
};

// Tipos de eventos de monitoramento
export interface MonitoringEvent {
  level: 'error' | 'warning' | 'info' | 'debug';
  message: string;
  error?: Error | AppError;
  context?: Record<string, unknown>;
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

// Classe principal do serviço de monitoramento
export class MonitoringService {
  private static instance: MonitoringService;
  private initialized = false;

  private constructor() {}

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Configura o serviço de monitoramento
   */
  configure(config: Partial<MonitoringConfig>): void {
    monitoringConfig = { ...monitoringConfig, ...config };
    this.initializeProvider();
  }

  /**
   * Inicializa o provedor de monitoramento selecionado
   */
  private initializeProvider(): void {
    if (!monitoringConfig.enabled || this.initialized) return;

    try {
      switch (monitoringConfig.provider) {
        case 'sentry':
          this.initializeSentry();
          break;
        case 'logrocket':
          this.initializeLogRocket();
          break;
        case 'datadog':
          this.initializeDataDog();
          break;
        case 'console':
        default:
          // Console logging já está disponível
          break;
      }
      this.initialized = true;
      console.log(`[Monitoring] Inicializado com provedor: ${monitoringConfig.provider}`);
    } catch (error) {
      console.error('[Monitoring] Erro ao inicializar provedor:', error);
    }
  }

  private initializeSentry(): void {
    // Importação dinâmica para evitar problemas de build
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.init({
        dsn: monitoringConfig.dsn,
        environment: monitoringConfig.environment,
        release: monitoringConfig.release,
        // Configurações específicas do Sentry
        tracesSampleRate: 1.0,
        replaysOnErrorSampleRate: 1.0,
        replaysSessionSampleRate: 0.1,
        integrations: [
          new (Sentry as any).Replay({
            maskAllText: true,
            blockAllMedia: true,
          }),
        ],
      });
    }).catch((error) => {
      console.error('[Monitoring] Erro ao carregar Sentry:', error);
    });
  }

  private initializeLogRocket(): void {
    import('logrocket').then((LogRocket) => {
      if (monitoringConfig.appId) {
        LogRocket.init(monitoringConfig.appId);
        console.log('[Monitoring] LogRocket inicializado');
      }
    }).catch((error) => {
      console.error('[Monitoring] Erro ao carregar LogRocket:', error);
    });
  }

  private initializeDataDog(): void {
    // DataDog RUM para monitoramento de frontend
    import('@datadog/browser-rum').then((DD_RUM) => {
      (DD_RUM as any).init({
        applicationId: monitoringConfig.appId || '',
        clientToken: monitoringConfig.apiKey || '',
        site: 'datadoghq.com',
        service: 'omni-web',
        env: monitoringConfig.environment,
        version: monitoringConfig.release,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 20,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
      });
    }).catch((error) => {
      console.error('[Monitoring] Erro ao carregar DataDog:', error);
    });
  }

  /**
   * Registra um erro
   */
  captureError(error: Error | AppError, context?: MonitoringEvent['context']): void {
    if (!monitoringConfig.enabled) return;

    const event: MonitoringEvent = {
      level: 'error',
      message: error.message,
      error,
      context,
    };

    this.sendEvent(event);
  }

  /**
   * Registra um evento personalizado
   */
  captureEvent(event: MonitoringEvent): void {
    if (!monitoringConfig.enabled) return;
    this.sendEvent(event);
  }

  /**
   * Define o usuário atual para o monitoramento
   */
  setUser(user: MonitoringEvent['user']): void {
    if (!monitoringConfig.enabled) return;

    switch (monitoringConfig.provider) {
      case 'sentry':
        this.setSentryUser(user);
        break;
      case 'logrocket':
        this.setLogRocketUser(user);
        break;
      case 'datadog':
        this.setDataDogUser(user);
        break;
    }
  }

  /**
   * Registra uma métrica de performance
   */
  captureMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!monitoringConfig.enabled) return;

    // Para desenvolvimento, apenas log no console
    if (monitoringConfig.provider === 'console') {
      console.log(`[Metric] ${name}: ${value}`, tags);
      return;
    }

    // Implementar métricas para provedores específicos conforme necessário
  }

  // Métodos específicos para cada provedor
  private setSentryUser(user: MonitoringEvent['user']): void {
    import('@sentry/nextjs').then((Sentry) => {
      Sentry.setUser({
        id: user?.id,
        email: user?.email,
        role: user?.role,
      });
    });
  }

  private setLogRocketUser(user: MonitoringEvent['user']): void {
    import('logrocket').then((LogRocket) => {
      LogRocket.identify(user?.id || '', {
        ...(user?.email && { email: user.email }),
        ...(user?.role && { role: user.role }),
      });
    });
  }

  private setDataDogUser(user: MonitoringEvent['user']): void {
    import('@datadog/browser-rum').then((DD_RUM) => {
      (DD_RUM as any).setUser({
        id: user?.id,
        email: user?.email,
        role: user?.role,
      });
    });
  }

  private sendEvent(event: MonitoringEvent): void {
    switch (monitoringConfig.provider) {
      case 'sentry':
        this.sendToSentry(event);
        break;
      case 'logrocket':
        this.sendToLogRocket(event);
        break;
      case 'datadog':
        this.sendToDataDog(event);
        break;
      case 'console':
      default:
        this.sendToConsole(event);
        break;
    }
  }

  private sendToSentry(event: MonitoringEvent): void {
    import('@sentry/nextjs').then((Sentry) => {
      if (event.error) {
        Sentry.captureException(event.error, {
          level: event.level as any,
          tags: event.tags,
          extra: {
            ...event.context,
            ...event.extra,
          },
        });
      } else {
        Sentry.captureMessage(event.message, {
          level: event.level as any,
          tags: event.tags,
          extra: {
            ...event.context,
            ...event.extra,
          },
        });
      }
    });
  }

  private sendToLogRocket(event: MonitoringEvent): void {
    import('logrocket').then((LogRocket) => {
      LogRocket.captureMessage(event.message, {
        extra: {
          ...event.context,
          ...event.extra,
          ...(event.error && { error: event.error.message }),
        },
        tags: {
          level: event.level,
          ...event.tags,
        },
      });
    });
  }

  private sendToDataDog(event: MonitoringEvent): void {
    import('@datadog/browser-rum').then((DD_RUM) => {
      if (event.level === 'error' && event.error) {
        (DD_RUM as any).addError(event.error, {
          ...event.context,
          ...event.extra,
        });
      } else {
        (DD_RUM as any).addAction(event.message, {
          level: event.level,
          ...event.context,
          ...event.extra,
        });
      }
    });
  }

  private sendToConsole(event: MonitoringEvent): void {
    const logMethod = event.level === 'error' ? 'error' :
                     event.level === 'warning' ? 'warn' : 'log';

    console[logMethod](`[Monitoring] ${event.level.toUpperCase()}: ${event.message}`, {
      error: event.error,
      context: event.context,
      extra: event.extra,
      tags: event.tags,
    });
  }
}

// Instância global do serviço
export const monitoring = MonitoringService.getInstance();

// Funções de conveniência para uso direto
export const captureError = (error: Error | AppError, context?: Record<string, unknown>) =>
  monitoring.captureError(error, context);

export const captureEvent = (event: MonitoringEvent) =>
  monitoring.captureEvent(event);

export const setMonitoringUser = (user: MonitoringEvent['user']) =>
  monitoring.setUser(user);

export const captureMetric = (name: string, value: number, tags?: Record<string, string>) =>
  monitoring.captureMetric(name, value, tags);

// Configuração padrão baseada em variáveis de ambiente
if (process.env.SENTRY_DSN) {
  monitoring.configure({
    provider: 'sentry',
    dsn: process.env.SENTRY_DSN,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  });
} else if (process.env.LOGROCKET_APP_ID) {
  monitoring.configure({
    provider: 'logrocket',
    appId: process.env.LOGROCKET_APP_ID,
  });
} else if (process.env.DD_APPLICATION_ID && process.env.DD_CLIENT_TOKEN) {
  monitoring.configure({
    provider: 'datadog',
    appId: process.env.DD_APPLICATION_ID,
    apiKey: process.env.DD_CLIENT_TOKEN,
  });
}