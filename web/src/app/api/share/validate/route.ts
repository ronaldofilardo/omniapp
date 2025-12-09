import { NextRequest, NextResponse } from 'next/server'
import { shareStore } from '@/lib/shareStore'

export async function POST(request: NextRequest) {
  try {
    const { token, code } = await request.json()

    if (!token || !code) {
      return NextResponse.json({ error: 'Token e código são obrigatórios' }, { status: 400 })
    }

    const shareData = shareStore.get(token)


    if (!shareData) {
      return NextResponse.json({ error: 'Link expirado ou inválido' }, { status: 404 })
    }
    // Nova verificação: link expirado
    if (shareData.expiresAt && shareData.expiresAt < Date.now()) {
      return NextResponse.json({ error: 'Link expirado ou inválido' }, { status: 404 })
    }
    if (shareData.used) {
      return NextResponse.json({ error: 'Este link já foi utilizado' }, { status: 410 })
    }
    if (shareData.accessCode !== code) {
      return NextResponse.json({ error: 'Código de acesso incorreto' }, { status: 401 })
    }

    // Marcar como usado
    shareData.used = true
    shareStore.set(token, shareData)


    // Função para extrair o tipo do arquivo
    function getFileType(url: string) {
      const name = url.split('/').pop() || '';
      const parts = name.split('.');
      if (parts.length > 1) {
        return parts.pop();
      }
      return 'file';
    }

    // Preparar lista de arquivos para download
    const files = shareData.files.map((url, index) => {
      const name = url.split('/').pop() || `Arquivo ${index + 1}`;
      return {
        id: `file-${index}`,
        name,
        type: getFileType(url),
        url
      };
    });

    return NextResponse.json({ files })

  } catch (error) {
    console.error('Erro ao validar código de acesso:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
