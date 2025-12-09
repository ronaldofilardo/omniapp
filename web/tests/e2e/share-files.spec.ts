import { test, expect } from '@playwright/test'
import { login, logout, cleanupDatabase } from './utils/test-helpers'

test.describe('Compartilhamento de arquivos de evento', () => {
  test('deve compartilhar arquivos de um evento e permitir acesso único', async ({ page, context }) => {
    await cleanupDatabase()
    await login(page)
    // 1. Criar um evento de teste
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
    await page.getByRole('button', { name: 'Novo Evento' }).click()

    // Preencher formulário do evento
    await page.getByLabel('Título').fill('Evento para Compartilhamento')
    await page.getByLabel('Tipo').selectOption('CONSULTATION')
    await page.getByLabel('Data').fill('2025-12-01')
    await page.getByLabel('Início').fill('10:00')
    await page.getByLabel('Fim').fill('11:00')
    await page.getByLabel('Profissional').selectOption('Dr. Silva')
    await page.getByRole('button', { name: 'Criar Evento' }).click()

    // 2. Verificar se o evento foi criado
    await expect(page.getByText('Evento para Compartilhamento')).toBeVisible()

    // 3. Fazer upload de arquivos no evento
    const eventCard = page.locator('[data-testid="timeline-event-card"]').filter({ hasText: 'Evento para Compartilhamento' })
    await eventCard.getByRole('button', { name: 'Arquivos' }).click()

    // Upload de arquivos de teste (simular)
    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles([
      { name: 'exame.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake pdf content') },
      { name: 'receita.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('fake image content') }
    ])

    await page.getByRole('button', { name: 'Concluir' }).click()

    // 4. Clicar no botão Compartilhar
    await eventCard.getByRole('button', { name: 'Compartilhar' }).click()

    // 5. Selecionar arquivos para compartilhar
    await page.getByRole('checkbox', { name: /exame\.pdf/ }).check()
    await page.getByRole('checkbox', { name: /receita\.jpg/ }).check()

    // 6. Gerar link de compartilhamento
    await page.getByRole('button', { name: 'Gerar Link de Compartilhamento' }).click()

    // 7. Verificar se o modal de compartilhamento apareceu
    await expect(page.getByText('Compartilhamento Seguro')).toBeVisible()
    await expect(page.getByText('Este link é de uso único.')).toBeVisible()

    // 8. Obter o link e código gerados
    const shareLink = await page.locator('input[readonly]').inputValue()
    const accessCode = await page.getByText(/^[\d]{6}$/).textContent()

    expect(shareLink).toMatch(/^http:\/\/.*\/share\/[a-f0-9]+$/)
    expect(accessCode).toMatch(/^[\d]{6}$/)

    // 9. Copiar link e abrir em nova aba
    const newPage = await context.newPage()
    await newPage.goto(shareLink)

    // 10. Inserir código de acesso
    await newPage.getByPlaceholder('388910').fill(accessCode!)
    await newPage.getByRole('button', { name: 'Acessar Arquivos' }).click()

    // 11. Verificar se os arquivos são exibidos
    await expect(newPage.getByText('Arquivos Compartilhados')).toBeVisible()
    await expect(newPage.getByText('exame.pdf')).toBeVisible()
    await expect(newPage.getByText('receita.jpg')).toBeVisible()

    // Verificar botões de download
    const downloadButtons = newPage.getByRole('button', { name: 'Baixar' })
    await expect(downloadButtons).toHaveCount(2)

    // 12. Tentar acessar novamente (deve falhar pois é de uso único)
    await newPage.reload()
    await newPage.getByPlaceholder('388910').fill(accessCode!)
    await newPage.getByRole('button', { name: 'Acessar Arquivos' }).click()

    await expect(newPage.getByText('Este link já foi utilizado')).toBeVisible()

    // Fechar a nova aba
    await newPage.close()
  })

  test('deve mostrar erro para código incorreto', async ({ page, context }) => {
    // 1. Criar evento e gerar link (reutilizar lógica do teste anterior)
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
    await page.getByRole('button', { name: 'Novo Evento' }).click()

    await page.getByLabel('Título').fill('Evento Código Incorreto')
    await page.getByLabel('Tipo').selectOption('EXAM')
    await page.getByLabel('Data').fill('2025-12-02')
    await page.getByLabel('Início').fill('14:00')
    await page.getByLabel('Fim').fill('15:00')
    await page.getByLabel('Profissional').selectOption('Dr. Silva')
    await page.getByRole('button', { name: 'Criar Evento' }).click()

    // Upload e compartilhamento
    const eventCard = page.locator('[data-testid="timeline-event-card"]').filter({ hasText: 'Evento Código Incorreto' })
    await eventCard.getByRole('button', { name: 'Arquivos' }).click()

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles([
      { name: 'laudo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake pdf content') }
    ])

    await page.getByRole('button', { name: 'Concluir' }).click()

    await eventCard.getByRole('button', { name: 'Compartilhar' }).click()
    await page.getByRole('checkbox', { name: /laudo\.pdf/ }).check()
    await page.getByRole('button', { name: 'Gerar Link de Compartilhamento' }).click()

    const shareLink = await page.locator('input[readonly]').inputValue()

    // 2. Abrir link e tentar código incorreto
    const newPage = await context.newPage()
    await newPage.goto(shareLink)

    await newPage.getByPlaceholder('388910').fill('000000') // Código incorreto
    await newPage.getByRole('button', { name: 'Acessar Arquivos' }).click()

    await expect(newPage.getByText('Código de acesso incorreto')).toBeVisible()

    // 3. Verificar que ainda pode tentar novamente
    await expect(newPage.getByPlaceholder('388910')).toBeVisible()

    await newPage.close()
  })

  test('deve permitir apenas seleção de arquivos existentes', async ({ page }) => {
    // 1. Criar evento sem arquivos
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
    await page.getByRole('button', { name: 'Novo Evento' }).click()

    await page.getByLabel('Título').fill('Evento Sem Arquivos')
    await page.getByLabel('Tipo').selectOption('PROCEDURE')
    await page.getByLabel('Data').fill('2025-12-03')
    await page.getByLabel('Início').fill('16:00')
    await page.getByLabel('Fim').fill('17:00')
    await page.getByLabel('Profissional').selectOption('Dr. Silva')
    await page.getByRole('button', { name: 'Criar Evento' }).click()

    // 2. Tentar compartilhar (não deve ter arquivos)
    const eventCard = page.locator('[data-testid="timeline-event-card"]').filter({ hasText: 'Evento Sem Arquivos' })
    await eventCard.getByRole('button', { name: 'Compartilhar' }).click()

    // 3. Verificar que não há arquivos para selecionar
    await expect(page.getByText('Selecionar Arquivos para Compartilhar')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Gerar Link de Compartilhamento' })).toBeDisabled()

    // 4. Fechar modal
    await page.getByRole('button', { name: 'Cancelar' }).click()
  })

  test('deve gerar QR code para o link de compartilhamento', async ({ page }) => {
    // 1. Criar evento com arquivo
    await page.locator('[data-testid="sidebar"]').getByRole('button', { name: 'Timeline' }).click()
    await page.getByRole('button', { name: 'Novo Evento' }).click()

    await page.getByLabel('Título').fill('Evento QR Code')
    await page.getByLabel('Tipo').selectOption('MEDICATION')
    await page.getByLabel('Data').fill('2025-12-04')
    await page.getByLabel('Início').fill('18:00')
    await page.getByLabel('Fim').fill('19:00')
    await page.getByLabel('Profissional').selectOption('Dr. Silva')
    await page.getByRole('button', { name: 'Criar Evento' }).click()

    // Upload
    const eventCard = page.locator('[data-testid="timeline-event-card"]').filter({ hasText: 'Evento QR Code' })
    await eventCard.getByRole('button', { name: 'Arquivos' }).click()

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles([
      { name: 'prescricao.pdf', mimeType: 'application/pdf', buffer: Buffer.from('fake pdf content') }
    ])

    await page.getByRole('button', { name: 'Concluir' }).click()

    // 2. Gerar compartilhamento
    await eventCard.getByRole('button', { name: 'Compartilhar' }).click()
    await page.getByRole('checkbox', { name: /prescricao\.pdf/ }).check()
    await page.getByRole('button', { name: 'Gerar Link de Compartilhamento' }).click()

    // 3. Verificar se QR code está presente
    const qrCode = page.locator('[data-testid="qrcode"]')
    await expect(qrCode).toBeVisible()
  })
})
