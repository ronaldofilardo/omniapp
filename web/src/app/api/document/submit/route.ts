import { NextRequest, NextResponse } from 'next/server';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { logDocumentSubmission } from '@/lib/services/auditService';
import { calculateFileHashFromBase64 } from '@/lib/utils/fileHashServer';
import { validateBase64Content } from '@/lib/utils/filePath';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { Redis } from '@upstash/redis';
import { randomUUID } from 'crypto';
import { SLOT_FILE_LIMITS, FILE_SIZE_LIMITS, getFileTooLargeError } from '@/lib/constants/fileLimits';

// Redis para rate limiting distribuído
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const RATE_LIMIT = 10; // aumentado para 10 requisições por IP por hora
// Limite de 2MB para imagens ou PDFs (compatível com Vercel free) - usando constantes centralizadas
const PAYLOAD_SIZE_LIMIT = FILE_SIZE_LIMITS.MAX_GENERAL_UPLOAD_SIZE;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hora
const BLOCK_DURATION = 15 * 60 * 1000; // 15 minutos de bloqueio após limite
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === '1';

// NOTA: Maps removidos - usando apenas Redis distribuído para produção
// Em testes, use RATE_LIMIT_DISABLED=1 ou mock do Redis

// Queue para processamento assíncrono
const JOB_QUEUE_KEY = 'document_submit_queue';
const JOB_STATUS_PREFIX = 'job:';
const JOB_EXPIRY = 3600; // 1 hora

// Circuit breaker usando Redis
const CIRCUIT_BREAKER_KEY = 'circuit_breaker:state';
const CIRCUIT_FAILURES_KEY = 'circuit_breaker:failures';
const CIRCUIT_LAST_CHECK_KEY = 'circuit_breaker:last_check';
const CIRCUIT_BREAKER_THRESHOLD = 5;

async function checkCircuitBreaker(): Promise<boolean> {
  const now = Date.now();
  
  try {
    const state = await redis.get(CIRCUIT_BREAKER_KEY) as string || 'closed';
    const lastCheck = parseInt(await redis.get(CIRCUIT_LAST_CHECK_KEY) as string || '0');

    // Reset circuit breaker se passou tempo suficiente (recuperação automática)
    if (state === 'open' && now - lastCheck > BLOCK_DURATION) {
      await redis.set(CIRCUIT_BREAKER_KEY, 'half-open');
      await redis.set(CIRCUIT_FAILURES_KEY, '0');
      console.log('[CIRCUIT BREAKER] Recuperação automática: half-open');
    }

    // Se está half-open, permitir uma requisição de teste
    const currentState = await redis.get(CIRCUIT_BREAKER_KEY) as string || 'closed';
    if (currentState === 'half-open') {
      console.log('[CIRCUIT BREAKER] Half-open: permitindo requisição de teste');
      return true; // Permitir tentativa de recuperação
    }

    if (currentState === 'open') {
      console.log('[CIRCUIT BREAKER] Open: bloqueando requisição');
      return false; // Bloqueado
    }

    return true; // Closed - permitido
  } catch (error) {
    console.error('[CIRCUIT BREAKER] Erro no Redis - PERMITINDO por segurança:', error);
    // Em caso de erro no Redis, PERMITIR a requisição para não bloquear o serviço
    // (fail-open é mais seguro que fail-closed para disponibilidade)
    return true;
  }
}

async function recordCircuitBreakerFailure() {
  try {
    const currentState = await redis.get(CIRCUIT_BREAKER_KEY) as string || 'closed';
    const failures = parseInt(await redis.get(CIRCUIT_FAILURES_KEY) as string || '0') + 1;
    await redis.set(CIRCUIT_FAILURES_KEY, failures.toString());

    console.log(`[CIRCUIT BREAKER] Falha registrada: ${failures}/${CIRCUIT_BREAKER_THRESHOLD}`);

    if (failures >= CIRCUIT_BREAKER_THRESHOLD) {
      await redis.set(CIRCUIT_BREAKER_KEY, 'open');
      await redis.set(CIRCUIT_LAST_CHECK_KEY, Date.now().toString());
      console.error(`[CIRCUIT BREAKER] ABERTO após ${failures} falhas. Bloqueando por ${BLOCK_DURATION/1000}s`);
    }
  } catch (error) {
    console.error('[CIRCUIT BREAKER] Erro ao registrar falha no Redis:', error);
    // Se Redis falhar, não podemos registrar falhas, mas logamos o erro
  }
}

async function recordCircuitBreakerSuccess() {
  try {
    const currentState = await redis.get(CIRCUIT_BREAKER_KEY) as string || 'closed';
    
    // Se estava half-open e teve sucesso, voltar para closed
    if (currentState === 'half-open') {
      await redis.set(CIRCUIT_BREAKER_KEY, 'closed');
      await redis.set(CIRCUIT_FAILURES_KEY, '0');
      console.log('[CIRCUIT BREAKER] Recuperação bem-sucedida: closed');
    } else if (currentState === 'closed') {
      // Resetar contador de falhas em caso de sucesso
      await redis.set(CIRCUIT_FAILURES_KEY, '0');
    }
  } catch (error) {
    console.error('[CIRCUIT BREAKER] Erro ao registrar sucesso no Redis:', error);
  }
}

// Função para processar job em background
async function processDocumentJob(jobId: string) {
  try {
    // Buscar job do Redis
    const jobData = await redis.get(`${JOB_STATUS_PREFIX}${jobId}`);
    if (!jobData) {
      console.error(`Job ${jobId} não encontrado`);
      return;
    }

    const payload = JSON.parse(jobData as string);

    // Atualizar status para processing
    await redis.set(`${JOB_STATUS_PREFIX}${jobId}`, JSON.stringify({
      ...payload,
      status: 'processing',
      startedAt: new Date().toISOString()
    }), { ex: JOB_EXPIRY });

    // Executar processamento (lógica extraída do POST original)
    const result = await performDocumentProcessing(payload);

    // Atualizar status para completed
    await redis.set(`${JOB_STATUS_PREFIX}${jobId}`, JSON.stringify({
      ...payload,
      status: 'completed',
      result,
      completedAt: new Date().toISOString()
    }), { ex: JOB_EXPIRY });

  } catch (error) {
    console.error(`Erro no processamento do job ${jobId}:`, error);

    // Atualizar status para failed
    const jobData = await redis.get(`${JOB_STATUS_PREFIX}${jobId}`);
    if (jobData) {
      const payload = JSON.parse(jobData as string);
      await redis.set(`${JOB_STATUS_PREFIX}${jobId}`, JSON.stringify({
        ...payload,
        status: 'failed',
        error: (error as Error).message,
        failedAt: new Date().toISOString()
      }), { ex: JOB_EXPIRY });
    }
  }
}

// Função auxiliar para timeout
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Processamento demorou muito'));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

// Lógica de processamento extraída
async function performDocumentProcessing(payload: any) {
  const { patientEmail, doctorName, examDate, report, documento, pacienteId, cpf, documentType, ip, userAgent, loggedInUser } = payload;

  // Log detalhado para debug
  console.log('=== DEBUG: Busca de usuário por CPF (público) ===');

  let user;

  // Busca por CPF (usuário receptor)
  console.log('CPF recebido:', cpf);
  const cleanCpf = cpf.replace(/\D/g, '');

  // Busca direta por CPF normalizado (apenas dígitos)
  user = await prisma.user.findFirst({
    where: { cpf: cleanCpf }
  });

  // Log do usuário encontrado
  console.log('Usuário encontrado:', user ? {
    id: user.id,
    cpf: user.cpf,
    email: user.email,
    role: user.role
  } : 'NENHUM');

  // Calcular hash SHA-256 do arquivo
  const fileHash = calculateFileHashFromBase64(report.fileContent);

  // Registrar no audit log
  await logDocumentSubmission({
    origin: 'PORTAL_PUBLICO',
    emitterCnpj: null,
    receiverCpf: cleanCpf || 'não-informado',
    protocol: documento || null,
    fileName: report?.fileName || 'arquivo.pdf',
    fileHash: fileHash,
    documentType: documentType || 'result',
    ip: ip,
    userAgent: userAgent,
    status: user ? 'SUCCESS' : 'USER_NOT_FOUND',
    patientId: user?.id || null,
    patientName: user?.name || null,
  });

  if (!user) {
    throw new Error('Não encontramos nenhum usuário com o CPF informado. Verifique se o CPF está correto ou cadastrado no sistema.');
  }

  // Cria o documento na tabela reports
  let senderId;

  // Se há usuário logado e é emissor, usar ele como sender
  if (loggedInUser && loggedInUser.role === 'EMISSOR') {
    senderId = loggedInUser.id;
  } else {
    // Para público, sempre criamos um sender público
    const existingPublicSender = await prisma.user.findFirst({
      where: { role: 'EMISSOR', email: 'publico@externo.com' }
    });

    if (existingPublicSender) {
      senderId = existingPublicSender.id;
    } else {
      // Criar um emissor público genérico se não existir
      const publicSender = await prisma.user.create({
        data: {
          email: 'publico@externo.com',
          password: 'hashed_password', // Em produção, usar hash real
          name: 'Envio Público',
          role: 'EMISSOR'
        }
      });
      senderId = publicSender.id;
    }
  }

  const documentTypeLabels = {
    request: 'Solicitação',
    authorization: 'Autorização',
    certificate: 'Atestado',
    result: 'Laudo/Resultado',
    prescription: 'Prescrição',
    invoice: 'Nota Fiscal'
  };

  let reportRecord;
  try {
    reportRecord = await prisma.report.create({
      data: {
        protocol: documento,
        title: `${documentTypeLabels[documentType as keyof typeof documentTypeLabels] || 'Documento'} - ${doctorName}`,
        fileName: report.fileName,
        fileUrl: `data:application/pdf;base64,${report.fileContent}`,
        senderId,
        receiverId: user.id,
        paciente_id: pacienteId,
        status: 'SENT'
      }
    });
  } catch (err: any) {
    if (err?.code === 'P2002' && err?.meta?.target?.includes('protocol')) {
      throw new Error('Já existe um documento cadastrado com este número de exame. Por favor, utilize outro número.');
    }
    throw err;
  }

  // Cria notificação
  const notification = await prisma.notification.create({
    data: {
      userId: user.id,
      type: NotificationType.LAB_RESULT, // Mantém para compatibilidade
      payload: { doctorName, examDate: new Date(examDate), report, reportId: reportRecord.id, documentType },
      documento,
      status: NotificationStatus.UNREAD,
    },
  });

  // Atualizar o documento com o ID da notificação
  await prisma.report.update({
    where: { id: reportRecord.id },
    data: { notificationId: notification.id }
  });

  return {
    jobId: randomUUID(),
    status: 'processing',
    statusUrl: `/api/document/status/${randomUUID()}`,
    notificationId: notification.id,
    reportId: reportRecord.id,
    receivedAt: notification.createdAt,
  };
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

  // Tentar obter usuário logado (opcional)
  const loggedInUser = await auth().catch(() => null);

  // Verificar circuit breaker
  if (!(await checkCircuitBreaker())) {
    return NextResponse.json({
      error: 'Serviço temporariamente indisponível. Tente novamente em alguns minutos.'
    }, { status: 503 });
  }

  // Rate limiting por IP usando Redis ou Map para testes
  if (!RATE_LIMIT_DISABLED) {
    const now = Date.now();
    const rateKey = `ratelimit:${ip}`;
    const blockKey = `blocked:${ip}`;

    try {
      // Verificar se IP está bloqueado
      const blockedUntil = await redis.get(blockKey);
      if (blockedUntil && now < parseInt(blockedUntil as string)) {
        const retryAfter = Math.ceil((parseInt(blockedUntil as string) - now) / 1000);
        return NextResponse.json({
          error: 'Muitas tentativas. Tente novamente mais tarde.',
          retryAfter
        }, {
          status: 429,
          headers: { 'Retry-After': retryAfter.toString() }
        });
      }

      // Incrementar contador
      const count = await redis.incr(rateKey);

      // Se é a primeira requisição, definir expiração
      if (count === 1) {
        await redis.expire(rateKey, Math.ceil(RATE_LIMIT_WINDOW / 1000));
      }

      // Bloquear se excedeu limite
      if (count > RATE_LIMIT) {
        const blockedUntilTime = now + BLOCK_DURATION;
        await redis.set(blockKey, blockedUntilTime.toString(), { ex: Math.ceil(BLOCK_DURATION / 1000) });
        return NextResponse.json({
          error: 'Limite de requisições excedido. Tente novamente em 15 minutos.',
          retryAfter: BLOCK_DURATION / 1000
        }, {
          status: 429,
          headers: { 'Retry-After': (BLOCK_DURATION / 1000).toString() }
        });
      }
    } catch (error) {
      console.error('[RATE LIMIT] Erro no Redis - PERMITINDO por segurança:', error);
      // Em caso de erro no Redis, PERMITIR a requisição para não bloquear o serviço
      // (fail-open é mais seguro que fail-closed para disponibilidade)
    }
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validação básica do payload (< 1s)
  const { patientEmail, doctorName, examDate, report, documento, pacienteId, cpf, documentType } = body;
  if (!patientEmail || !doctorName || !examDate || !report || !documento || !cpf) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
  }

  // Validação de CPF (obrigatório para identificar receptor)
  const cleanCpf = cpf.replace(/\D/g, '');
  if (!/^\d{11}$/.test(cleanCpf)) {
    return NextResponse.json({ error: 'Formato de CPF inválido' }, { status: 400 });
  }

  if (typeof report !== 'object' || !report.fileName || !report.fileContent) {
    return NextResponse.json({ error: 'Formato de relatório inválido' }, { status: 400 });
  }

  // Limite de tamanho do arquivo usando constantes centralizadas (2MB)
  const fileSize = Buffer.byteLength(report.fileContent, 'base64');
  const slotType = (documentType || 'result') as keyof typeof SLOT_FILE_LIMITS;
  const maxSize = SLOT_FILE_LIMITS[slotType] || SLOT_FILE_LIMITS.result;
  
  if (fileSize > maxSize) {
    return NextResponse.json({
      error: getFileTooLargeError(fileSize, slotType)
    }, { status: 413 });
  }

  // Validação de segurança do conteúdo base64 (permite imagens ou PDFs)
  const validation = validateBase64Content(report.fileContent);
  if (!validation.isValid) {
    console.warn('[DOCUMENT SUBMIT] Validação de base64 falhou:', validation.error);
    return NextResponse.json({
      error: `Conteúdo do arquivo inválido: ${validation.error}`
    }, { status: 400 });
  }

  // Verificar se é imagem ou PDF
  const isAllowedType = validation.detectedMimeType &&
    (validation.detectedMimeType === 'application/pdf' || validation.detectedMimeType.startsWith('image/'));

  if (!isAllowedType) {
    console.warn('[DOCUMENT SUBMIT] Tipo de arquivo não permitido:', validation.detectedMimeType);
    return NextResponse.json({
      error: 'Tipo de arquivo não permitido. Apenas imagens ou PDFs são aceitos.'
    }, { status: 400 });
  }

  try {
    // Processar documento de forma síncrona com timeout de 8 segundos
    const result = await withTimeout(
      performDocumentProcessing({
        patientEmail,
        doctorName,
        examDate,
        report,
        documento,
        pacienteId,
        cpf,
        documentType,
        ip: ip.split(',')[0].trim(),
        userAgent: req.headers.get('user-agent') || null,
        loggedInUser
      }),
      8000 // 8 segundos
    );

    // Registrar sucesso no circuit breaker
    await recordCircuitBreakerSuccess();

    // Registrar sucesso no circuit breaker
    await recordCircuitBreakerSuccess();

    // Retornar sucesso
    return NextResponse.json(result, { status: 202 });

  } catch (err) {
    // Verificar se é timeout
    if ((err as Error).message === 'Processamento demorou muito') {
      return NextResponse.json({
        error: 'Processamento demorou muito. Tente novamente.'
      }, { status: 408 });
    }

    // Registrar falha no circuit breaker
    await recordCircuitBreakerFailure();

    const error = err as Error;
    const errorMessage = error.message || 'Erro interno do servidor';

    // Verificar se é erro de usuário não encontrado
    if (errorMessage.includes('Não encontramos nenhum usuário com o CPF informado')) {
      return NextResponse.json({
        error: errorMessage
      }, { status: 404 });
    }

    // Outros erros retornam 500
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
