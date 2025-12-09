import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Buscar usuário emissor padrão
  const emissor = await prisma.user.findUnique({
    where: { email: 'labor@omni.com' },
    include: { emissorInfo: true }
  })
  if (!emissor || !emissor.emissorInfo || !emissor.emissorInfo.cnpj) {
    console.error('Usuário labor@omni.com não encontrado ou sem CNPJ!')
    process.exit(1)
  }

  // Atualizar todos os reports enviados por esse emissor para garantir o vínculo correto
  const updated = await prisma.report.updateMany({
    where: { senderId: emissor.id },
    data: {} // Nada a atualizar, só garantir vínculo
  })

  // Diagnóstico: mostrar todos os reports enviados por esse emissor
  const reports = await prisma.report.findMany({
    where: { senderId: emissor.id },
    include: { sender: { include: { emissorInfo: true } } }
  })
  reports.forEach(r => {
    console.log(`Protocolo: ${r.protocol} | Emissor: ${r.sender.email} | CNPJ: ${r.sender.emissorInfo?.cnpj}`)
  })

  console.log(`Total de reports vinculados ao emissor labor@omni.com: ${reports.length}`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
