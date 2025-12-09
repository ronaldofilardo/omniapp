import { test, expect } from '@playwright/test'
import { loginAsEmissor, logout, cleanupDatabase } from './utils/test-helpers'

test.describe('Fluxo de Usuário Emissor', () => {
   test.beforeAll(async () => {
     await cleanupDatabase()
   })

   // Removido beforeEach/afterEach que causavam problemas de estado
   // Cada teste agora é responsável por fazer login/logout conforme necessário

   test('deve mostrar apenas abas específicas do emissor no sidebar', async ({ page }) => {
     await loginAsEmissor(page)
     // ...existing code...
  })

  test('deve navegar para Portal de envio e mostrar formulário', async ({ page }) => {
    await loginAsEmissor(page)
    // ...existing code...
    await expect(page.getByText('n. exame')).toBeVisible()
    await expect(page.getByText('medico solicitante')).toBeVisible()
    await expect(page.getByText('email')).toBeVisible()
    await expect(page.getByText('cpf')).toBeVisible()
    await expect(page.getByText('arquivo')).toBeVisible()
    await expect(page.getByText('data')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar Documento' })).toBeVisible()
  })

  test('deve navegar para Relatório e mostrar dashboard de laudos', async ({ page }) => {
    await loginAsEmissor(page)
    // Clica na aba Relatórios
    await page.getByText('Relatórios').click()

    // Verifica se navegou para a página correta
    await page.waitForURL('/relatorios')
    await expect(page.getByText('Relatórios')).toBeVisible()
    await expect(page.getByText('Laudos')).toBeVisible()

    // Verifica cabeçalhos da tabela
    await expect(page.getByText('Protocolo')).toBeVisible()
    await expect(page.getByText('Arquivo')).toBeVisible()
    await expect(page.getByText('Destinatário')).toBeVisible()
    await expect(page.getByText('Data de Envio')).toBeVisible()
    await expect(page.getByText('Data de Recebimento')).toBeVisible()
    await expect(page.getByText('Status')).toBeVisible()

    // Verifica que não há as colunas removidas
    await expect(page.getByText('Título')).not.toBeVisible()
    await expect(page.getByText('Emissor')).not.toBeVisible()
    await expect(page.getByText('Data de Visualização')).not.toBeVisible()
  })

  test('deve redirecionar emissor tentando acessar rotas do receptor', async ({ page }) => {
    await loginAsEmissor(page)
    // Tenta acessar diretamente uma rota do receptor
    await page.goto('/timeline')

    // Deve ser redirecionado para login (já que emissor não tem acesso)
    await page.waitForURL('/login')
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })

  test('deve manter usuário emissor logado após reload', async ({ page }) => {
    await loginAsEmissor(page)
    // Verifica que está logado como emissor
    await expect(page.getByText('Portal de Envio')).toBeVisible()

    // Reload da página
    await page.reload()

    // Deve continuar logado e manter as abas do emissor
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    await expect(page.getByText('Portal de Envio')).toBeVisible()
    await expect(page.getByText('Relatórios')).toBeVisible()
  })
})
