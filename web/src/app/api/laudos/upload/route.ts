import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadRateLimiter } from '@/lib/utils/rateLimit';
import { logSecurityEvent } from '@/lib/services/auditService';
import { SLOT_FILE_LIMITS, getFileTooLargeError } from '@/lib/constants/fileLimits';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown'

  // Rate limiting
  const rateLimitResult = uploadRateLimiter.check(ip)
  if (!rateLimitResult.allowed) {
    await logSecurityEvent({
      action: 'RATE_LIMIT_EXCEEDED',
      ip,
      userAgent: request.headers.get('user-agent') || undefined,
      resource: '/api/laudos/upload',
      details: { retryAfter: rateLimitResult.retryAfter }
    })
    return NextResponse.json(
      {
        error: 'Limite de requisições excedido. Tente novamente mais tarde.',
        retryAfter: rateLimitResult.retryAfter
      },
      {
        status: 429,
        headers: { 'Retry-After': rateLimitResult.retryAfter?.toString() || '900' }
      }
    )
  }

  // Verificar autenticação obrigatória
  const user = await auth()
  if (!user) {
    await logSecurityEvent({
      action: 'AUTH_FAILURE',
      ip,
      userAgent: request.headers.get('user-agent') || undefined,
      resource: '/api/laudos/upload',
      details: { reason: 'no_session' }
    })
    return NextResponse.json({ error: 'Autenticação obrigatória' }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pacienteId = formData.get('paciente_id') as string;

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não fornecido' }, { status: 400 });
    }

    // Validação de tipo de arquivo (imagens e PDFs)
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return NextResponse.json({ 
        error: 'Apenas arquivos de imagem ou PDFs são aceitos.' 
      }, { status: 400 });
    }

    // Validação de tamanho usando constantes centralizadas (2MB)
    const maxSize = SLOT_FILE_LIMITS.result; // Laudos usam slot 'result'
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: getFileTooLargeError(file.size, 'result')
      }, { status: 400 });
    }

    // Simulação: processar arquivo (aqui apenas logar)
    console.log('Arquivo recebido:', file.name, 'Tamanho:', file.size);
    console.log('Paciente ID:', pacienteId);

    // Simular processamento
    // Em produção, salvar arquivo, etc.

    // Retornar dados do laudo
    const laudo = {
      id: Date.now().toString(),
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
      status: 'completed' as const,
      pacienteId, // Para futura integração
    };

    return NextResponse.json(laudo);
  } catch (error) {
    console.error('Erro ao processar upload:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
