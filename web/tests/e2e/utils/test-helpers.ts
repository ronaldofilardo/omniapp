import { Page } from '@playwright/test'

export async function login(page: Page) {
  await page.goto('http://localhost:3000/')
  await page.fill('input[placeholder="Digite seu e-mail"]', 'receptor1@example.com')
  await page.fill('input[placeholder="Digite sua senha"]', 'senha123')
  await page.click('button:has-text("Entrar")')
}

export async function logout(page: Page) {
  // Implementar logout
  await page.evaluate(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  })
  await page.goto('http://localhost:3000/')
}

export async function cleanupDatabase() {
  // Implementar limpeza do banco de dados de teste
  console.log('Database cleanup executed')
}

export async function loginAsEmissor(page: Page) {
  await page.goto('http://localhost:3000/')
  await page.fill('input[placeholder="Digite seu e-mail"]', 'emissor1@example.com')
  await page.fill('input[placeholder="Digite sua senha"]', 'senha123')
  await page.click('button:has-text("Entrar")')
}

export async function loginAsReceptor(page: Page) {
  await page.goto('http://localhost:3000/')
  await page.fill('input[placeholder="Digite seu e-mail"]', 'receptor2@example.com')
  await page.fill('input[placeholder="Digite sua senha"]', 'senha123')
  await page.click('button:has-text("Entrar")')
}
