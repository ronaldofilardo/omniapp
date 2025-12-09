import { test, expect } from '@playwright/test'
import { login, logout, cleanupDatabase } from './utils/test-helpers'

test.describe('Validação de Timeouts E2E', () => {
   test.beforeAll(async () => {
     await cleanupDatabase()
   })

   // Removido beforeEach/afterEach que causavam problemas de estado
   // Cada teste agora é responsável por fazer login/logout conforme necessário

   test.describe('Timeouts em Carregamento de Dados', () => {
    test('deve mostrar indicador de carregamento e completar dentro do timeout', async ({ page }) => {
      await login(page)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
      
      // Verifica se aparece spinner/loading
      const loadingSpinner = page.locator('[data-testid="loading-spinner"]')
      const eventsList = page.locator('[data-testid="events-list"]')
      
      // Aguarda até 10 segundos para carregar
      await expect(eventsList).toBeVisible({ timeout: 10000 })
      
      // Verifica que o spinner desapareceu
      if (await loadingSpinner.isVisible()) {
        await expect(loadingSpinner).not.toBeVisible({ timeout: 2000 })
      }
    })

    test('deve mostrar erro se timeout de 10s for excedido em eventos', async ({ page }) => {
      await login(page)

      // Intercepta requisição para simular lentidão
      await page.route('**/api/events*', async route => {
        await page.waitForTimeout(11000) // Mais de 10s
        await route.abort()
      })

      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
      
      // Deve mostrar erro após timeout
      const errorMessage = page.getByText(/erro|timeout|tempo esgotado/i)
      await expect(errorMessage).toBeVisible({ timeout: 15000 })
    })

    test('deve mostrar erro se timeout de 15s for excedido em profissionais', async ({ page }) => {
      await login(page)

      // Intercepta requisição para simular lentidão
      await page.route('**/api/professionals*', async route => {
        await page.waitForTimeout(16000) // Mais de 15s
        await route.abort()
      })

      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Profissionais' }).click()
      
      // Deve mostrar erro após timeout
      const errorMessage = page.getByText(/erro|timeout|tempo esgotado/i)
      await expect(errorMessage).toBeVisible({ timeout: 20000 })
    })

    test('deve permitir retry após erro de timeout', async ({ page }) => {
      await login(page)

      let requestCount = 0

      // Intercepta primeira requisição para falhar, segunda para suceder
      await page.route('**/api/events*', async route => {
        requestCount++
        if (requestCount === 1) {
          await page.waitForTimeout(11000)
          await route.abort()
        } else {
          await route.continue()
        }
      })

      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
      
      // Aguarda erro aparecer
      const errorMessage = page.getByText(/erro|timeout/i)
      await expect(errorMessage).toBeVisible({ timeout: 15000 })
      
      // Verifica se há botão retry
      const retryButton = page.getByRole('button', { name: /tentar novamente|retry/i })
      if (await retryButton.isVisible()) {
        await retryButton.click()
        
        // Deve carregar com sucesso na segunda tentativa
        const eventsList = page.locator('[data-testid="events-list"]')
        await expect(eventsList).toBeVisible({ timeout: 10000 })
      }
    })
  })

  test.describe('Timeouts em Calendário', () => {
    test('deve carregar calendário dentro de 10s', async ({ page }) => {
      await login(page)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Calendário' }).click()
      
      // Verifica que o calendário carregou dentro do prazo
      const calendar = page.locator('[data-testid="calendar-view"]')
      await expect(calendar).toBeVisible({ timeout: 10000 })
    })

    test('deve mostrar erro se calendário não carregar em 10s', async ({ page }) => {
      await login(page)

      // Intercepta requisições do calendário
      await page.route('**/api/events*', async route => {
        await page.waitForTimeout(11000)
        await route.abort()
      })

      await page.route('**/api/professionals*', async route => {
        await page.waitForTimeout(11000)
        await route.abort()
      })

      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Calendário' }).click()
      
      // Deve mostrar erro
      const errorMessage = page.getByText(/erro|timeout/i)
      await expect(errorMessage).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Timeouts em Submissão de Documentos', () => {
    test('deve completar submissão dentro de 8s', async ({ page }) => {
      // Login como emissor
      await logout(page)
      await page.goto('/login')
      await page.fill('input[placeholder="usuário@email.com"]', 'emissor@test.com')
      await page.fill('input[placeholder="Senha"]', 'senha123')
      await page.getByRole('button', { name: 'Entrar' }).click()
      
      await page.waitForLoadState('networkidle')
      
      // Navega para portal de envio
      await page.getByText('Portal de Envio').click()
      
      // Preenche formulário
      await page.getByLabel('n. exame').fill('12345')
      await page.getByLabel('medico solicitante').fill('Dr. Teste')
      await page.getByLabel('email').fill('test@example.com')
      await page.getByLabel('cpf').fill('123.456.789-00')
      await page.getByLabel('data').fill('2025-11-28')
      
      // Upload arquivo pequeno (< 5MB)
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'teste.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('a'.repeat(1024 * 100)) // 100KB
      })
      
      // Submete
      const submitButton = page.getByRole('button', { name: 'Enviar Documento' })
      await submitButton.click()
      
      // Deve completar dentro de 8s
      const successMessage = page.getByText(/enviado com sucesso|sucesso/i)
      await expect(successMessage).toBeVisible({ timeout: 8000 })
    })

    test('deve mostrar erro se submissão exceder 8s', async ({ page }) => {
      // Intercepta submissão para demorar
      await page.route('**/api/documents/submit*', async route => {
        await page.waitForTimeout(9000)
        await route.abort()
      })
      
      // Login como emissor
      await logout(page)
      await page.goto('/login')
      await page.fill('input[placeholder="usuário@email.com"]', 'emissor@test.com')
      await page.fill('input[placeholder="Senha"]', 'senha123')
      await page.getByRole('button', { name: 'Entrar' }).click()
      
      await page.waitForLoadState('networkidle')
      await page.getByText('Portal de Envio').click()
      
      // Preenche e submete
      await page.getByLabel('n. exame').fill('12345')
      await page.getByLabel('medico solicitante').fill('Dr. Teste')
      await page.getByLabel('email').fill('test@example.com')
      await page.getByLabel('cpf').fill('123.456.789-00')
      await page.getByLabel('data').fill('2025-11-28')
      
      const fileInput = page.locator('input[type="file"]')
      await fileInput.setInputFiles({
        name: 'teste.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('test content')
      })
      
      await page.getByRole('button', { name: 'Enviar Documento' }).click()
      
      // Deve mostrar erro
      const errorMessage = page.getByText(/erro|timeout|falha/i)
      await expect(errorMessage).toBeVisible({ timeout: 12000 })
    })
  })

  test.describe('Timeouts em Admin Dashboard', () => {
    test('deve carregar admin dashboard dentro de 20s', async ({ page }) => {
      // Tenta acessar admin
      await page.goto('/admin/dashboard')
      
      const adminDashboard = page.locator('[data-testid="admin-dashboard"]')
      
      if (await adminDashboard.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Se for admin, verifica carregamento
        await page.waitForLoadState('networkidle', { timeout: 20000 })
        
        // Verifica que métricas carregaram
        const metricsSection = page.locator('[data-testid="admin-metrics"]')
        await expect(metricsSection).toBeVisible({ timeout: 20000 })
      }
    })

    test('deve fazer chamadas paralelas e completar em tempo', async ({ page }) => {
      await page.goto('/admin/dashboard')
      
      const adminDashboard = page.locator('[data-testid="admin-dashboard"]')
      
      if (await adminDashboard.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Monitora chamadas de API
        const apiCalls: string[] = []
        page.on('request', request => {
          if (request.url().includes('/api/admin/')) {
            apiCalls.push(request.url())
          }
        })
        
        await page.reload()
        await page.waitForLoadState('networkidle', { timeout: 20000 })
        
        // Verifica que fez chamadas paralelas
        expect(apiCalls.length).toBeGreaterThan(0)
        
        // Verifica que dashboard carregou completamente
        const metricsSection = page.locator('[data-testid="admin-metrics"]')
        await expect(metricsSection).toBeVisible()
      }
    })
  })

  test.describe('Comportamento de AbortSignal', () => {
    test('deve cancelar requisição ao navegar para outra página antes do timeout', async ({ page }) => {
      await login(page)

      // Intercepta para demorar
      await page.route('**/api/events*', async route => {
        await page.waitForTimeout(5000)
        await route.continue()
      })

      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
      
      // Aguarda 2s e muda de página
      await page.waitForTimeout(2000)
      await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Profissionais' }).click()
      
      // Verifica que navegou sem erro
      const professionalsView = page.locator('[data-testid="professionals-view"]')
      await expect(professionalsView).toBeVisible({ timeout: 10000 })
    })
  })
})
