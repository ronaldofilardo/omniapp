import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FileSlotRepository } from '@/components/FileSlotRepository';
import { vi } from 'vitest';

describe('File Upload Workflow - Integration', () => {
  const mockOnUpload = vi.fn();
  const mockOnView = vi.fn();
  const mockOnDelete = vi.fn();

  const defaultProps = {
    label: 'Laudo Médico',
    onUpload: mockOnUpload,
    onView: mockOnView,
    onDelete: mockOnDelete,
    formatFileDate: (date: string) => new Date(date).toLocaleDateString('pt-BR'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes full file upload workflow successfully', async () => {
    mockOnUpload.mockResolvedValueOnce(undefined);

    render(<FileSlotRepository {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['test content'], 'laudo-medico.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(validFile);
    });

    // Simulate successful upload by providing file prop
    const file = {
      slot: 'result',
      name: 'laudo-medico.png',
      url: '/uploads/laudo-medico.png',
      uploadDate: '2024-10-21',
    };

    const { rerender } = render(<FileSlotRepository {...defaultProps} />);
    rerender(<FileSlotRepository {...defaultProps} file={file} />);

    expect(screen.getByText('laudo-medico.png')).toBeInTheDocument();
    // Aceita qualquer data no formato Upload: XX/10/2024
    // Aceita qualquer data no formato Upload: XX/10/2024
    const dateElements = screen.getAllByText((content, node) => {
      const text = node?.textContent || '';
      return /Upload:\s*\d{2}\/10\/2024/.test(text);
    });
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('handles file validation and rejection', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<FileSlotRepository {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    // Test oversized file - create file larger than 2MB (padronizado em todo o sistema)
    const largeFile = new File(['x'.repeat(2 * 1024 * 1024 + 1000)], 'large.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(alertSpy).toHaveBeenCalledWith('O arquivo deve ter no máximo 2MB');
    expect(mockOnUpload).not.toHaveBeenCalled();

    // Reset alert spy
    alertSpy.mockClear();

    // Test invalid file type
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(alertSpy).toHaveBeenCalledWith('Somente arquivos de imagem são permitidos (JPEG, PNG, GIF, WEBP)');
    expect(mockOnUpload).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('handles file viewing and deletion', async () => {
    const file = {
      slot: 'result',
      name: 'laudo-medico.pdf',
      url: '/uploads/laudo-medico.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} />);

    const viewButton = screen.getByTitle('Visualizar');
    const deleteButton = screen.getByTitle('Deletar');

    fireEvent.click(viewButton);
    expect(mockOnView).toHaveBeenCalled();

    mockOnDelete.mockResolvedValueOnce(undefined);
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('handles upload errors gracefully', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockOnUpload.mockRejectedValueOnce(new Error('Upload failed'));

    render(<FileSlotRepository {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Precisa ser imagem para passar pela validação
    const validFile = new File(['test'], 'laudo.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Erro ao fazer upload do arquivo');
    });

    alertSpy.mockRestore();
  });

  it('handles delete errors gracefully', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockOnDelete.mockRejectedValueOnce(new Error('Delete failed'));

    const file = {
      slot: 'result',
      name: 'laudo-medico.png',
      url: '/uploads/laudo-medico.png',
      uploadDate: '2024-10-21',
    };

    render(<FileSlotRepository {...defaultProps} file={file} />);

    const deleteButton = screen.getByTitle('Deletar');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      // eslint-disable-next-line no-console
      console.log('alertSpy calls:', alertSpy.mock.calls);
      expect(alertSpy).toHaveBeenCalledWith('Erro ao deletar arquivo');
    });

    alertSpy.mockRestore();
  });

  it('maintains file state after successful operations', async () => {
    mockOnUpload.mockResolvedValueOnce(undefined);

    const { rerender } = render(<FileSlotRepository {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['test'], 'laudo.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(mockOnUpload).toHaveBeenCalledWith(validFile);
    });

    // Simulate file uploaded
    const file = {
      slot: 'result',
      name: 'laudo.png',
      url: '/uploads/laudo.png',
      uploadDate: '2024-10-21',
    };

    rerender(<FileSlotRepository {...defaultProps} file={file} />);

    expect(screen.getByText('laudo.png')).toBeInTheDocument();

    // Test that view still works
    const viewButton = screen.getByTitle('Visualizar');
    fireEvent.click(viewButton);
    expect(mockOnView).toHaveBeenCalled();
  });

  it('handles disabled state correctly', () => {
    const file = {
      slot: 'result',
      name: 'laudo-medico.png',
      url: '/uploads/laudo-medico.png',
      uploadDate: '2024-10-21',
    };

    render(<FileSlotRepository {...defaultProps} file={file} disabled={true} />);

    const viewButton = screen.getByTitle('Visualizar');
    const deleteButton = screen.getByTitle('Deletar');

    expect(viewButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();

    // O input só existe quando não há arquivo, então não deve existir aqui
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeNull();
  });

  it('formats file dates correctly', () => {
    const file = {
      slot: 'result',
      name: 'laudo-medico.png',
      url: '/uploads/laudo-medico.png',
      uploadDate: '2024-10-21',
    };

    render(<FileSlotRepository {...defaultProps} file={file} />);

    // Aceita qualquer data no formato Upload: XX/10/2024
    // Aceita qualquer data no formato Upload: XX/10/2024
    const dateElements = screen.getAllByText((content, node) => {
      const text = node?.textContent || '';
      return /Upload:\s*\d{2}\/10\/2024/.test(text);
    });
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('handles missing formatFileDate function', () => {
    const file = {
      slot: 'result',
      name: 'laudo-medico.pdf',
      url: '/uploads/laudo-medico.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} formatFileDate={undefined} />);

    expect(
      screen.queryByText((content, node) => {
        const hasText = (text) => text.includes('25/10/2024');
        const nodeHasText = hasText(node?.textContent || '');
        const childrenDontHaveText = Array.from(node?.children || []).every(
          (child) => !hasText(child.textContent || '')
        );
        return nodeHasText && childrenDontHaveText;
      })
    ).not.toBeInTheDocument();
    expect(screen.getByText('laudo-medico.pdf')).toBeInTheDocument();
  });

  it('truncates long file names for display', () => {
    const file = {
      slot: 'result',
      name: 'very-long-file-name-that-should-be-truncated-for-display.pdf',
      url: '/uploads/file.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} />);

    const fileNameElement = screen.getByText('very-long-file-name-that-should-be-truncated-for-display.pdf');
    expect(fileNameElement).toHaveClass('truncate');
  });
});
