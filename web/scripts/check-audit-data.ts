import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Verificando dados de AuditLog...\n')

  // Buscar alguns audit logs
  const auditLogs = await prisma.auditLog.findMany({
    take: 10,
    orderBy: {
      createdAt: 'desc'
    }
  })

  console.log(`Total de registros: ${auditLogs.length}\n`)

  auditLogs.forEach((log, idx) => {
    console.log(`\n--- Registro ${idx + 1} ---`)
    console.log(`Protocolo: ${log.protocol || 'NULL'}`)
    console.log(`Emissor CNPJ: ${log.emitterCnpj || 'NULL'}`)
    console.log(`Paciente: ${log.patientName || 'NULL'}`)
    console.log(`Receptor CPF: ${log.receiverCpf}`)
    console.log(`Arquivo: ${log.fileName}`)
    console.log(`Status: ${log.status}`)
    console.log(`Origin: ${log.origin}`)
  })

  // Buscar reports
  console.log('\n\n=== Verificando Reports ===\n')
  const reports = await prisma.report.findMany({
    take: 10,
    include: {
      sender: {
        include: {
          emissorInfo: true
        }
      }
    },
    orderBy: {
      sentAt: 'desc'
    }
  })

  console.log(`Total de reports: ${reports.length}\n`)

  reports.forEach((report, idx) => {
    console.log(`\n--- Report ${idx + 1} ---`)
    console.log(`Protocolo: ${report.protocol}`)
    console.log(`Sender Name: ${report.sender.name}`)
    console.log(`Sender Email: ${report.sender.email}`)
    console.log(`Sender CNPJ: ${report.sender.emissorInfo?.cnpj || 'NULL'}`)
    console.log(`Sender Clinic Name: ${report.sender.emissorInfo?.clinicName || 'NULL'}`)
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
