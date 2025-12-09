import { render, screen, fireEvent } from '@testing-library/react';
import { FileSlotRepository } from '@/components/FileSlotRepository';
import { vi } from 'vitest';

// Mock do storage manager
vi.mock('@/lib/storage', () => ({
  storageManager: {
    getMaxFileSize: vi.fn(() => 2 * 1024), // 2KB
  },
  isMimeTypeAllowed: vi.fn((mimeType: string) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimeType)),
}));

describe('FileSlotRepository', () => {
  const mockOnUpload = vi.fn();
  const mockOnView = vi.fn();
  const mockOnDelete = vi.fn();

  const defaultProps = {
    label: 'Laudo',
    onUpload: mockOnUpload,
    onView: mockOnView,
    onDelete: mockOnDelete,
    formatFileDate: (date: string) => `Formatted: ${date}`,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders label correctly', () => {
    render(<FileSlotRepository {...defaultProps} />);
    expect(screen.getByText('Laudo')).toBeInTheDocument();
  });

  it('shows upload icon when no file is present', () => {
    render(<FileSlotRepository {...defaultProps} />);
    const uploadIcon = document.querySelector('svg');
    expect(uploadIcon).toBeInTheDocument();
  });

  it('renders file information when file is present', () => {
    const file = {
      slot: 'result',
      name: 'laudo.pdf',
      url: '/uploads/laudo.pdf',
      uploadDate: '2024-10-25',
    };

  render(<FileSlotRepository {...defaultProps} file={file} />);
  expect(screen.getByText('laudo.pdf')).toBeInTheDocument();
  // O texto está dentro de "Upload: Formatted: 2024-10-25"
  expect(screen.getByText((t) => t.includes('Formatted: 2024-10-25'))).toBeInTheDocument();
  });

  it('shows view and delete buttons when file is present', () => {
    const file = {
      slot: 'result',
      name: 'laudo.pdf',
      url: '/uploads/laudo.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} />);
    expect(screen.getByTitle('Visualizar')).toBeInTheDocument();
    expect(screen.getByTitle('Deletar')).toBeInTheDocument();
  });

  it('calls onView when view button is clicked', () => {
    const file = {
      slot: 'result',
      name: 'laudo.pdf',
      url: '/uploads/laudo.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} />);
    const viewButton = screen.getByTitle('Visualizar');
    fireEvent.click(viewButton);
    expect(mockOnView).toHaveBeenCalled();
  });

  it('calls onDelete when delete button is clicked', () => {
    const file = {
      slot: 'result',
      name: 'laudo.pdf',
      url: '/uploads/laudo.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} />);
    const deleteButton = screen.getByTitle('Deletar');
    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalled();
  });

  it('validates file size on upload', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<FileSlotRepository {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const largeFile = new File(['x'.repeat(3000)], 'large.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(alertSpy).toHaveBeenCalledWith('O arquivo deve ter no máximo 2KB');
    expect(mockOnUpload).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('validates file type on upload', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<FileSlotRepository {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const textFile = new File(['test'], 'test.txt', { type: 'text/plain' });

    fireEvent.change(fileInput, { target: { files: [textFile] } });

    expect(alertSpy).toHaveBeenCalledWith('Somente arquivos de imagem são permitidos (JPEG, PNG, GIF, WEBP)');
    expect(mockOnUpload).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('calls onUpload with valid file', async () => {
    mockOnUpload.mockResolvedValueOnce(undefined);

    render(<FileSlotRepository {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['test'], 'image.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Aguarda a execução assíncrona
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockOnUpload).toHaveBeenCalledWith(validFile);
  });

  it('handles upload error gracefully', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockOnUpload.mockRejectedValueOnce(new Error('Upload failed'));

    render(<FileSlotRepository {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const validFile = new File(['test'], 'image.png', { type: 'image/png' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Aguarda a execução assíncrona
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(alertSpy).toHaveBeenCalledWith('Erro ao fazer upload do arquivo');
    alertSpy.mockRestore();
  });

  it('applies disabled styling when disabled', () => {
  render(<FileSlotRepository {...defaultProps} disabled={true} />);
  // O container externo tem as classes de disabled
  const container = screen.getByText('Laudo').closest('div');
  const outer = container?.parentElement;
  expect(outer).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('disables buttons when disabled', () => {
    const file = {
      slot: 'result',
      name: 'laudo.pdf',
      url: '/uploads/laudo.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} disabled={true} />);
    const viewButton = screen.getByTitle('Visualizar');
    const deleteButton = screen.getByTitle('Deletar');

    expect(viewButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });

  it('does not show upload date when formatFileDate is not provided', () => {
    const file = {
      slot: 'result',
      name: 'laudo.pdf',
      url: '/uploads/laudo.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} formatFileDate={undefined} />);
    expect(screen.queryByText('Formatted: 2024-10-25')).not.toBeInTheDocument();
  });

  it('truncates long file names', () => {
    const file = {
      slot: 'result',
      name: 'very-long-file-name-that-should-be-truncated.pdf',
      url: '/uploads/file.pdf',
      uploadDate: '2024-10-25',
    };

    render(<FileSlotRepository {...defaultProps} file={file} />);
    const fileNameElement = screen.getByText('very-long-file-name-that-should-be-truncated.pdf');
    expect(fileNameElement).toHaveClass('truncate');
  });
});

