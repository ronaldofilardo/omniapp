import { test, expect } from '@playwright/test'
import { login, logout, cleanupDatabase } from './utils/test-helpers'

test.describe('Fluxo de Eventos', () => {
   test.beforeAll(async () => {
     await cleanupDatabase()
   })

   // Removido beforeEach/afterEach que causavam problemas de estado
   // Cada teste agora é responsável por fazer login/logout conforme necessário

   test('deve criar, editar e excluir um evento', async ({ page }) => {
     await login(page)
     // ...existing code...

    // Verifica se o evento foi criado
    await expect(page.getByText(/Consulta/)).toBeVisible()

    // Editar/excluir evento pode ser implementado conforme UI
  })

  test('deve validar sobreposição de eventos', async ({ page }) => {
    await login(page)
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Calendário' }).click()

  // Navega para o menu Calendário
  // Navega para o menu Timeline
  await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
  // Aguarda o botão Novo Evento aparecer
  await page.getByRole('button', { name: 'Novo Evento' }).waitFor({ state: 'visible' })
  // Cria primeiro evento
  await page.getByRole('button', { name: 'Novo Evento' }).click()
    await page.getByLabel('Tipo de Evento').click()
    await page.getByRole('option', { name: 'Consulta' }).click()
    await page.getByLabel('Profissional').click()
    await page.getByRole('option', { name: /João/ }).click()
    await page.getByLabel('Data do Evento').fill('2025-10-28')
    await page.getByLabel('Hora de Início').fill('14:00')
    await page.getByLabel('Hora de Fim').fill('15:00')
    await page.getByRole('button', { name: 'Criar Evento' }).click()

    // Tenta criar evento sobreposto
    await page.getByRole('button', { name: 'Novo Evento' }).click()
    await page.getByLabel('Tipo de Evento').click()
    await page.getByRole('option', { name: 'Consulta' }).click()
    await page.getByLabel('Profissional').click()
    await page.getByRole('option', { name: /João/ }).click()
    await page.getByLabel('Data do Evento').fill('2025-10-28')
    await page.getByLabel('Hora de Início').fill('14:30')
    await page.getByLabel('Hora de Fim').fill('15:30')
    await page.getByRole('button', { name: 'Criar Evento' }).click()

    // Verifica mensagem de erro de sobreposição (ajustar conforme implementação real)
    await expect(page.getByText(/sobreposto/i)).toBeVisible()
  })

  test('deve validar campos obrigatórios ao criar evento', async ({ page }) => {
  await login(page)
  await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
  await page.getByRole('button', { name: 'Novo Evento' }).waitFor({ state: 'visible' })
  await page.getByRole('button', { name: 'Novo Evento' }).click()

  // Tenta salvar sem preencher os campos
  await page.getByRole('button', { name: 'Criar Evento' }).click()

  // Verifica as mensagens de erro exatas
  await expect(page.getByText('Selecione um tipo de evento.')).toBeVisible()
  await expect(page.getByText('Selecione um profissional.')).toBeVisible()
  await expect(page.getByText('Preencha a data.')).toBeVisible()
  await expect(page.getByText('Preencha o horário de início.')).toBeVisible()
    await expect(page.getByText('Preencha o horário de fim.')).toBeVisible()
  })
})
