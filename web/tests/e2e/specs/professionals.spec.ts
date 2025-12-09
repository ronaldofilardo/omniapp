import { test, expect } from '@playwright/test'
import { login, logout, cleanupDatabase } from './utils/test-helpers'

test.describe('Fluxo de Profissionais', () => {
   test.beforeAll(async () => {
     await cleanupDatabase()
   })

   // Removido beforeEach/afterEach que causavam problemas de estado
   // Cada teste agora é responsável por fazer login/logout conforme necessário

   test('deve criar, editar e excluir um profissional', async ({ page }) => {
     await login(page)
     // ...existing code...

    // Atualiza os dados
    await page.getByLabel('Nome').fill('Dr. Teste Atualizado')
    await page.getByRole('button', { name: 'Salvar' }).click()

    // Verifica se foi atualizado
    await expect(page.getByText('Dr. Teste Atualizado')).toBeVisible()

    // Exclui o profissional
    await page.getByText('Dr. Teste Atualizado').click()
    await page.getByRole('button', { name: 'Excluir' }).click()
    await page.getByRole('button', { name: /Sair sem salvar|Confirmar/i }).click()

    // Verifica se foi excluído
    await expect(page.getByText('Dr. Teste Atualizado')).not.toBeVisible()
  })

  test('deve validar campos obrigatórios ao criar profissional', async ({ page }) => {
    await login(page)
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Profissionais' }).click()
    await page.locator('[data-testid="professionals-tab"]').getByRole('button', { name: 'Adicionar Profissional' }).click()

    // Tenta salvar sem preencher os campos
    await page.locator('[data-testid="add-professional-modal"]').getByRole('button', { name: 'Salvar' }).click()

    // Verifica as mensagens de erro (ajustar conforme implementação real)
    await expect(page.getByText('Por favor, preencha o nome do profissional.')).toBeVisible()
    await expect(page.getByText('Por favor, selecione uma especialidade.')).toBeVisible()
  })
})
