import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    // Criar usuário emissor padrão
    const emissorEmail = 'labor@omni.com'
    const existingEmissor = await prisma.user.findUnique({
      where: { email: emissorEmail }
    })

    if (!existingEmissor) {
      // Criar usuário emissor
      const hashedPassword = await bcrypt.hash('123456', 10)
      const emissor = await prisma.user.create({
        data: {
          email: emissorEmail,
          password: hashedPassword,
          name: 'Laboratório Omni',
          role: 'EMISSOR',
          emailVerified: new Date(), // Emissor padrão não precisa verificar e-mail
          // Usuários emissores não precisam de CPF, apenas CNPJ no EmissorInfo
          emissorInfo: {
            create: {
              clinicName: 'Laboratório Omni',
              cnpj: '12.345.678/0001-99', // CNPJ da clínica/laboratório
              address: 'Rua Principal, 123',
              contact: '(11) 99999-9999'
            }
          }
        }
      })

      console.log('✅ Usuário emissor criado com sucesso:', emissor.email)
    } else {
      // Atualizar usuário existente para garantir emailVerified
      await prisma.user.update({
        where: { email: emissorEmail },
        data: { emailVerified: new Date() }
      })
      console.log('ℹ️ Usuário emissor já existe e foi atualizado:', emissorEmail)
    }

    console.log('🚀 Seed concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro durante o seed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()