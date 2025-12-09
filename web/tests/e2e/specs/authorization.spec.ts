import { test, expect } from '@playwright/test'
import { loginAsEmissor, loginAsReceptor, cleanupDatabase } from './utils/test-helpers'

test.describe('Testes de Autorização e Redirecionamento por Papel', () => {
  test.beforeAll(async () => {
    await cleanupDatabase()
  })

  test.describe('Usuário EMISSOR', () => {
    test('deve ser redirecionado para login ao tentar acessar rotas do receptor', async ({ page }) => {
      // Login como emissor
      await loginAsEmissor(page)

      // Tenta acessar rotas do receptor diretamente
      const receptorRoutes = [
        '/(receptor)/timeline',
        '/(receptor)/professionals',
        '/(receptor)/repository',
        '/(receptor)/calendar',
        '/(receptor)/notifications',
        '/(receptor)/dadospessoais'
      ]

      for (const route of receptorRoutes) {
        await page.goto(route)
        // Deve ser redirecionado para login
        await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
      }
    })

    test('deve conseguir acessar suas próprias rotas', async ({ page }) => {
      await loginAsEmissor(page)

      // Deve conseguir acessar rotas do emissor
      const emissorRoutes = [
        '/(emissor)/laudos',
        '/(emissor)/relatorios'
      ]

      for (const route of emissorRoutes) {
        await page.goto(route)
        // Deve permanecer logado e ver o sidebar do emissor
        await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
        await expect(page.getByText('Portal de Envio')).toBeVisible()
      }
    })

    test('deve ser redirecionado se tentar acessar página inicial do receptor', async ({ page }) => {
      await loginAsEmissor(page)

      // Tenta acessar a página inicial do receptor
      await page.goto('/(receptor)')

      // Deve ser redirecionado para login
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    })
  })

  test.describe('Usuário RECEPTOR', () => {
    test('deve ser redirecionado para login ao tentar acessar rotas do emissor', async ({ page }) => {
      // Login como receptor
      await loginAsReceptor(page)

      // Tenta acessar rotas do emissor diretamente
      const emissorRoutes = [
        '/(emissor)/laudos',
        '/(emissor)/relatorios'
      ]

      for (const route of emissorRoutes) {
        await page.goto(route)
        // Deve ser redirecionado para login
        await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
      }
    })

    test('deve conseguir acessar suas próprias rotas', async ({ page }) => {
      await loginAsReceptor(page)

      // Deve conseguir acessar rotas do receptor
      const receptorRoutes = [
        '/(receptor)/timeline',
        '/(receptor)/professionals',
        '/(receptor)/repository',
        '/(receptor)/calendar',
        '/(receptor)/notifications',
        '/(receptor)/dadospessoais'
      ]

      for (const route of receptorRoutes) {
        await page.goto(route)
        // Deve permanecer logado e ver o sidebar
        await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
        await expect(page.getByText('Timeline')).toBeVisible()
      }
    })

    test('deve ser redirecionado se tentar acessar página inicial do emissor', async ({ page }) => {
      await loginAsReceptor(page)

      // Tenta acessar a página inicial do emissor
      await page.goto('/(emissor)')

      // Deve ser redirecionado para login
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    })
  })

  test.describe('Usuário não autenticado', () => {
    test('deve ser redirecionado para login ao tentar acessar qualquer rota protegida', async ({ page }) => {
      const protectedRoutes = [
        '/laudos',
        '/relatorios',
        '/timeline',
        '/professionals',
        '/repository',
        '/calendar',
        '/notifications',
        '/dadospessoais'
      ]

      for (const route of protectedRoutes) {
        await page.goto(route)
        // Deve ser redirecionado para login
        await page.waitForURL('/login')
        await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
      }
    })
  })

  test.describe('Redirecionamento automático baseado no papel', () => {
    test('emissor deve ser redirecionado para suas rotas se tentar acessar receptor', async ({ page }) => {
      // Primeiro login como emissor
      await loginAsEmissor(page)

      // Logout
      await page.getByRole('button', { name: 'Sair' }).click()
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

      // Login como receptor
      await loginAsReceptor(page)

      // Agora tenta acessar rota do emissor
      await page.goto('/(emissor)/laudos')

      // Deve ser redirecionado para login
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    })

    test('receptor deve ser redirecionado para suas rotas se tentar acessar emissor', async ({ page }) => {
      // Primeiro login como receptor
      await loginAsReceptor(page)

      // Logout
      await page.getByRole('button', { name: 'Sair' }).click()
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()

      // Login como emissor
      await loginAsEmissor(page)

      // Agora tenta acessar rota do receptor
      await page.goto('/(receptor)/timeline')

      // Deve ser redirecionado para login
      await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
    })
  })
})
