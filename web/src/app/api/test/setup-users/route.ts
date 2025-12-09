import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// Esta API só deve funcionar em ambiente de teste
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ error: 'API disponível apenas em ambiente de teste' }, { status: 403 })
  }

  try {
    const hashedPassword = await bcrypt.hash('123456', 12)

    // Criar usuário emissor
    await prisma.user.upsert({
      where: { email: 'labor@omni.com' },
      update: {},
      create: {
        email: 'labor@omni.com',
        name: 'Usuário Emissor Teste',
        password: hashedPassword,
        role: 'EMISSOR',
      },
    })

    // Criar usuário receptor
    await prisma.user.upsert({
      where: { email: 'test@omni.com' },
      update: {},
      create: {
        email: 'test@omni.com',
        name: 'Usuário Receptor Teste',
        password: hashedPassword,
        role: 'RECEPTOR',
      },
    })

    return NextResponse.json({ success: true, message: 'Usuários de teste criados com sucesso' })
  } catch (error) {
    console.error('Erro ao criar usuários de teste:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
