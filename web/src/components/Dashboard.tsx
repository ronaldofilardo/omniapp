'use client'
import { useEffect, useState } from 'react'
import { Plus, Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import { Timeline } from './Timeline'
import NewEventModal from './NewEventModal'
import { ProfessionalsTab } from './ProfessionalsTab'
import { RepositoryTab } from './RepositoryTab'
import { CalendarTab } from './CalendarTab'
import { Button } from './ui/button'
import NotificationCenter from './NotificationCenter'
import PersonalDataTab from './PersonalDataTab'
import { PortalLaudos } from './PortalLaudos'
import { EmissorDashboard } from './EmissorDashboard'
import ExternalLabSubmit from './ExternalLabSubmit'
import { ShareModal } from './ShareModal'
import { EventsProvider, useEvents } from '../contexts/EventsContext'
import type { HealthEvent as Event } from '../contexts/EventsContext'

interface DashboardProps {
  onLogout: () => void
  userId: string
  userRole: 'EMISSOR' | 'RECEPTOR';
  user?: any;
}

function DashboardContent({ onLogout, userId, userRole, user }: DashboardProps) {
  const { events, professionals, deleteEventOptimistic, refreshData } = useEvents()
  console.log('[Dashboard] Componente montado com:', { userId, userRole, user })

  const [mounted, setMounted] = useState(false)
  const [activeMenu, setActiveMenu] = useState<string>('')
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [selectedEventForShare, setSelectedEventForShare] = useState<Event | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Inicializar activeMenu após componente montar no cliente
  useEffect(() => {
    setMounted(true)
    // Para RECEPTOR, sempre iniciar com 'timeline', independente do localStorage
    if (userRole === 'RECEPTOR') {
      setActiveMenu('timeline')
    } else {
      // Carregar aba ativa do localStorage ou usar padrão baseado no userRole
      const savedMenu = localStorage.getItem('activeMenu')
      if (savedMenu) {
        setActiveMenu(savedMenu)
      } else {
        // Se for EMISSOR, iniciar com 'laudos'
        setActiveMenu('laudos')
      }
    }
  }, [userRole])

  // Debug: monitorar estado do modal
  useEffect(() => {
    console.log(
      'Dashboard: isNewEventModalOpen changed to',
      isNewEventModalOpen
    )
  }, [isNewEventModalOpen])

  // Debug: log quando activeMenu muda
  useEffect(() => {
    console.log('[Dashboard] activeMenu mudou para:', activeMenu)
    if (activeMenu === 'repository') {
      console.log('[Dashboard] RepositoryTab será renderizado com userId:', userId)
    } else if (activeMenu === 'calendar') {
      console.log('[Dashboard] CalendarTab será renderizado com events:', events?.length, 'professionals:', professionals?.length)
    }
  }, [activeMenu, userId, events, professionals])

  const handleMenuClick = (menu: string) => {
    if (menu === 'logout') {
      onLogout()
    } else {
      setActiveMenu(menu)
      // Salvar aba ativa no localStorage
      localStorage.setItem('activeMenu', menu)
      // Fechar sidebar em dispositivos móveis após seleção
      setIsSidebarOpen(false)
    }
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  // Get current date formatted
  const getCurrentDate = () => {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      weekday: 'long',
    }
    const date = new Date()
    const formatted = date.toLocaleDateString('pt-BR', options)
    const [weekday, dateStr] = formatted.split(', ')
    return `${dateStr} - ${weekday}`
  }


  // Evita mismatch de hidratação: só renderiza conteúdo após mounted ser true
  if (!mounted) return null

  return (
  <div className="flex bg-linear-to-b from-[#F8FAFC] to-white">
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          onClick={toggleSidebar}
          variant="outline"
          size="sm"
          className="bg-white shadow-md"
        >
          <Menu className="w-4 h-4" />
        </Button>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative z-50 h-screen transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
    <Sidebar userRole={userRole} user={user} onMenuClick={handleMenuClick} userId={userId} />
      </div>

      {/* Main Content */}
      {activeMenu === 'timeline' && (
  <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
          {/* Header */}
          <div className="px-4 md:px-12 pt-12 pb-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-[#111827] text-xl md:text-2xl">Minha Timeline</h1>
              {/* New Event Button */}
              <Button
                onClick={() => setIsNewEventModalOpen(true)}
                className="bg-[#10B981] hover:bg-[#059669] text-white h-10 px-4 md:px-6 rounded-lg flex items-center gap-2 text-sm md:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-[14px]">Novo Evento</span>
                <span className="sm:hidden text-[14px]">Novo</span>
              </Button>
            </div>
            {/* Current Date */}
            <p className="text-[#6B7280] text-sm md:text-[16px]">{getCurrentDate()}</p>
          </div>
          {/* Timeline Content Area */}
          <div className="px-4 md:px-12 py-6 h-full overflow-y-auto">
            {(() => {
              console.log('[Dashboard] Rendering timeline, events:', events, 'professionals:', professionals)
              return null
            })()}
            {events && events.length > 0 ? (
              <Timeline
                onUpdate={refreshData}
                events={events}
                professionals={professionals}
                onView={(event) => {
                  // Implementar modal ou navegação para visualizar detalhes do evento
                  alert(`Visualizando evento: ${event.title}`)
                }}
                onFiles={(event) => {
                  // Implementar modal ou navegação para gerenciar arquivos do evento
                  alert(`Arquivos do evento: ${event.title}`)
                }}
                onShare={(event) => {
                  setSelectedEventForShare(event)
                  setShareModalOpen(true)
                }}
                onEdit={(event) => {
                  // Implementar modal de edição ou navegação para editar evento
                  alert(`Editando evento: ${event.title}`)
                }}
                onDelete={async (event, deleteFiles) => {
                  await deleteEventOptimistic(event.id, deleteFiles)
                }}
              />
            ) : (
              <div className="text-center text-[#9CA3AF] text-lg mt-12">
                Ainda não existem eventos cadastrados
              </div>
            )}
          </div>
        </div>
      )}
      {/* Professionals Tab */}
      {activeMenu === 'professionals' && (
        <ProfessionalsTab userId={userId} />
      )}
      {/* Repository Tab */}
  {activeMenu === 'repositorio' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <RepositoryTab userId={userId} />
        </div>
      )}
      {/* Calendar Tab */}
  {activeMenu === 'calendario' && (
        <CalendarTab
          events={events}
          professionals={professionals}
          onBackToTimeline={() => setActiveMenu('timeline')}
        />
      )}
      {/* Notification Center */}
    {activeMenu === 'notificacoes' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <NotificationCenter userId={userId} onProfessionalCreated={refreshData} />
        </div>
      )}
      {/* Personal Data Tab */}
      {activeMenu === 'dadospessoais' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <PersonalDataTab userId={userId} />
        </div>
      )}
      {/* Default to Timeline if no menu is active */}
      {!activeMenu && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0 h-screen overflow-y-auto">
          {/* Header */}
          <div className="px-4 md:px-12 pt-12 pb-6">
            <div className="flex items-start justify-between mb-4">
              <h1 className="text-[#111827] text-xl md:text-2xl">Minha Timeline</h1>
              {/* New Event Button */}
              <Button
                onClick={() => setIsNewEventModalOpen(true)}
                className="bg-[#10B981] hover:bg-[#059669] text-white h-10 px-4 md:px-6 rounded-lg flex items-center gap-2 text-sm md:text-base"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline text-[14px]">Novo Evento</span>
                <span className="sm:hidden text-[14px]">Novo</span>
              </Button>
            </div>
            {/* Current Date */}
            <p className="text-[#6B7280] text-sm md:text-[16px]">{getCurrentDate()}</p>
          </div>
          {/* Timeline Content Area */}
          <div className="px-4 md:px-12 py-6 h-full overflow-y-auto">
            {(() => {
              console.log('[Dashboard] Rendering timeline, events:', events, 'professionals:', professionals)
              return null
            })()}
            {events && events.length > 0 ? (
              <Timeline
                onUpdate={refreshData}
                events={events}
                professionals={professionals}
                onView={(event) => {
                  // Implementar modal ou navegação para visualizar detalhes do evento
                  alert(`Visualizando evento: ${event.title}`)
                }}
                onFiles={(event) => {
                  // Implementar modal ou navegação para gerenciar arquivos do evento
                  alert(`Arquivos do evento: ${event.title}`)
                }}
                onShare={(event) => {
                  setSelectedEventForShare(event)
                  setShareModalOpen(true)
                }}
                onEdit={(event) => {
                  // Implementar modal de edição ou navegação para editar evento
                  alert(`Editando evento: ${event.title}`)
                }}
                onDelete={async (event, deleteFiles) => {
                  await deleteEventOptimistic(event.id, deleteFiles)
                }}
              />
            ) : (
              <div className="text-center text-[#9CA3AF] text-lg mt-12">
                Ainda não existem eventos cadastrados
              </div>
            )}
          </div>
        </div>
      )}
      {/* Emissor Tabs */}
      {userRole === 'EMISSOR' && activeMenu === 'laudos' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-6">Portal de Envio</h1>
            <ExternalLabSubmit />
          </div>
        </div>
      )}
      {userRole === 'EMISSOR' && activeMenu === 'relatorios' && (
        <div className="flex-1 w-full md:w-[1160px] relative ml-0 md:ml-0">
          <EmissorDashboard />
        </div>
      )}
      {/* New Event Modal */}
      <NewEventModal
        open={isNewEventModalOpen}
        onOpenChange={(open) => {
          console.log('Dashboard: NewEventModal onOpenChange called with', open)
          setIsNewEventModalOpen(open)
        }}
        userId={userId}
      />

      {/* Share Modal */}
      {selectedEventForShare && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          event={selectedEventForShare}
        />
      )}

      {/* Renderizar eventos reais do banco */}
    </div>
  )
}

export function Dashboard(props: DashboardProps) {
  return <EventsProvider userId={props.userId}><DashboardContent {...props} /></EventsProvider>
}
