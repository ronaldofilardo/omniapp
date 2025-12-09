import { prisma } from '../prisma'
const fs = require('fs')

function isOverlapping(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB
}

export async function createEvent(data: any) {
  // Converter startTime e endTime para objetos Date se forem strings
  const startTime = typeof data.startTime === 'string'
    ? new Date(`${data.date}T${data.startTime}:00Z`)
    : data.startTime
  const endTime = typeof data.endTime === 'string'
    ? new Date(`${data.date}T${data.endTime}:00Z`)
    : data.endTime

  // Validação de sobreposição
  let existingEvents = await prisma.healthEvent.findMany({
    where: {
      date: data.date,
      professionalId: data.professionalId,
    },
  })
  if (!Array.isArray(existingEvents)) existingEvents = []
  // Ignora eventos com o mesmo id (caso o mock retorne)
  if (existingEvents.some(ev => {
    if (!ev) return false;
    if (ev.id && data.id && ev.id === data.id) return false;
    return isOverlapping(startTime, endTime, ev.startTime, ev.endTime);
  })) {
    throw new Error('sobreposição')
  }

  // Criar evento com objetos Date
  const eventData = {
    ...data,
    startTime,
    endTime,
  }
  return prisma.healthEvent.create({ data: eventData })
}

export async function getEvents(userId: string, opts?: { hasFiles?: boolean }) {
  const events = await prisma.healthEvent.findMany({
    where: { userId },
    include: { professional: true, files: true },
  })
  if (opts?.hasFiles) {
    return events.filter(e => Array.isArray(e.files) && e.files.length > 0)
  }
  return events
}

export async function updateEvent(id: string, data: any) {
  // Buscar evento atual
  const current = await prisma.healthEvent.findUnique({ where: { id } })
  if (!current) throw new Error('Evento não encontrado')

  // Converter startTime e endTime para objetos Date se forem strings
  const newStart = data.startTime !== undefined
    ? (typeof data.startTime === 'string'
        ? new Date(`${current.date.toISOString().split('T')[0]}T${data.startTime}:00Z`)
        : data.startTime)
    : current.startTime
  const newEnd = data.endTime !== undefined
    ? (typeof data.endTime === 'string'
        ? new Date(`${current.date.toISOString().split('T')[0]}T${data.endTime}:00Z`)
        : data.endTime)
    : current.endTime

  let existingEvents = await prisma.healthEvent.findMany({
    where: {
      date: current.date,
      professionalId: current.professionalId,
      NOT: { id },
    },
  })
  if (!Array.isArray(existingEvents)) existingEvents = []
  if (existingEvents.some(ev => ev && isOverlapping(
    newStart,
    newEnd,
    ev.startTime,
    ev.endTime
  ))) {
    throw new Error('sobreposição')
  }

  // Preparar dados para atualização, convertendo strings se necessário
  const updateData = { ...data }
  if (typeof updateData.startTime === 'string') {
    updateData.startTime = newStart
  }
  if (typeof updateData.endTime === 'string') {
    updateData.endTime = newEnd
  }

  return prisma.healthEvent.update({ where: { id }, data: updateData })
}

export async function deleteEvent(id: string, deleteFiles = false) {
  const event = await prisma.healthEvent.findUnique({
    where: { id },
    include: { files: true, professional: true },
  })
  if (!event) throw new Error('Evento não encontrado')

  if (deleteFiles) {
    // Deletar arquivos físicos
    for (const file of event.files) {
      if (file.url && fs.existsSync('.' + file.url)) {
        fs.unlinkSync('.' + file.url)
      }
    }
  } else {
    // Preservar arquivos como órfãos
    for (const file of event.files) {
      await prisma.files.update({
        where: { id: file.id },
        data: {
          isOrphaned: true,
          orphanedReason: `Evento deletado: ${event.title}`,
          professionalId: null, // Remove referência ao profissional
        }
      })
    }
  }
  return prisma.healthEvent.delete({ where: { id } })
}
