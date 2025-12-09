import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Verificando mapeamento de emissores...\n')

  // Buscar todos os audit logs com CNPJ
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      emitterCnpj: {
        not: null
      }
    },
    select: {
      id: true,
      protocol: true,
      emitterCnpj: true,
    },
    distinct: ['emitterCnpj'],
    take: 20
  })

  console.log(`Total de CNPJs únicos em AuditLog: ${auditLogs.length}\n`)

  // Buscar todos os emissores cadastrados
  const emissores = await prisma.emissorInfo.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  })

  console.log(`Total de emissores cadastrados: ${emissores.length}\n`)

  // Criar mapa CNPJ -> Nome
  const cnpjMap = new Map<string, string>()
  emissores.forEach(emissor => {
    if (emissor.cnpj) {
      cnpjMap.set(emissor.cnpj, emissor.user.name || emissor.clinicName || emissor.user.email)
      console.log(`CNPJ: ${emissor.cnpj} -> Nome: ${emissor.user.name || emissor.clinicName || emissor.user.email}`)
    }
  })

  console.log('\n--- Verificando mapeamento ---\n')

  // Verificar quais CNPJs de AuditLog têm correspondência
  for (const log of auditLogs) {
    const name = cnpjMap.get(log.emitterCnpj!)
    console.log(`Protocolo: ${log.protocol} | CNPJ: ${log.emitterCnpj} | Nome: ${name || 'NÃO ENCONTRADO'}`)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
