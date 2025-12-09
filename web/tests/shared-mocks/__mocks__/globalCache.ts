import { vi } from 'vitest'

export const globalCache = {
  get: vi.fn(),
  set: vi.fn(),
  isStale: vi.fn(),
  fetchWithDeduplication: vi.fn(),
  invalidate: vi.fn(),
  clear: vi.fn(),
  cleanup: vi.fn()
}
