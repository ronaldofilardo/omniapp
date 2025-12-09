import { Page, expect } from '@playwright/test'

export async function login(page: Page, email = 'test@example.com', password = 'password123') {
  console.log(`[Login] Tentando login com: ${email}`)
  
  // Garante que está na página de login
  const currentUrl = page.url()
  if (!currentUrl.includes('/login')) {
    await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 30000 })
  }
  console.log('[Login] Página de login carregada')
  
  // Aguarda a página de login carregar
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible({ timeout: 15000 })
  console.log('[Login] Botão Entrar visível')
  
  // Preenche as credenciais na tela de login
  await page.getByPlaceholder('Digite seu e-mail').fill(email)
  await page.getByPlaceholder('Digite sua senha').fill(password)
  console.log('[Login] Credenciais preenchidas')
  
  // Clica no botão de login
  await page.getByRole('button', { name: 'Entrar' }).click()
  console.log('[Login] Clicou em Entrar')
  
  // Aguarda alguns segundos e verifica se há erro ou sucesso
  await page.waitForTimeout(3000)
  
  // Verifica se há mensagem de erro
  const errorMessage = await page.locator('text=/erro|inválid|proibid|confirmar/i').textContent().catch(() => null)
  if (errorMessage) {
    console.log(`[Login] Erro encontrado: ${errorMessage}`)
    throw new Error(`Login falhou: ${errorMessage}`)
  }
  
  // Aguarda redirecionamento - aceita qualquer rota que não seja /login
  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 })
  console.log(`[Login] Redirecionado para: ${page.url()}`)
  
  // Aguarda a página estabilizar
  await page.waitForLoadState('networkidle', { timeout: 10000 })
  console.log('[Login] Login completado com sucesso')
}

export async function loginAsEmissor(page: Page) {
  // Usar credencial que existe no setup-tests.ts
  await login(page, 'labor@omni.com', '123456')
}

export async function loginAsReceptor(page: Page) {
  // Usar credencial que existe no setup-tests.ts
  await login(page, 'receptor@test.com', 'password123')
}

export async function logout(page: Page) {
  console.log('[Logout] Tentando fazer logout')
  
  // Clica no botão 'Sair' no sidebar
  const sairButton = page.getByText('Sair')
  if (await sairButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sairButton.click()
    // Espera voltar para tela de login
    await page.waitForURL('**/login', { timeout: 10000 })
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible({ timeout: 5000 })
    console.log('[Logout] Logout completado')
  } else {
    console.log('[Logout] Botão Sair não encontrado, possivelmente já deslogado')
  }
}

export async function cleanupDatabase() {
  // Para E2E, assumimos que o banco já tem usuários de teste via seed
  // Se necessário, pode implementar limpeza aqui
  console.log('Usando usuários de teste existentes no banco')
}
