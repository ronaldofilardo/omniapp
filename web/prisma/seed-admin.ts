import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    // Criar usuário admin padrão
    const adminEmail = 'admin@omni.com'
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (!existingAdmin) {
      // Criar usuário admin
      const hashedPassword = await bcrypt.hash('123456', 10)
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'Administrador Omni',
          role: 'ADMIN',
          emailVerified: new Date() // Email já verificado
        }
      })

      console.log('✅ Usuário admin criado com sucesso:', admin.email)
    } else {
      console.log('ℹ️ Usuário admin já existe:', adminEmail)
    }

    // Criar usuário lab
    const labEmail = 'labor@omni.com'
    const existingLab = await prisma.user.findUnique({
      where: { email: labEmail }
    })

    if (!existingLab) {
      const hashedPasswordLab = await bcrypt.hash('123456', 10)
      const lab = await prisma.user.create({
        data: {
          email: labEmail,
          password: hashedPasswordLab,
          name: 'Laboratório Omni',
          role: 'EMISSOR',
          emailVerified: new Date() // Email já verificado
        }
      })

      console.log('✅ Usuário lab criado com sucesso:', lab.email)
    } else {
      console.log('ℹ️ Usuário lab já existe:', labEmail)
    }

    console.log('🚀 Seed admin e lab concluído com sucesso!')
  } catch (error) {
    console.error('❌ Erro durante o seed admin:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()