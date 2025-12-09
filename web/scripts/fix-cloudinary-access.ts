/**
 * Script para tornar arquivos existentes do Cloudinary públicos
 * 
 * Problema: Arquivos foram salvos como privados e retornam 401 (deny or ACL failure)
 * Solução: Este script atualiza o access_mode dos arquivos para 'public'
 * 
 * USO:
 *   NODE_ENV=production DATABASE_URL="sua-url" npx tsx scripts/fix-cloudinary-access.ts
 */

import { v2 as cloudinary } from 'cloudinary'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

async function makePublic(publicId: string, resourceType: 'image' | 'raw'): Promise<boolean> {
  try {
    console.log(`   Tentando tornar público: ${publicId} (${resourceType})`)
    
    // Usar API de atualização explícita
    await cloudinary.api.update(publicId, {
      resource_type: resourceType,
      access_mode: 'public',
      type: 'upload'
    })
    
    console.log(`   ✅ Sucesso!`)
    return true
  } catch (error: any) {
    console.error(`   ❌ Erro:`, error?.message || error)
    return false
  }
}

async function main() {
  console.log('🔍 Buscando arquivos do Cloudinary no banco de dados...\n')

  try {
    // Verificar se credenciais estão configuradas
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      console.error('❌ Credenciais do Cloudinary não configuradas!')
      console.error('Configure: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET')
      process.exit(1)
    }

    // Buscar todos os arquivos do Cloudinary
    const files = await prisma.files.findMany({
      where: {
        url: {
          contains: 'cloudinary.com'
        }
      }
    })

    console.log(`Encontrados ${files.length} arquivo(s) do Cloudinary.\n`)

    if (files.length === 0) {
      console.log('✅ Nenhum arquivo do Cloudinary encontrado!')
      return
    }

    let success = 0
    let errors = 0
    let skipped = 0

    for (const file of files) {
      try {
        console.log(`\n📝 Processando arquivo:`)
        console.log(`   ID: ${file.id}`)
        console.log(`   Nome: ${file.name}`)
        console.log(`   URL: ${file.url}`)

        // Extrair public_id da URL
        // Formato: https://res.cloudinary.com/{cloud}/raw/upload/v{version}/{folder}/{id}.pdf
        const urlMatch = file.url.match(/\/(?:raw|image)\/upload\/(?:v\d+\/)?(.+)/)
        
        if (!urlMatch) {
          console.log(`   ⏭️  Não foi possível extrair public_id da URL`)
          skipped++
          continue
        }

        const publicId = urlMatch[1]
        
        // Detectar resource_type
        const isPdf = file.url.includes('.pdf') || file.url.includes('/raw/')
        const resourceType: 'image' | 'raw' = isPdf ? 'raw' : 'image'

        console.log(`   Public ID: ${publicId}`)
        console.log(`   Resource Type: ${resourceType}`)

        // Tornar público
        const result = await makePublic(publicId, resourceType)
        
        if (result) {
          success++
        } else {
          errors++
        }

      } catch (error) {
        console.error(`   ❌ Erro ao processar arquivo ${file.id}:`, error)
        errors++
      }
    }

    console.log('\n📊 Resumo:')
    console.log(`   Total encontrados: ${files.length}`)
    console.log(`   Tornados públicos: ${success}`)
    console.log(`   Erros: ${errors}`)
    console.log(`   Pulados: ${skipped}`)

    if (errors === 0 && skipped === 0) {
      console.log('\n✅ Todos os arquivos foram atualizados com sucesso!')
    } else if (errors > 0) {
      console.log(`\n⚠️  ${errors} arquivo(s) tiveram erro.`)
    }

  } catch (error) {
    console.error('❌ Erro ao executar script:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
