import { NextResponse } from 'next/server'
import { graphql, buildSchema } from 'graphql'
import { prisma } from '@/lib/prisma'

// Schema GraphQL simples (pode ser expandido)
const schema = buildSchema(`
  type Professional {
    id: ID!
    name: String!
    specialty: String!
    address: String
    contact: String
  }

  type HealthEvent {
    id: ID!
    title: String!
    description: String
    date: String!
    type: String!
    startTime: String
    endTime: String
    professional: Professional
  }

  type Query {
    professionals: [Professional!]!
    events: [HealthEvent!]!
    event(id: ID!): HealthEvent
    professional(id: ID!): Professional
  }

  type Mutation {
    createEvent(
      title: String!
      description: String
      date: String!
      type: String!
      startTime: String!
      endTime: String!
      professionalId: String!
    ): HealthEvent!
  }
`)

// Resolvers
const root = {
  professionals: async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: 'user@email.com' },
      })
      if (!user) return []

      return await prisma.professional.findMany({
        where: { userId: user.id },
      })
    } catch (error) {
      console.error('Erro ao buscar profissionais:', error)
      return []
    }
  },

  events: async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: 'user@email.com' },
      })
      if (!user) return []

      return await prisma.healthEvent.findMany({
        where: { userId: user.id },
        include: { professional: true },
      })
    } catch (error) {
      console.error('Erro ao buscar eventos:', error)
      return []
    }
  },

  event: async ({ id }: { id: string }) => {
    try {
      return await prisma.healthEvent.findUnique({
        where: { id },
        include: { professional: true },
      })
    } catch (error) {
      console.error('Erro ao buscar evento:', error)
      return null
    }
  },

  professional: async ({ id }: { id: string }) => {
    try {
      return await prisma.professional.findUnique({
        where: { id },
      })
    } catch (error) {
      console.error('Erro ao buscar profissional:', error)
      return null
    }
  },

  createEvent: async (args: any) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: 'user@email.com' },
      })
      if (!user) throw new Error('Usuário não encontrado')

      const event = await prisma.healthEvent.create({
        data: {
          ...args,
          userId: user.id,
        },
        include: { professional: true },
      })
      return event
    } catch (error) {
      console.error('Erro ao criar evento:', error)
      throw error
    }
  },
}

export async function POST(request: Request) {
  try {
    const { query, variables } = await request.json()

    const result = await graphql({
      schema,
      source: query,
      rootValue: root,
      variableValues: variables,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro na consulta GraphQL:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor GraphQL' },
      { status: 500 }
    )
  }
}

// Método GET para interface GraphQL (opcional)
export async function GET() {
  return NextResponse.json({
    message: 'GraphQL API - Use POST para consultas',
    endpoint: '/api/graphql',
    example: {
      query: `
        query {
          professionals {
            id
            name
            specialty
          }
          events {
            id
            title
            date
            professional {
              name
            }
          }
        }
      `,
    },
  })
}
