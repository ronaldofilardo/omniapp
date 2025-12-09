import { prisma } from '@/lib/prisma'
import type { AuditOrigin, AuditStatus } from '@prisma/client'

interface AuditData {
  origin: AuditOrigin
  emitterCnpj?: string | null
  receiverCpf: string
  patientId?: string | null
  patientName?: string | null
  protocol?: string | null
  fileName: string
  fileHash?: string | null
  documentType?: string | null
  ip: string
  userAgent?: string | null
  status?: AuditStatus
  metadata?: any
}

interface SecurityEventData {
  action: 'AUTH_FAILURE' | 'UNAUTHORIZED_ACCESS' | 'RATE_LIMIT_EXCEEDED' | 'INVALID_FILE_TYPE' | 'FILE_TOO_LARGE'
  ip: string
  userAgent?: string | null
  userId?: string | null
  resource?: string
  details?: any
}

interface ReportViewData {
  userId: string
  userCpf: string
  userName?: string | null
  reportId: string
  reportFileName: string
  eventId?: string | null
  ip: string
  userAgent?: string | null
  viewedAt?: Date
}

interface NotificationActionData {
  userId: string
  userCpf: string
  notificationId: string
  action: 'VIEWED' | 'ARCHIVED' | 'DELETED'
  notificationType: string
  ip: string
  userAgent?: string | null
  metadata?: any
}

interface AuthEventData {
  userId?: string | null
  userEmail?: string | null
  userCpf?: string | null
  userName?: string | null
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'PASSWORD_CHANGE' | 'EMAIL_CHANGE'
  ip: string
  userAgent?: string | null
  metadata?: any
}

interface HealthEventData {
  userId: string
  userCpf: string
  userName?: string | null
  eventId?: string | null
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'VIEWED'
  eventType?: string
  eventTitle?: string
  ip: string
  userAgent?: string | null
  metadata?: any
}

interface PermissionEventData {
  userId: string
  targetUserId?: string | null
  userCpf: string
  targetUserCpf?: string | null
  action: 'ROLE_CHANGED' | 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED'
  oldRole?: string
  newRole?: string
  ip: string
  userAgent?: string | null
  metadata?: any
}

export async function logDocumentSubmission(data: AuditData) {
  try {
    await prisma.auditLog.create({
      data: {
        origin: data.origin,
        emitterCnpj: data.emitterCnpj || null,
        receiverCpf: data.receiverCpf,
        patientId: data.patientId || null,
        patientName: data.patientName || null,
        protocol: data.protocol || null,
        fileName: data.fileName,
        fileHash: data.fileHash || null,
        documentType: data.documentType || 'result',
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: data.status || 'PROCESSING',
        metadata: data.metadata,
      },
    })
  } catch (error) {
    console.error('[AUDIT LOG FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      data: { ...data, metadata: '[redacted]' },
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Registra eventos de segurança (falhas de autenticação, acesso não autorizado, etc.)
 */
export async function logSecurityEvent(data: SecurityEventData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        origin: 'PORTAL_LOGADO', // Assume portal logado para uploads
        receiverCpf: 'sistema', // Valor padrão para eventos de sistema
        fileName: data.resource || 'security-event',
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: 'USER_NOT_FOUND', // Indica falha de segurança
        metadata: {
          userId: data.userId,
          details: data.details,
          timestamp: new Date().toISOString(),
        },
      },
    })
  } catch (error) {
    console.error('[SECURITY AUDIT LOG FALHOU]', {
      error,
      data: { ...data, details: '[redacted]' },
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Registra visualização de laudos/documentos médicos
 * Essencial para conformidade e auditoria médica
 */
export async function logReportView(data: ReportViewData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'REPORT_VIEWED',
        origin: 'PORTAL_LOGADO',
        receiverCpf: data.userCpf,
        patientId: data.userId,
        patientName: data.userName || null,
        fileName: data.reportFileName,
        protocol: data.reportId,
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: 'SUCCESS',
        documentType: 'result',
        metadata: {
          reportId: data.reportId,
          eventId: data.eventId,
          viewedAt: data.viewedAt || new Date().toISOString(),
          action: 'view',
        },
      },
    })
    console.log(`[AUDIT] Visualização de laudo registrada: ${data.reportFileName} por ${data.userName || data.userId}`)
  } catch (error) {
    console.error('[AUDIT LOG VIEW FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      reportId: data.reportId,
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Registra ações em notificações (visualização, arquivamento, etc.)
 * Importante para rastreabilidade do fluxo de notificações médicas
 */
export async function logNotificationAction(data: NotificationActionData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: `NOTIFICATION_${data.action}`,
        origin: 'PORTAL_LOGADO',
        receiverCpf: data.userCpf,
        patientId: data.userId,
        fileName: `notification-${data.notificationId}`,
        protocol: data.notificationId,
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: 'SUCCESS',
        documentType: 'notification',
        metadata: {
          notificationId: data.notificationId,
          notificationType: data.notificationType,
          action: data.action,
          timestamp: new Date().toISOString(),
          ...data.metadata,
        },
      },
    })
    console.log(`[AUDIT] Ação em notificação registrada: ${data.action} por ${data.userId}`)
  } catch (error) {
    console.error('[AUDIT LOG NOTIFICATION FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      notificationId: data.notificationId,
      action: data.action,
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Registra eventos de autenticação (login, logout, mudanças de senha/email)
 * Essencial para conformidade de segurança e auditoria de acesso
 */
export async function logAuthEvent(data: AuthEventData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        origin: 'PORTAL_LOGADO',
        receiverCpf: data.userCpf || 'sistema',
        patientId: data.userId,
        patientName: data.userName || null,
        fileName: `auth-${data.action.toLowerCase()}`,
        protocol: data.userId ? `auth-${data.userId}-${Date.now()}` : null,
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: data.action.includes('FAILURE') ? 'USER_NOT_FOUND' : 'SUCCESS',
        documentType: 'auth',
        metadata: {
          action: data.action,
          userEmail: data.userEmail,
          timestamp: new Date().toISOString(),
          ...data.metadata,
        },
      },
    })
    console.log(`[AUDIT] Evento de autenticação registrado: ${data.action} para ${data.userEmail || data.userId || 'usuário desconhecido'}`)
  } catch (error) {
    console.error('[AUDIT LOG AUTH FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      action: data.action,
      userId: data.userId,
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Registra eventos relacionados a health events (criação, edição, exclusão, visualização)
 * Fundamental para auditoria médica e conformidade
 */
export async function logHealthEvent(data: HealthEventData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: `HEALTH_EVENT_${data.action}`,
        origin: 'PORTAL_LOGADO',
        receiverCpf: data.userCpf,
        patientId: data.userId,
        patientName: data.userName || null,
        fileName: `health-event-${data.eventId || 'new'}`,
        protocol: data.eventId || `health-${data.userId}-${Date.now()}`,
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: 'SUCCESS',
        documentType: 'health_event',
        metadata: {
          eventId: data.eventId,
          action: data.action,
          eventType: data.eventType,
          eventTitle: data.eventTitle,
          timestamp: new Date().toISOString(),
          ...data.metadata,
        },
      },
    })
    console.log(`[AUDIT] Evento médico registrado: ${data.action} - ${data.eventTitle || data.eventId} por ${data.userName || data.userId}`)
  } catch (error) {
    console.error('[AUDIT LOG HEALTH EVENT FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      action: data.action,
      eventId: data.eventId,
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Registra mudanças de permissões e roles de usuários
 * Crítico para auditoria de segurança e conformidade
 */
export async function logPermissionEvent(data: PermissionEventData) {
  try {
    await prisma.auditLog.create({
      data: {
        action: data.action,
        origin: 'PORTAL_LOGADO',
        receiverCpf: data.userCpf,
        patientId: data.userId,
        fileName: `permission-${data.action.toLowerCase()}`,
        protocol: `perm-${data.userId}-${Date.now()}`,
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: 'SUCCESS',
        documentType: 'permission',
        metadata: {
          action: data.action,
          targetUserId: data.targetUserId,
          targetUserCpf: data.targetUserCpf,
          oldRole: data.oldRole,
          newRole: data.newRole,
          timestamp: new Date().toISOString(),
          ...data.metadata,
        },
      },
    })
    console.log(`[AUDIT] Evento de permissão registrado: ${data.action} por ${data.userId} → ${data.targetUserId || 'sistema'}`)
  } catch (error) {
    console.error('[AUDIT LOG PERMISSION FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      action: data.action,
      userId: data.userId,
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Atualiza o status de um log de auditoria (usado quando documento é recebido/processado)
 */
export async function updateAuditLogStatus(protocol: string, status: AuditStatus) {
  try {
    await prisma.auditLog.updateMany({
      where: {
        protocol: protocol,
      },
      data: {
        status: status,
      },
    })
  } catch (error) {
    console.error('[AUDIT LOG UPDATE FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      protocol,
      status,
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}

/**
 * Registra compartilhamentos de arquivos
 * Fundamental para rastrear compartilhamentos e auditoria de dados médicos
 */
export async function logFileShare(data: {
  userId: string
  userCpf: string
  userName?: string | null
  eventId: string
  fileCount: number
  shareToken: string
  shareLink: string
  ip: string
  userAgent?: string | null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'SHARE_CREATED',
        origin: 'PORTAL_LOGADO',
        receiverCpf: data.userCpf,
        patientId: data.userId,
        patientName: data.userName || null,
        fileName: `share-${data.shareToken}`,
        protocol: `share-${data.eventId}-${Date.now()}`,
        ipAddress: data.ip,
        userAgent: data.userAgent || null,
        status: 'SUCCESS',
        documentType: 'file_share',
        metadata: {
          eventId: data.eventId,
          fileCount: data.fileCount,
          shareToken: data.shareToken,
          shareLink: data.shareLink,
          timestamp: new Date().toISOString(),
        },
      },
    })
    console.log(`[AUDIT] Compartilhamento registrado: ${data.fileCount} arquivos do evento ${data.eventId} por ${data.userName || data.userId}`)
  } catch (error) {
    console.error('[AUDIT LOG SHARE FALHOU - NÃO BLOQUEIA FLUXO]', {
      error,
      eventId: data.eventId,
      userId: data.userId,
    })
    // Não lança exceção → fluxo principal nunca quebra
  }
}
