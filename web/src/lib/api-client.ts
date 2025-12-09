// Cliente API melhorado para integração REST/GraphQL

interface ApiConfig {
  baseURL: string
  headers?: Record<string, string>
}

class ApiClient {
  private baseURL: string
  private defaultHeaders: Record<string, string>

  constructor(config: ApiConfig) {
    this.baseURL = config.baseURL
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const config: RequestInit = {
      headers: this.defaultHeaders,
      ...options,
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error(`API Request failed: ${endpoint}`, error)
      throw error
    }
  }

  // Métodos REST
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  // Método para GraphQL (futuro)
  async graphql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    return this.post<T>('/api/graphql', { query, variables })
  }
}

// Instância do cliente API
export const apiClient = new ApiClient({
  baseURL: '', // URLs relativas para APIs Next.js
})

// Funções específicas para o Omni
export const api = {
  // Eventos
  events: {
    getAll: () => apiClient.get('/api/events'),
    getById: (id: string) => apiClient.get(`/api/events/${id}`),
    create: (data: any) => apiClient.post('/api/events', data),
    update: (id: string, data: any) => apiClient.put(`/api/events/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/events/${id}`),
  },

  // Profissionais
  professionals: {
    getAll: () => apiClient.get('/api/professionals'),
    getById: (id: string) => apiClient.get(`/api/professionals/${id}`),
    create: (data: any) => apiClient.post('/api/professionals', data),
    update: (id: string, data: any) => apiClient.put(`/api/professionals/${id}`, data),
    delete: (id: string) => apiClient.delete(`/api/professionals/${id}`),
    getSpecialties: () => apiClient.get('/api/professionals?type=specialties'),
  },

  // Repositório
  repository: {
    getAll: () => apiClient.get('/api/repository'),
  },

  // Upload
  upload: {
    uploadFile: (formData: FormData) => {
      return fetch('/api/upload', {
        method: 'POST',
        body: formData,
      }).then(res => res.json())
    },
  },
}

export default apiClient
