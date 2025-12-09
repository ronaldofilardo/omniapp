import { prisma } from '@/lib/prisma'
import { calculateFileHashFromBuffer } from '@/lib/utils/fileHashServer'
import { promises as fs } from 'fs'
import path from 'path'

export interface FileIntegrityResult {
  isValid: boolean
  storedHash: string | null
  calculatedHash: string | null
  error?: string
}

/**
 * Verifica a integridade de um arquivo comparando o hash armazenado com o hash atual
 * Essencial para detectar modificações não autorizadas em arquivos médicos
 */
export async function verifyFileIntegrity(fileId: string): Promise<FileIntegrityResult> {
  try {
    // Buscar informações do arquivo no banco
    const fileRecord = await prisma.files.findUnique({
      where: { id: fileId },
      select: {
        fileHash: true,
        physicalPath: true,
        name: true,
      }
    })

    if (!fileRecord) {
      return {
        isValid: false,
        storedHash: null,
        calculatedHash: null,
        error: 'Arquivo não encontrado no banco de dados'
      }
    }

    if (!fileRecord.fileHash) {
      return {
        isValid: false,
        storedHash: null,
        calculatedHash: null,
        error: 'Hash não foi calculado para este arquivo'
      }
    }

    // Verificar se arquivo físico existe
    const fullPath = fileRecord.physicalPath
    try {
      await fs.access(fullPath)
    } catch {
      return {
        isValid: false,
        storedHash: fileRecord.fileHash,
        calculatedHash: null,
        error: 'Arquivo físico não encontrado no storage'
      }
    }

    // Calcular hash atual do arquivo
    const fileBuffer = await fs.readFile(fullPath)
    const currentHash = calculateFileHashFromBuffer(fileBuffer)

    const isValid = currentHash === fileRecord.fileHash

    return {
      isValid,
      storedHash: fileRecord.fileHash,
      calculatedHash: currentHash,
      error: isValid ? undefined : 'Hash não confere - arquivo pode ter sido modificado'
    }

  } catch (error) {
    console.error('[FILE INTEGRITY CHECK ERROR]', {
      fileId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })

    return {
      isValid: false,
      storedHash: null,
      calculatedHash: null,
      error: `Erro ao verificar integridade: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
    }
  }
}

/**
 * Verifica a integridade de múltiplos arquivos
 * Útil para verificações em lote ou auditorias periódicas
 */
export async function verifyMultipleFileIntegrity(fileIds: string[]): Promise<Record<string, FileIntegrityResult>> {
  const results: Record<string, FileIntegrityResult> = {}
  
  // Processar arquivos em paralelo (mas limitado para não sobrecarregar)
  const batchSize = 5
  for (let i = 0; i < fileIds.length; i += batchSize) {
    const batch = fileIds.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (fileId) => {
      const result = await verifyFileIntegrity(fileId)
      return { fileId, result }
    })
    
    const batchResults = await Promise.all(batchPromises)
    
    for (const { fileId, result } of batchResults) {
      results[fileId] = result
    }
  }
  
  return results
}

/**
 * Auditoria de integridade para todos os arquivos de um usuário
 * Importante para relatórios de conformidade
 */
export async function auditUserFilesIntegrity(userId: string): Promise<{
  totalFiles: number
  validFiles: number
  invalidFiles: number
  errorFiles: number
  details: Record<string, FileIntegrityResult>
}> {
  try {
    // Buscar todos os arquivos do usuário
    const userFiles = await prisma.files.findMany({
      where: {
        OR: [
          { health_events: { userId } },
          { professionals: { userId } }
        ]
      },
      select: { id: true }
    })

    const fileIds = userFiles.map(f => f.id)
    const results = await verifyMultipleFileIntegrity(fileIds)

    let validFiles = 0
    let invalidFiles = 0
    let errorFiles = 0

    for (const result of Object.values(results)) {
      if (result.error) {
        errorFiles++
      } else if (result.isValid) {
        validFiles++
      } else {
        invalidFiles++
      }
    }

    return {
      totalFiles: fileIds.length,
      validFiles,
      invalidFiles,
      errorFiles,
      details: results
    }

  } catch (error) {
    console.error('[USER FILES INTEGRITY AUDIT ERROR]', {
      userId,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    })

    return {
      totalFiles: 0,
      validFiles: 0,
      invalidFiles: 0,
      errorFiles: 1,
      details: {}
    }
  }
}

/**
 * Verifica integridade durante download de arquivo
 * Garante que o arquivo não foi corrompido desde o upload
 */
export async function verifyFileIntegrityForDownload(fileId: string): Promise<{
  isValid: boolean
  shouldProceed: boolean
  message: string
}> {
  const integrity = await verifyFileIntegrity(fileId)
  
  if (integrity.error) {
    return {
      isValid: false,
      shouldProceed: false,
      message: `Erro na verificação de integridade: ${integrity.error}`
    }
  }
  
  if (!integrity.isValid) {
    return {
      isValid: false,
      shouldProceed: false,
      message: 'Arquivo foi modificado e pode não ser íntegro. Download bloqueado por segurança.'
    }
  }
  
  return {
    isValid: true,
    shouldProceed: true,
    message: 'Arquivo íntegro - download autorizado'
  }
}