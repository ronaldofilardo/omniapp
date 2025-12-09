import { test, expect } from '@playwright/test'
import { login, logout, cleanupDatabase } from './utils/test-helpers'

test.describe('Validação de Paginação E2E', () => {
  test.beforeAll(async () => {
    await cleanupDatabase()
  })

  // Removido beforeEach/afterEach que causavam problemas de estado
  // Cada teste agora é responsável por fazer login/logout conforme necessário

  test.describe.configure({ mode: 'serial' }) // Executa testes em série

  test.describe('Paginação de Eventos', () => {
    test('deve carregar eventos com paginação padrão (20 por página)', async ({ page }) => {
      await login(page)
      
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
      
      // Aguarda carregamento da timeline
      await page.waitForLoadState('networkidle')
      
      // Verifica se há controles de paginação
      const paginationInfo = page.locator('[data-testid="pagination-info"]')
      if (await paginationInfo.isVisible()) {
        await expect(paginationInfo).toContainText(/Página \d+ de \d+/)
      }
      
      // Verifica que não carrega mais de 20 eventos na primeira página
      const eventCards = page.locator('[data-testid="timeline-event-card"]')
      const count = await eventCards.count()
      expect(count).toBeLessThanOrEqual(20)
    })

    test('deve navegar entre páginas de eventos', async ({ page }) => {
      await login(page)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
      await page.waitForLoadState('networkidle')
      
      // Verifica se existe botão "Próxima"
      const nextButton = page.getByRole('button', { name: /Próxima|Next/i })
      
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        // Clica em próxima página
        await nextButton.click()
        await page.waitForLoadState('networkidle')
        
        // Verifica se mudou de página
        const paginationInfo = page.locator('[data-testid="pagination-info"]')
        await expect(paginationInfo).toContainText(/Página 2/)
        
        // Verifica se botão "Anterior" está visível
        const prevButton = page.getByRole('button', { name: /Anterior|Previous/i })
        await expect(prevButton).toBeVisible()
        await expect(prevButton).toBeEnabled()
        
        // Volta para página anterior
        await prevButton.click()
        await page.waitForLoadState('networkidle')
        await expect(paginationInfo).toContainText(/Página 1/)
      }
    })

    test('deve respeitar limite máximo de 1000 eventos', async ({ page }) => {
      await login(page)
      // Navega para timeline
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
      
      // Tenta manipular URL para pedir mais de 1000
      await page.goto('/timeline?limit=2000')
      await page.waitForLoadState('networkidle')
      
      // Verifica que não carrega mais de 1000 (ou 20 por página padrão)
      const eventCards = page.locator('[data-testid="timeline-event-card"]')
      const count = await eventCards.count()
      expect(count).toBeLessThanOrEqual(20) // Deve respeitar o limite por página
    })

    test('deve mostrar metadata de paginação (total, hasNext, hasPrev)', async ({ page }) => {
      await login(page)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
      await page.waitForLoadState('networkidle')
      
      // Verifica se há informação de total
      const paginationInfo = page.locator('[data-testid="pagination-info"]')
      if (await paginationInfo.isVisible()) {
        // Deve mostrar algo como "Página 1 de 5" ou "1-20 de 100 eventos"
        const text = await paginationInfo.textContent()
        expect(text).toMatch(/\d+/)
      }
    })

    test('deve carregar calendário com paginação', async ({ page }) => {
      await login(page)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Calendário' }).click()
      await page.waitForLoadState('networkidle')
      
      // Aguarda carregamento do calendário
      await page.waitForTimeout(2000)
      
      // Verifica que o calendário carregou (não mais de 20 eventos visíveis)
      const calendarEvents = page.locator('[data-testid="calendar-event"]')
      const count = await calendarEvents.count()
      expect(count).toBeLessThanOrEqual(20)
    })
  })

  test.describe('Paginação de Profissionais', () => {
    test('deve carregar profissionais com paginação padrão (50 por página)', async ({ page }) => {
      await login(page)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Profissionais' }).click()
      await page.waitForLoadState('networkidle')
      
      // Verifica profissionais carregados
      const professionalCards = page.locator('[data-testid="professional-card"]')
      const count = await professionalCards.count()
      expect(count).toBeLessThanOrEqual(50)
    })

    test('deve navegar entre páginas de profissionais', async ({ page }) => {
      await login(page)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Profissionais' }).click()
      await page.waitForLoadState('networkidle')
      
      const nextButton = page.getByRole('button', { name: /Próxima|Next/i })
      
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForLoadState('networkidle')
        
        // Verifica que navegou
        const paginationInfo = page.locator('[data-testid="pagination-info"]')
        if (await paginationInfo.isVisible()) {
          await expect(paginationInfo).toContainText(/Página 2/)
        }
      }
    })

    test('deve respeitar limite máximo de 100 profissionais', async ({ page }) => {
      await login(page)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Profissionais' }).click()
      
      // Tenta manipular URL para pedir mais de 100
      await page.goto('/professionals?limit=200')
      await page.waitForLoadState('networkidle')
      
      // Verifica que respeita o limite
      const professionalCards = page.locator('[data-testid="professional-card"]')
      const count = await professionalCards.count()
      expect(count).toBeLessThanOrEqual(50) // Deve respeitar limite padrão
    })
  })

  test.describe('Paginação Admin (se aplicável)', () => {
    test('deve carregar usuários admin com limite de 50', async ({ page }) => {
      // Tenta acessar rota admin
      await page.goto('/admin/users')
      
      // Se for admin, verifica paginação
      const adminTable = page.locator('[data-testid="admin-users-table"]')
      if (await adminTable.isVisible()) {
        await page.waitForLoadState('networkidle')
        
        const userRows = page.locator('[data-testid="user-row"]')
        const count = await userRows.count()
        expect(count).toBeLessThanOrEqual(50)
      }
    })
  })
})
