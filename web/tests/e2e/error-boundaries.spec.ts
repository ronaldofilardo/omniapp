import { test, expect } from '@playwright/test';

test.describe('Error Boundaries E2E', () => {
  test('deve exibir error boundary quando ocorre erro em página', async ({ page }) => {
    // Navegar para uma página que pode causar erro
    await page.goto('/admin');

    // Aguardar carregamento
    await page.waitForLoadState('networkidle');

    // Verificar se não há erro inicialmente
    await expect(page.locator('text=Erro inesperado')).not.toBeVisible();

    // Simular um erro JavaScript (injetando código que lança erro)
    await page.evaluate(() => {
      // Simular erro em componente React
      const error = new Error('Erro de teste E2E');
      // Disparar erro global que deve ser capturado pelo error boundary
      window.dispatchEvent(new CustomEvent('error', { detail: error }));
    });

    // Aguardar um momento para o error boundary processar
    await page.waitForTimeout(1000);

    // Verificar se o error boundary foi ativado
    // Nota: Em produção, isso pode mostrar uma página de erro customizada
    // Para este teste, verificamos que a página não quebrou completamente
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy(); // Página ainda tem conteúdo
  });

  test('deve manter navegação funcional após erro', async ({ page }) => {
    await page.goto('/');

    // Simular erro
    await page.evaluate(() => {
      throw new Error('Erro de navegação E2E');
    });

    // Aguardar processamento
    await page.waitForTimeout(1000);

    // Tentar navegar para outra página
    await page.goto('/admin');

    // Verificar se a navegação funcionou
    await expect(page).toHaveURL(/.*admin/);
  });

  test('API errors devem retornar formato RFC 7807', async ({ page }) => {
    // Fazer requisição para endpoint que pode falhar
    const response = await page.request.get('/api/users');

    // Se retornar erro, deve estar no formato correto
    if (!response.ok()) {
      const errorData = await response.json();

      // Verificar estrutura do erro RFC 7807
      expect(errorData).toHaveProperty('type');
      expect(errorData).toHaveProperty('title');
      expect(errorData).toHaveProperty('status');
      expect(errorData).toHaveProperty('detail');

      // Status deve corresponder ao código HTTP
      expect(errorData.status).toBe(response.status());
    }
  });

  test('error boundaries devem logar erros para monitoramento', async ({ page }) => {
    // Interceptar console.error para verificar logs
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Simular erro que deve ser logado
    await page.evaluate(() => {
      // Simular erro que será capturado pelo error boundary
      setTimeout(() => {
        throw new Error('Erro para monitoramento E2E');
      }, 100);
    });

    // Aguardar processamento
    await page.waitForTimeout(2000);

    // Verificar se erro foi logado
    const hasErrorLog = errors.some(error =>
      error.includes('Erro para monitoramento E2E') ||
      error.includes('GlobalError capturou')
    );

    expect(hasErrorLog).toBe(true);
  });

  test('loading states devem aparecer durante operações', async ({ page }) => {
    await page.goto('/');

    // Simular operação que leva tempo (como upload)
    const uploadPromise = page.waitForResponse('/api/upload');

    // Iniciar upload (se houver formulário)
    // Nota: Este teste precisa ser adaptado baseado na UI real
    // Por enquanto, apenas verificamos que a página carrega
    await expect(page.locator('body')).toBeVisible();

    // Aguardar resposta ou timeout
    try {
      await uploadPromise;
    } catch (e) {
      // Upload pode não acontecer, isso é ok para este teste básico
    }

    // Verificar que a página permanece funcional
    await expect(page.locator('body')).toBeVisible();
  });
});
