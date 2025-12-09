import { test, expect, devices } from '@playwright/test'

const mobile = test.extend({
  ...devices['iPhone 8']
})

test.describe('Persistência de login no mobile', () => {
  test('deve manter usuário logado após refresh da página', async ({ page }) => {
    await page.goto('http://localhost:3000/')

    // Login manual (ajuste os seletores conforme necessário)
    await page.fill('input[placeholder="Digite seu e-mail"]', 'test@example.com')
    await page.fill('input[placeholder="Digite sua senha"]', 'senha123')
    await page.click('button:has-text("Entrar")')

    // Espera dashboard aparecer
    await expect(page.locator('text=Timeline')).toBeVisible()

    // Reload
    await page.reload()

    // Deve continuar logado
    await expect(page.locator('text=Timeline')).toBeVisible()
  })

  test('deve redirecionar para login se token expirar', async ({ page }) => {
    // Este teste simula token expirado
    await page.goto('http://localhost:3000/')
    
    // Simular token expirado via localStorage
    await page.evaluate(() => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    })
    
    
    await page.reload()
    
    // Deve redirecionar para login
    await expect(page.locator('input[placeholder="Digite seu e-mail"]')).toBeVisible()
  })
  test('deve manter estado do usuário em abas diferentes', async ({ browser }) => {
    const context = await browser.newContext()
    const page1 = await context.newPage()
    const page2 = await context.newPage()

    // Login na primeira aba
    await page1.goto('http://localhost:3000/')
    await page1.fill('input[placeholder="Digite seu e-mail"]', 'test@example.com')
    await page1.fill('input[placeholder="Digite sua senha"]', 'senha123')
    await page1.click('button:has-text("Entrar")')
    await expect(page1.locator('text=Timeline')).toBeVisible()

    // Verificar se segunda aba também está logada
    await page2.goto('http://localhost:3000/')
    await expect(page2.locator('text=Timeline')).toBeVisible()

    await context.close()
  })
})
