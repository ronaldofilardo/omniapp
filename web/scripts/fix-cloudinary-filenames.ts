/**
 * Script para corrigir URLs de arquivos no Cloudinary
 * 
 * Problemas corrigidos:
 * 1. Extensão duplicada: "file.pdf.pdf" -> "file.pdf"
 * 2. PDFs usando /image/ em vez de /raw/
 * 3. Imagens usando /raw/ em vez de /image/
 * 
 * USO:
 *   NODE_ENV=production DATABASE_URL="sua-url" npx tsx scripts/fix-cloudinary-filenames.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Buscando arquivos com problemas no Cloudinary...\n')

  try {
    // Buscar arquivos do Cloudinary com possíveis problemas
    const files = await prisma.files.findMany({
      where: {
        OR: [
          // Extensão duplicada
          { url: { contains: '.pdf.pdf' } },
          // PDFs usando /image/ em vez de /raw/
          {
            AND: [
              { url: { contains: 'cloudinary.com' } },
              { url: { contains: '/image/' } },
              { url: { contains: '.pdf' } }
            ]
          },
          // Imagens usando /raw/ em vez de /image/
          {
            AND: [
              { url: { contains: 'cloudinary.com' } },
              { url: { contains: '/raw/' } },
              { 
                OR: [
                  { url: { contains: '.jpg' } },
                  { url: { contains: '.jpeg' } },
                  { url: { contains: '.png' } },
                  { url: { contains: '.gif' } },
                  { url: { contains: '.webp' } }
                ]
              }
            ]
          }
        ]
      }
    })

    console.log(`Encontrados ${files.length} arquivo(s) com problemas.\n`)

    if (files.length === 0) {
      console.log('✅ Nenhum arquivo com problemas encontrado!')
      return
    }

    let fixed = 0
    let errors = 0

    for (const file of files) {
      try {
        const oldUrl = file.url
        let newUrl = oldUrl

        // Corrigir extensão duplicada
        if (newUrl.includes('.pdf.pdf')) {
          newUrl = newUrl.replace(/\.pdf\.pdf$/i, '.pdf')
          console.log(`📝 Corrigindo extensão duplicada:`)
        }
        // Corrigir PDFs usando /image/ em vez de /raw/
        else if (newUrl.includes('.pdf') && newUrl.includes('/image/')) {
          newUrl = newUrl.replace('/image/', '/raw/')
          console.log(`📝 Corrigindo resource type de PDF (image -> raw):`)
        }
        // Corrigir imagens usando /raw/ em vez de /image/
        else if (newUrl.includes('/raw/') && !newUrl.includes('.pdf')) {
          newUrl = newUrl.replace('/raw/', '/image/')
          console.log(`📝 Corrigindo resource type de imagem (raw -> image):`)
        }

        if (oldUrl === newUrl) {
          console.log(`⏭️  Pulando arquivo (já está correto): ${file.name}`)
          continue
        }

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
