export interface FileInfo {
  slot: string
  name: string
  url: string
  uploadDate?: string | null
  size?: number | null
  mimeType?: string | null
  id?: string
  professionalId?: string | null
  eventId?: string | null
  expiryDate?: string | null
  isOrphaned?: boolean
  orphanedReason?: string | null
}

export interface Professional {
  id: string
  name: string
  specialty: string
}

export interface HealthEvent {
  id: string
  title: string
  date: Date
  startTime: Date
  endTime: Date
  files: FileInfo[]
  professional: Professional
  userId: string
  createdAt: Date
  updatedAt: Date
}

export type EventWithFiles = Pick<
  HealthEvent,
  'id' | 'title' | 'date' | 'startTime' | 'endTime' | 'files' | 'professional'
>
