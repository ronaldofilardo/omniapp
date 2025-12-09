import { prisma } from '../prisma'

export async function createProfessional(data: any) {
  return prisma.professional.create({ data })
}

export async function getProfessionals() {
  return prisma.professional.findMany()
}
