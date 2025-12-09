// Script para corrigir o campo 'files' da tabela health_events
// Garante que todos os registros tenham files como string JSON válida

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const events = await prisma.healthEvent.findMany({
    select: { id: true, files: true },
  })

  for (const event of events) {
    let needsUpdate = false
    let filesField: any = event.files
    if (Array.isArray(filesField)) {
      // Se for array JS, transforma em string JSON
      filesField = JSON.stringify(filesField)
      needsUpdate = true
    } else if (typeof filesField === 'string') {
      try {
        JSON.parse(filesField)
      } catch {
        // Tenta eval para array JS salvo como string
        try {
          // eslint-disable-next-line no-eval
          const arr = eval(filesField)
          if (Array.isArray(arr)) {
            filesField = JSON.stringify(arr)
            needsUpdate = true
          }
        } catch {
          // Se não conseguir, zera
          filesField = '[]'
          needsUpdate = true
        }
      }
    } else {
      filesField = '[]'
      needsUpdate = true
    }
    if (needsUpdate) {
      await prisma.healthEvent.update({
        where: { id: event.id },
        data: { files: filesField },
      })
      console.log(`Corrigido evento ${event.id}`)
    }
  }
  console.log('Correção concluída!')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => prisma.$disconnect())
