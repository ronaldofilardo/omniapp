import { test, expect } from '@playwright/test'
import { login, logout, cleanupDatabase } from './utils/test-helpers'

const mockDoctorName = 'Dr. Teste E2E'

test('deve criar profissional ao criar evento via laudo', async ({ page }) => {
  await cleanupDatabase()
  await login(page)

  // 1. Navegar para Central de Notificações
  await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Notificações' }).click()

  // 2. Criar novo evento a partir do laudo
  await page.getByRole('button', { name: 'Criar novo evento' }).click()

  // 3. Preencher o formulário do modal
  await page.getByLabel('Título').fill('Laudo: teste-e2e.jpg')
  // O campo médico solicitante já vem preenchido
  await page.getByLabel('Data do exame').fill('2025-11-01')
  await page.getByLabel('Início').fill('09:00')
  await page.getByLabel('Fim').fill('09:30')

  // 4. Criar o evento
  await page.getByRole('button', { name: 'Criar Evento' }).click()

  // 5. Verificar se o profissional foi criado na aba Profissionais
  await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Profissionais' }).click()
  await expect(page.getByText(mockDoctorName)).toBeVisible()

  // 6. Verificar se o evento aparece na timeline com o nome do profissional
  await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
  await expect(page.getByText(mockDoctorName)).toBeVisible()

  // 7. Verificar o card do evento
  const eventCard = page.locator('[data-testid="timeline-event-card"]').filter({ hasText: mockDoctorName })
  await expect(eventCard).toBeVisible()
  await expect(eventCard).toContainText('EXAME')

  await logout(page)
})
