'use client';

import React, { useEffect, useState } from 'react';

interface UserData {
  id: string;
  name: string;
  email: string;
  cpf?: string;
  telefone?: string;
}

interface PersonalDataTabProps {
  userId: string;
}

export default function PersonalDataTab({ userId }: PersonalDataTabProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<UserData>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/user/${userId}`)
      .then(res => res.json())
      .then(data => {
        setUser(data);
        setFormData(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Erro ao buscar dados do usuário.');
        setLoading(false);
      });
  }, [userId]);

  const handleInputChange = (field: keyof UserData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/user/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setFormData(data.user);
        setSuccessMessage(data.message || 'Dados atualizados com sucesso.');
        setIsEditing(false);
      } else {
        setError(data.error || 'Erro ao atualizar dados.');
      }
    } catch (err) {
      setError('Erro ao salvar dados.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(user || {});
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
  };

  if (loading) return <div>Carregando dados pessoais...</div>;
  if (error && !user) return <div className="text-red-600">{error}</div>;
  if (!user) return <div>Nenhum dado encontrado.</div>;

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-md p-8 mt-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#1E40AF]">Dados Pessoais</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm"
          >
            Editar
          </button>
        )}
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}
      {successMessage && <div className="text-green-600 mb-4">{successMessage}</div>}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Nome</label>
          <input
            value={formData.name || ''}
            onChange={(e) => handleInputChange('name', e.target.value)}
            readOnly={!isEditing}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-black ${
              isEditing ? 'bg-white' : 'bg-gray-100'
            }`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">CPF</label>
          <input
            value={formData.cpf || ''}
            onChange={(e) => handleInputChange('cpf', e.target.value)}
            readOnly={!isEditing}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-black ${
              isEditing ? 'bg-white' : 'bg-gray-100'
            }`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefone</label>
          <input
            value={formData.telefone || ''}
            onChange={(e) => handleInputChange('telefone', e.target.value)}
            readOnly={!isEditing}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-black ${
              isEditing ? 'bg-white' : 'bg-gray-100'
            }`}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">E-mail</label>
          <input
            value={formData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            readOnly={!isEditing}
            className={`w-full border border-gray-300 rounded-lg px-3 py-2 text-black ${
              isEditing ? 'bg-white' : 'bg-gray-100'
            }`}
          />
        </div>
      </div>

      {isEditing && (
        <div className="flex gap-4 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            onClick={handleCancel}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
