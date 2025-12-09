/**
 * Exemplo de Aplicação de Error Boundaries
 * 
 * Este arquivo demonstra como aplicar Error Boundaries
 * em uma página real da aplicação.
 */

'use client';

import { useState } from 'react';
import {
  PageErrorBoundary,
  FormErrorBoundary,
  UploadErrorBoundary,
  ListErrorBoundary,
} from '@/components/ErrorBoundaryWrappers';

/**
 * Layout da página com Error Boundary no nível mais alto
 */
export default function ExamplePage() {
  return (
    <PageErrorBoundary pageName="Exemplo">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Exemplo de Error Boundaries</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seção de Formulário */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Formulário</h2>
            <FormSection />
          </section>

          {/* Seção de Upload */}
          <section>
            <h2 className="text-2xl font-semibold mb-4">Upload de Arquivos</h2>
            <UploadSection />
          </section>
        </div>

        {/* Seção de Lista */}
        <section className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">Lista de Itens</h2>
          <ListSection />
        </section>
      </div>
    </PageErrorBoundary>
  );
}

/**
 * Seção de Formulário com Error Boundary
 * Se o formulário quebrar, apenas esta seção mostra erro
 */
function FormSection() {
  return (
    <FormErrorBoundary>
      <UserForm />
    </FormErrorBoundary>
  );
}

/**
 * Formulário de usuário
 */
function UserForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Simulação de API call
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Erro ao salvar usuário');
      }

      alert('Usuário salvo com sucesso!');
    } catch (error) {
      // Este erro será capturado pelo FormErrorBoundary
      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-2">
          Nome
        </label>
        <input
          id="name"
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
          required
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
          required
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        Salvar
      </button>
    </form>
  );
}

/**
 * Seção de Upload com Error Boundary
 * Se o upload quebrar, apenas esta seção mostra erro
 */
function UploadSection() {
  return (
    <UploadErrorBoundary>
      <FileUploader />
    </UploadErrorBoundary>
  );
}

/**
 * Componente de upload de arquivos
 */
function FileUploader() {
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload');
      }

      alert('Arquivos enviados com sucesso!');
      setFiles([]);
    } catch (error) {
      // Este erro será capturado pelo UploadErrorBoundary
      throw error;
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <input
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer text-blue-600 hover:text-blue-700"
        >
          Clique para selecionar arquivos
        </label>
      </div>

      {files.length > 0 && (
        <div>
          <h3 className="font-medium mb-2">Arquivos selecionados:</h3>
          <ul className="space-y-1 text-sm">
            {files.map((file, index) => (
              <li key={index} className="text-gray-600">
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </li>
            ))}
          </ul>
          <button
            onClick={handleUpload}
            className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Fazer Upload
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Seção de Lista com Error Boundary
 * Se a lista quebrar, apenas esta seção mostra erro
 */
function ListSection() {
  return (
    <ListErrorBoundary>
      <ItemList />
    </ListErrorBoundary>
  );
}

/**
 * Lista de itens
 */
function ItemList() {
  const [items] = useState([
    { id: 1, name: 'Item 1', description: 'Descrição do item 1' },
    { id: 2, name: 'Item 2', description: 'Descrição do item 2' },
    { id: 3, name: 'Item 3', description: 'Descrição do item 3' },
  ]);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
              ID
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
              Nome
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
              Descrição
            </th>
            <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 text-sm text-gray-900">{item.id}</td>
              <td className="px-6 py-4 text-sm text-gray-900">{item.name}</td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {item.description}
              </td>
              <td className="px-6 py-4 text-sm">
                <button className="text-blue-600 hover:text-blue-700 mr-3">
                  Editar
                </button>
                <button className="text-red-600 hover:text-red-700">
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Exemplo de componente que pode lançar erro para teste
 * Descomente para testar o Error Boundary
 */
// function ComponentThatThrows() {
//   throw new Error('Erro de teste!');
//   return <div>Este componente nunca renderiza</div>;
// }
