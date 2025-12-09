import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { sendVerificationEmail } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      name,
      cpf,
      telefone,
      acceptedPrivacyPolicy,
      acceptedTermsOfUse,
      role = 'RECEPTOR',
    } = await request.json()

    // === Validações (mantidas e melhoradas) ===
    if (!email || !password || !cpf) {
      return NextResponse.json(
        { error: 'E-mail, senha e CPF são obrigatórios' },
        { status: 400 }
      )
    }

    const cpfNumbers = cpf.replace(/\D/g, '')
    if (cpfNumbers.length !== 11) {
      return NextResponse.json(
        { error: 'CPF deve ter 11 dígitos' },
        { status: 400 }
      )
    }

    if (!acceptedPrivacyPolicy || !acceptedTermsOfUse) {
      return NextResponse.json(
        { error: 'Você deve aceitar a Política de Privacidade e os Termos de Uso' },
        { status: 400 }
      )
    }

    if (role === 'EMISSOR') {
      return NextResponse.json(
        { error: 'Registro de emissores não disponível' },
        { status: 403 }
      )
    }

    const emailLower = email.toLowerCase()

    // === Verificações de duplicidade ===
    const existingUser = await prisma.user.findUnique({
      where: { email: emailLower },
    })
    if (existingUser) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 })
    }

    const existingCPF = await prisma.user.findFirst({
      where: { cpf: cpfNumbers },
    })
    if (existingCPF) {
      return NextResponse.json({ error: 'CPF já cadastrado' }, { status: 400 })
    }

    // === Criação do usuário (ainda NÃO verificado) ===
    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.user.create({
      data: {
        email: emailLower,
        password: hashedPassword,
        name,
        cpf: cpfNumbers,
        telefone: telefone || null,
        role,
        acceptedPrivacyPolicy,
        acceptedTermsOfUse,
        emailVerified: null, // ← ainda não verificado
      },
    })

    // === Gera token de verificação (1 hora) ===
    const token = randomUUID()
    await prisma.verificationToken.create({
      data: {
        identifier: emailLower,
        token,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    })

    // === Envia e-mail de confirmação ===
    await sendVerificationEmail(emailLower, token)

    return NextResponse.json(
      {
        success: true,
        message: 'Cadastro realizado! Verifique seu e-mail para ativar a conta.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          cpf: user.cpf,
          telefone: user.telefone,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
