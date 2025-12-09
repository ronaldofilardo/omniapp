/**
 * Testes de Virus Scan
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scanForViruses } from '@/lib/utils/virusScan';

describe('Virus Scan', () => {
  describe('scanForViruses', () => {
    it('deve retornar resultado limpo para arquivo seguro', async () => {
      const buffer = Buffer.from('Este é um arquivo de texto seguro');
      const fileName = 'documento.txt';
      const mimeType = 'text/plain';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(true);
      expect(result.scanEngine).toBe('basic-validation');
      expect(result.scanTime).toBeDefined();
      expect(typeof result.scanTime).toBe('number');
      expect(result.scanTime).toBeGreaterThanOrEqual(0);
    });

    it('deve detectar script HTML suspeito', async () => {
      const buffer = Buffer.from('<html><script>alert("malware")</script></html>');
      const fileName = 'pagina.html';
      const mimeType = 'text/html';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(false);
      expect(result.threatFound).toBe('Suspicious content pattern detected');
      expect(result.scanEngine).toBe('basic-validation');
    });

    it('deve detectar URL JavaScript suspeita', async () => {
      const buffer = Buffer.from('<a href="javascript:maliciousCode()">Link</a>');
      const fileName = 'pagina.html';
      const mimeType = 'text/html';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(false);
      expect(result.threatFound).toBe('Suspicious content pattern detected');
    });

    it('deve detectar VBScript', async () => {
      const buffer = Buffer.from('<script language="vbscript">malicious</script>');
      const fileName = 'pagina.html';
      const mimeType = 'text/html';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(false);
      expect(result.threatFound).toBe('Suspicious content pattern detected');
    });

    it('deve detectar event handler onload', async () => {
      const buffer = Buffer.from('<img onload="maliciousFunction()">');
      const fileName = 'pagina.html';
      const mimeType = 'text/html';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(false);
      expect(result.threatFound).toBe('Suspicious content pattern detected');
    });

    it('deve detectar função eval', async () => {
      const buffer = Buffer.from('const code = eval(maliciousInput);');
      const fileName = 'script.js';
      const mimeType = 'application/javascript';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(false);
      expect(result.threatFound).toBe('Suspicious content pattern detected');
    });

    it('deve detectar executável Windows mascarado', async () => {
      // Criar buffer com assinatura MZ (Windows executable)
      const buffer = Buffer.from([0x4D, 0x5A, ...'fake content'.split('').map(c => c.charCodeAt(0))]);
      const fileName = 'documento.txt';
      const mimeType = 'text/plain';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(false);
      expect(result.threatFound).toBe('Executable file masquerading as safe type');
    });

    it('deve permitir executável Windows com MIME correto', async () => {
      const buffer = Buffer.from([0x4D, 0x5A, ...'fake content'.split('').map(c => c.charCodeAt(0))]);
      const fileName = 'programa.exe';
      const mimeType = 'application/x-msdownload';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(true);
    });

    it('deve detectar executável Linux mascarado', async () => {
      // Criar buffer com assinatura ELF
      const buffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, ...'fake content'.split('').map(c => c.charCodeAt(0))]);
      const fileName = 'documento.txt';
      const mimeType = 'text/plain';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(false);
      expect(result.threatFound).toBe('Executable file masquerading as safe type');
    });

    it('deve permitir executável Linux com MIME correto', async () => {
      const buffer = Buffer.from([0x7F, 0x45, 0x4C, 0x46, ...'fake content'.split('').map(c => c.charCodeAt(0))]);
      const fileName = 'programa';
      const mimeType = 'application/x-executable';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(true);
    });

    it('deve ignorar padrões suspeitos em arquivos binários não texto', async () => {
      const buffer = Buffer.from('<script>alert("test")</script>');
      const fileName = 'imagem.jpg';
      const mimeType = 'image/jpeg';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(true);
    });

    it('deve verificar apenas primeiros 1KB para padrões suspeitos', async () => {
      // Criar buffer grande com conteúdo suspeito no final
      const safeContent = 'a'.repeat(1024); // 1KB de conteúdo seguro
      const suspiciousContent = '<script>alert("malware")</script>';
      const buffer = Buffer.from(safeContent + suspiciousContent);
      const fileName = 'arquivo.txt';
      const mimeType = 'text/plain';

      const result = await scanForViruses(buffer, fileName, mimeType);

      // Deve passar porque o conteúdo suspeito está após 1KB
      expect(result.isClean).toBe(true);
    });

    it('deve lidar com erro durante verificação', async () => {
      const fileName = 'test.pdf';
      const mimeType = 'application/pdf';

      // Mock console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Passar null como buffer para forçar erro
      const result = await scanForViruses(null as any, fileName, mimeType);

      expect(result.isClean).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.scanEngine).toBe('error');

      consoleSpy.mockRestore();
    });

    it('deve funcionar com diferentes tipos MIME de texto', async () => {
      const testCases = [
        { mimeType: 'text/plain', fileName: 'arquivo.txt' },
        { mimeType: 'text/html', fileName: 'pagina.html' },
        { mimeType: 'application/json', fileName: 'dados.json' },
        { mimeType: 'application/javascript', fileName: 'script.js' },
        { mimeType: 'text/css', fileName: 'estilo.css' },
      ];

      for (const { mimeType, fileName } of testCases) {
        const buffer = Buffer.from('<script>alert("test")</script>');
        const result = await scanForViruses(buffer, fileName, mimeType);

        expect(result.isClean).toBe(false);
        expect(result.threatFound).toBe('Suspicious content pattern detected');
      }
    });

    it('deve medir tempo de scan corretamente', async () => {
      const buffer = Buffer.from('arquivo seguro');
      const fileName = 'teste.txt';
      const mimeType = 'text/plain';

      const startTime = Date.now();
      const result = await scanForViruses(buffer, fileName, mimeType);
      const endTime = Date.now();

      expect(result.scanTime).toBeDefined();
      expect(result.scanTime).toBeGreaterThanOrEqual(0);
      expect(result.scanTime).toBeLessThanOrEqual(endTime - startTime + 1); // Margem de erro
    });

    it('deve lidar com buffer vazio', async () => {
      const buffer = Buffer.from('');
      const fileName = 'vazio.txt';
      const mimeType = 'text/plain';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(true);
      expect(result.scanEngine).toBe('basic-validation');
    });

    it('deve lidar com buffer muito pequeno para verificação de executável', async () => {
      const buffer = Buffer.from([0x4D]); // Apenas 1 byte
      const fileName = 'pequeno.txt';
      const mimeType = 'text/plain';

      const result = await scanForViruses(buffer, fileName, mimeType);

      expect(result.isClean).toBe(true);
    });
  });
});