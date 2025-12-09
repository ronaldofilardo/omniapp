/**
 * Setup específico para jest-dom matchers
 * Configuração isolada para testing-library matchers
 */
import '@testing-library/jest-dom'
import { expect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)
