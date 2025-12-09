
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/resend';
import { randomUUID } from 'crypto';
import { logAuthEvent } from '@/lib/services/auditService';

// Função para capturar IP do cliente
function getClientIP(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const remoteAddr = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
  
  return forwardedFor || realIP || remoteAddr || '127.0.0.1'
}

// Define explicitamente a configuração da rota
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }
  console.log('[API][userId] Recebido:', userId);
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        telefone: true,
      },
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar usuário' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 });
  }

  try {
    // Verificar autenticação
    const currentUser = await auth();
    if (!currentUser || currentUser.id !== userId) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 });
    }

    const { name, email, cpf, telefone } = await request.json();

    // Buscar usuário atual
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!existingUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    let emailChanged = false;

    if (name !== undefined) updateData.name = name;
    if (cpf !== undefined) updateData.cpf = cpf;
    if (telefone !== undefined) updateData.telefone = telefone;

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== existingUser.email) {
        // Verificar se o novo e-mail já está em uso
        const emailExists = await prisma.user.findFirst({
          where: { email: normalizedEmail },
        });
        if (emailExists) {
          return NextResponse.json({ error: 'E-mail já está em uso' }, { status: 400 });
        }
        updateData.email = normalizedEmail;
        updateData.emailVerified = null; // Requer re-verificação
        emailChanged = true;
      }
    }

    // Atualizar usuário
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        telefone: true,
      },
    });

    // Se e-mail mudou, enviar e-mail de verificação
    if (emailChanged) {
      const token = randomUUID();
      await prisma.verificationToken.create({
        data: {
          identifier: updateData.email,
          token,
          expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
        },
      });
      await sendVerificationEmail(updateData.email, token);
      
      // Log de auditoria para mudança de email
      await logAuthEvent({
        userId: existingUser.id,
        userEmail: existingUser.email,
        userCpf: existingUser.cpf?.replace(/\D/g, ''),
        userName: existingUser.name,
        action: 'EMAIL_CHANGE',
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          oldEmail: existingUser.email,
          newEmail: updateData.email,
          verificationRequired: true
        }
      });
    }

    // Log de auditoria para atualizações de perfil (se não foi mudado email)
    if (!emailChanged && Object.keys(updateData).length > 0) {
      await logAuthEvent({
        userId: existingUser.id,
        userEmail: existingUser.email,
        userCpf: existingUser.cpf?.replace(/\D/g, ''),
        userName: existingUser.name,
        action: 'EMAIL_CHANGE', // Usar como genérico para mudanças de perfil
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          fieldsUpdated: Object.keys(updateData),
          profileUpdate: true
        }
      });
    }

    return NextResponse.json({
      message: emailChanged
        ? 'Dados atualizados. Verifique seu novo e-mail para confirmar a mudança.'
        : 'Dados atualizados com sucesso.',
      user: updatedUser
    });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
