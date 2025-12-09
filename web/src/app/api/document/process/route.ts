import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { logDocumentSubmission } from '@/lib/services/auditService';
import { calculateFileHashFromBase64 } from '@/lib/utils/fileHashServer';
import { prisma } from '@/lib/prisma';

// Redis para queue e jobs
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const JOB_QUEUE_KEY = 'document_submit_queue';
const JOB_STATUS_PREFIX = 'job:';

// Lógica de processamento extraída (copiada do submit/route.ts)
async function performDocumentProcessing(payload: any) {
  const { patientEmail, doctorName, examDate, report, documento, pacienteId, cpf, documentType, ip, userAgent } = payload;

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
  let senderId = user.id; // Por padrão, o usuário encontrado

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
    notificationId: notification.id,
    reportId: reportRecord.id,
    receivedAt: notification.createdAt,
  };
}

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
    }), { ex: 3600 });

    // Executar processamento
    const result = await performDocumentProcessing(payload.payload);

    // Atualizar status para completed
    await redis.set(`${JOB_STATUS_PREFIX}${jobId}`, JSON.stringify({
      ...payload,
      status: 'completed',
      result,
      completedAt: new Date().toISOString()
    }), { ex: 3600 });

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
      }), { ex: 3600 });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Tentar processar um job da queue
    const jobId = await redis.rpop(JOB_QUEUE_KEY) as string;

    if (!jobId) {
      return NextResponse.json({
        message: 'Nenhum job na fila'
      });
    }

    // Processar o job em background (não aguardar conclusão)
    processDocumentJob(jobId).catch(error => {
      console.error('Erro no processamento assíncrono:', error);
    });

    return NextResponse.json({
      message: `Processando job ${jobId}`,
      jobId
    });

  } catch (error) {
    console.error('Erro no processamento de jobs:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}

// GET para verificar se há jobs na fila
export async function GET() {
  try {
    const queueLength = await redis.llen(JOB_QUEUE_KEY);

    return NextResponse.json({
      queueLength,
      hasJobs: queueLength > 0
    });

  } catch (error) {
    console.error('Erro ao verificar fila:', error);
    return NextResponse.json({
      error: 'Erro interno do servidor'
    }, { status: 500 });
  }
}