/**
 * API para Recebimento de Laudos de Laboratórios Externos
 * 
 * Esta API permite que laboratórios enviem laudos médicos para pacientes cadastrados
 * no sistema Omni Saúde. Os laudos são processados e geram notificações automáticas.
 * 
 * Documentação completa: /docs/API_DOCUMENTACAO.md
 * 
 * Exemplo de uso:
 * POST /api/lab/submit
 * {
 *   "patientEmail": "paciente@email.com",
 *   "doctorName": "Dr. João Silva",
 *   "examDate": "2024-11-17",
 *   "documento": "LAB-12345",
 *   "cpf": "12345678901",
 *   "report": {
 *     "fileName": "laudo.pdf",
 *     "fileContent": "base64_encoded_content"
 *   }
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { logDocumentSubmission } from '@/lib/services/auditService';
import { calculateFileHashFromBase64 } from '@/lib/utils/fileHashServer';
import { validateBase64Content } from '@/lib/utils/filePath';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { SLOT_FILE_LIMITS, getFileTooLargeError } from '@/lib/constants/fileLimits';


// Simples rate limit in-memory (MVP, troque por Redis/Edge em produção)
export const rateLimitMap = new Map<string, { count: number; last: number }>();
const RATE_LIMIT = 10; // máx. 10 requisições por IP por hora
const PAYLOAD_SIZE_LIMIT = SLOT_FILE_LIMITS.result; // 2MB para laudos
const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === '1';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  if (!RATE_LIMIT_DISABLED) {
    const now = Date.now();
    const rate = rateLimitMap.get(ip) || { count: 0, last: now };
    if (now - rate.last > 60 * 60 * 1000) {
      rate.count = 0;
      rate.last = now;
    }
    rate.count++;
    rateLimitMap.set(ip, rate);
    if (rate.count > RATE_LIMIT) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
  }

  // Verificar se há usuário autenticado (opcional, para emissores internos)
  const authenticatedUser = await auth();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Validação básica do payload
  const { patientEmail, doctorName, examDate, report, documento, pacienteId, cpf, cnpj } = body;
  if (!patientEmail || !doctorName || !examDate || !report || !documento) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Validação do identificador (CPF para receptor, CNPJ para emissor)
  if (!cpf && !cnpj) {
    return NextResponse.json({ error: 'Either CPF or CNPJ is required' }, { status: 400 });
  }

  // Se CPF fornecido, valida formato (11 dígitos numéricos)
  if (cpf && !/^\d{11}$/.test(cpf.replace(/\D/g, ''))) {
    return NextResponse.json({ error: 'Invalid CPF format' }, { status: 400 });
  }

  // Se CNPJ fornecido, valida formato (14 dígitos numéricos)
  if (cnpj && !/^\d{14}$/.test(cnpj.replace(/\D/g, ''))) {
    return NextResponse.json({ error: 'Invalid CNPJ format' }, { status: 400 });
  }
  if (typeof report !== 'object' || !report.fileName || !report.fileContent) {
    return NextResponse.json({ error: 'Invalid report format' }, { status: 400 });
  }
  // Limite de tamanho do arquivo usando constantes centralizadas
  const fileSizeBytes = Buffer.byteLength(report.fileContent, 'base64');
  if (fileSizeBytes > PAYLOAD_SIZE_LIMIT) {
    return NextResponse.json({ 
      error: getFileTooLargeError(fileSizeBytes, 'result')
    }, { status: 413 });
  }

  // Validação de segurança do conteúdo base64 (permite imagens ou PDFs)
  const validation = validateBase64Content(report.fileContent);
  if (!validation.isValid) {
    console.warn('[LAB SUBMIT] Validação de base64 falhou:', validation.error);
    return NextResponse.json({
      error: `Conteúdo do arquivo inválido: ${validation.error}`
    }, { status: 400 });
  }

  // Verificar se é imagem ou PDF
  const isAllowedType = validation.detectedMimeType &&
    (validation.detectedMimeType === 'application/pdf' || validation.detectedMimeType.startsWith('image/'));

  if (!isAllowedType) {
    console.warn('[LAB SUBMIT] Tipo de arquivo não permitido:', validation.detectedMimeType);
    return NextResponse.json({
      error: 'Tipo de arquivo não permitido. Apenas imagens ou PDFs são aceitos.'
    }, { status: 400 });
  }

  try {
    // Log detalhado para debug
    console.log('=== DEBUG: Busca de usuário por CPF/CNPJ ===');
    
    let user;
    let cpfClean = '';
    if (cpf) {
      // Busca por CPF (usuário receptor)
      console.log('CPF recebido:', cpf);
      cpfClean = cpf.replace(/\D/g, '');
      console.log('CPF limpo:', cpfClean);

      // Busca direta por CPF normalizado (apenas dígitos)
      user = await prisma.user.findFirst({
        where: {
          cpf: cpfClean
        }
      });

      console.log('CPF normalizado usado na busca:', cpfClean);
    } else if (cnpj) {
      // Busca por CNPJ (usuário emissor)
      console.log('CNPJ recebido:', cnpj);
      const cnpjClean = cnpj.replace(/\D/g, '');
      console.log('CNPJ limpo:', cnpjClean);

      user = await prisma.user.findFirst({
        where: {
          emissorInfo: {
            cnpj: cnpjClean
          }
        },
        include: {
          emissorInfo: true
        }
      });
    }

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
    let emitterCnpj = body.cnpj?.replace(/\D/g, '') || null;
    if (authenticatedUser && authenticatedUser.role === 'EMISSOR') {
      // Para emissores autenticados, usar o CNPJ do usuário
      const emissorInfo = await prisma.emissorInfo.findUnique({
        where: { userId: authenticatedUser.id },
        select: { cnpj: true }
      });
      emitterCnpj = emissorInfo?.cnpj || null;
    }
    await logDocumentSubmission({
      documentType: 'result',
      origin: authenticatedUser ? 'PORTAL_LOGADO' : 'API_EXTERNA',
      emitterCnpj: emitterCnpj,
      receiverCpf: cpfClean, // corrigido aqui
      protocol: body.documento,
      fileName: body.report.fileName,
      fileHash: fileHash,
      ip: ip.split(',')[0].trim(),
      userAgent: req.headers.get('user-agent') || null,
      status: user ? 'SUCCESS' : 'USER_NOT_FOUND',
      patientId: user?.id || null,
      patientName: user?.name || null,
    });

    if (!user) {
      console.log('=== ERRO: Usuário não encontrado ===');
      return NextResponse.json({
        error: cpf
          ? 'Não encontramos nenhum usuário com o CPF informado. Verifique se o CPF está correto ou cadastrado no sistema.'
          : 'Não encontramos nenhum emissor com o CNPJ informado. Verifique se o CNPJ está correto ou cadastrado no sistema.'
      }, { status: 404 });
    }

    // Cria o laudo na tabela reports

    // Para envios externos, precisamos de um emissor. Vamos buscar ou criar um usuário emissor genérico
    let senderId = user.id; // Por padrão, o usuário encontrado

    // Se há usuário autenticado e é EMISSOR, usar ele como sender
    if (authenticatedUser && authenticatedUser.role === 'EMISSOR') {
      senderId = authenticatedUser.id;
    } else if (user.role === 'RECEPTOR') {
      // Para envios externos, buscar um usuário emissor existente ou criar um genérico
      const existingEmissor = await prisma.user.findFirst({
        where: { role: 'EMISSOR' }
      });

      if (existingEmissor) {
        senderId = existingEmissor.id;
      } else {
        // Criar um emissor genérico se não existir
        const genericEmissor = await prisma.user.create({
          data: {
            email: 'lab@externo.com',
            password: 'hashed_password', // Em produção, usar hash real
            name: 'Laboratório Externo',
            role: 'EMISSOR'
          }
        });
        senderId = genericEmissor.id;
      }
    }

    // Verifica se já existe um report com o mesmo protocolo
    let reportRecord;
    try {
      reportRecord = await prisma.report.create({
        data: {
          protocol: documento,
          title: `Laudo - ${doctorName}`,
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
        return NextResponse.json({
          error: 'Já existe um documento cadastrado com este número de exame. Por favor, utilize outro número.'
        }, { status: 409 });
      }
      return NextResponse.json({ error: 'Erro ao cadastrar documento. Tente novamente.' }, { status: 500 });
    }

    // Cria notificação
    const notification = await prisma.notification.create({
      data: {
        userId: user.id,
        type: NotificationType.LAB_RESULT,
        payload: { doctorName, examDate: new Date(examDate), report, reportId: reportRecord.id },
        documento,
        status: NotificationStatus.UNREAD,
      },
    });

    // Atualizar o laudo com o ID da notificação (NÃO definir receivedAt aqui)
    await prisma.report.update({
      where: { id: reportRecord.id },
      data: { notificationId: notification.id }
    });

    return NextResponse.json({
      notificationId: notification.id,
      reportId: reportRecord.id,
      receivedAt: notification.createdAt,
    }, { status: 202 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message || 'Internal error' }, { status: 500 });
  }
}
