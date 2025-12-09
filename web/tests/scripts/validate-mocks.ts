/**
 * Script para validar a configuração de mocks
 * Execute: ts-node tests/scripts/validate-mocks.ts
 */

import { mockPrisma } from '../__mocks__/global'
import { testDataFactory } from '../setup/test-factories'
import { mockDeep } from 'vitest-mock-extended'
import type { PrismaClient } from '@prisma/client'

console.log('🔍 Validando configuração de mocks...\n')

// 1. Validar vitest-mock-extended
console.log('1. ✅ vitest-mock-extended instalado')
const testMock = mockDeep<PrismaClient>()
console.log('   Mock profundo criado com sucesso\n')

// 2. Validar mockPrisma global
console.log('2. ✅ mockPrisma global disponível')
console.log(`   Tabelas mockadas: ${Object.keys(mockPrisma).length}`)
console.log('   Exemplos:', Object.keys(mockPrisma).slice(0, 5).join(', '), '...\n')

// 3. Validar factories
console.log('3. ✅ Test factories disponíveis')

const user = testDataFactory.user.build()
console.log('   User factory:', {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
})

const event = testDataFactory.healthEvent.consulta()
console.log('   HealthEvent factory:', {
  id: event.id,
  type: event.type,
  title: event.title,
})

const professional = testDataFactory.professional.cardiologista()
console.log('   Professional factory:', {
  id: professional.id,
  name: professional.name,
  specialty: professional.specialty,
})

const notification = testDataFactory.notification.unread()
console.log('   Notification factory:', {
  id: notification.id,
  read: notification.status === 'READ',
  type: notification.type,
})

console.log('\n4. ✅ Factories com buildMany')
const users = testDataFactory.user.buildMany(3)
console.log(`   Criados ${users.length} usuários`)

const events = testDataFactory.healthEvent.buildMany(5)
console.log(`   Criados ${events.length} eventos`)

console.log('\n5. ✅ Factories com overrides')
const adminUser = testDataFactory.user.admin({ name: 'Custom Admin' })
console.log('   Admin customizado:', {
  name: adminUser.name,
  role: adminUser.role,
})

const exame = testDataFactory.healthEvent.exame({ date: new Date('2025-12-10') })
console.log('   Exame customizado:', {
  type: exame.type,
  date: exame.date,
})

console.log('\n✅ Todas as validações passaram!')
console.log('\n📚 Próximos passos:')
console.log('   - Consulte GUIA_BOAS_PRATICAS_MOCKS.md')
console.log('   - Veja exemplos em unit/examples/')
console.log('   - Execute: pnpm test\n')
