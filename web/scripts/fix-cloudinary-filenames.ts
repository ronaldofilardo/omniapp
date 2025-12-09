/**
 * Script para corrigir arquivos com extensão duplicada no Cloudinary
 * 
 * Problema: Alguns arquivos foram salvos como "file.pdf.pdf" no Cloudinary
 * Solução: Este script renomeia os arquivos removendo a extensão duplicada
 * 
 * USO:
 *   NODE_ENV=production DATABASE_URL="sua-url" npx tsx scripts/fix-cloudinary-filenames.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando arquivos com extensão duplicada no banco de dados...\n')

  try {
    // Buscar todos os arquivos
    const files = await prisma.files.findMany({
      where: {
        url: {
          contains: '.pdf.pdf'
        }
      }
    })

    console.log(`Encontrados ${files.length} arquivo(s) com extensão duplicada.\n`)

    if (files.length === 0) {
      console.log('✅ Nenhum arquivo com extensão duplicada encontrado!')
      return
    }

    let fixed = 0
    let errors = 0

    for (const file of files) {
      try {
        // Corrigir URL removendo extensão duplicada
        const oldUrl = file.url
        const newUrl = oldUrl.replace(/\.pdf\.pdf$/i, '.pdf')

        console.log(`📝 Corrigindo arquivo:`)
        console.log(`   ID: ${file.id}`)
        console.log(`   Nome: ${file.name}`)
        console.log(`   URL antiga: ${oldUrl}`)
        console.log(`   URL nova: ${newUrl}`)

        // Atualizar no banco
        await prisma.files.update({
          where: { id: file.id },
          data: { url: newUrl }
        })

        console.log(`   ✅ Atualizado com sucesso!\n`)
        fixed++

      } catch (error) {
        console.error(`   ❌ Erro ao corrigir arquivo ${file.id}:`, error)
        errors++
      }
    }

    console.log('\n📊 Resumo:')
    console.log(`   Total encontrados: ${files.length}`)
    console.log(`   Corrigidos: ${fixed}`)
    console.log(`   Erros: ${errors}`)

    if (errors === 0) {
      console.log('\n✅ Todos os arquivos foram corrigidos com sucesso!')
    } else {
      console.log(`\n⚠️  ${errors} arquivo(s) tiveram erro na correção.`)
    }

  } catch (error) {
    console.error('❌ Erro ao executar script:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
