/**
 * Base Repository Interface
 * Define operações CRUD padrão para todos os repositórios
 */
export interface IBaseRepository<T, CreateInput, UpdateInput> {
  findById(id: string): Promise<T | null>
  findMany(filters?: Record<string, any>): Promise<T[]>
  create(data: CreateInput): Promise<T>
  update(id: string, data: UpdateInput): Promise<T>
  delete(id: string): Promise<void>
  count(filters?: Record<string, any>): Promise<number>
}
