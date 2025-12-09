// Armazenamento temporário para compartilhamentos (em produção, usar Redis ou banco)
export const shareStore = new Map<string, { files: string[], accessCode: string, used: boolean, expiresAt: number }>()

// Limpar compartilhamentos expirados (executar periodicamente)
export function cleanupExpiredShares() {
  const now = Date.now()
  for (const [token, data] of shareStore.entries()) {
    if (data.expiresAt < now) {
      shareStore.delete(token)
    }
  }
}

// Executar limpeza apenas quando necessário (lazy cleanup)
let lastCleanup = 0
const CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour

export function lazyCleanupExpiredShares() {
  const now = Date.now()
  if (now - lastCleanup > CLEANUP_INTERVAL) {
    cleanupExpiredShares()
    lastCleanup = now
  }
}

// Auto cleanup on access instead of polling
const originalGet = shareStore.get
shareStore.get = function(key: string) {
  lazyCleanupExpiredShares()
  return originalGet.call(this, key)
}
