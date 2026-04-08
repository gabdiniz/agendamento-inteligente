import type { Patient } from '@myagendix/database'

export interface IPatientRepository {
  findById(id: string): Promise<Patient | null>
  findByPhone(phone: string): Promise<Patient | null>
  findAll(params: { page: number; limit: number; search?: string }): Promise<{
    data: Patient[]
    total: number
  }>
  create(data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient>
  update(id: string, data: Partial<Patient>): Promise<Patient>
}
