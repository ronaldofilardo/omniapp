"use client";
import { LogOut, FileText, BarChart2, Clock, Bell, BellRing, Users, Folder, Calendar } from 'lucide-react';
import { useNotificationCount } from '../hooks/useNotificationCount';
import Link from 'next/link';
import React from 'react';
import { useRouter } from 'next/navigation';

interface MenuItem {
  label: string;
  id: string;
  icon: any;
  href?: string;
}
interface SidebarProps {
  userRole: string;
  user?: any;
  onMenuClick?: (menu: string) => void;
}



export default function Sidebar({ userRole = '', activeMenu = '', onMenuClick, userId }: any) {
  const notificationCount = useNotificationCount(userId);
  const router = useRouter();

  // Menu baseado no papel do usuário
  let menuItems: MenuItem[] = [];
  if (userRole === 'EMISSOR') {
    menuItems = [
      { label: 'Portal de Envio', id: 'laudos', icon: FileText, href: '/laudos' },
      { label: 'Relatórios', id: 'relatorios', icon: BarChart2, href: '/relatorios' },
    ];
  } else {
    // RECEPTOR ou qualquer valor vazio/inválido
    menuItems = [
      { label: 'Timeline', id: 'timeline', icon: Clock },
      { label: 'Profissionais', id: 'professionals', icon: Users },
      { label: 'Repositório', id: 'repositorio', icon: Folder },
      { label: 'Calendário', id: 'calendario', icon: Calendar },
      { label: 'Dados Pessoais', id: 'dadospessoais', icon: BellRing },
      { label: 'Notificações', id: 'notificacoes', icon: Bell },
    ];
  }

  function handleLogoutClick() {
    if (onMenuClick) {
      onMenuClick('logout');
      // Garante que sempre redireciona para login após fechar menu
      setTimeout(() => router.push('/login'), 100);
    } else {
      router.push('/login');
    }
  }

  return (
    <div className="w-[280px] h-screen bg-white border-r border-[#E5E7EB] flex flex-col relative">
      {/* Header */}
      <div className="pt-8 pb-10 px-6 flex flex-col items-center">
        <img src="/logo.svg" alt="Logo Omni Saúde" className="h-12 w-auto mb-2" />
        <h1 className="text-[#1E40AF] mb-1 text-lg font-semibold">OmniSaúde</h1>
        <p className="text-[#6B7280] text-sm">Tudo em suas mãos</p>
      </div>
      {/* Menu Items */}
      <nav className="flex-1 px-4" data-testid="sidebar">
        <div className="flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            // Exibir badge apenas para o receptor e para o item Notificações
            const showNotificationBadge =
              userRole !== 'EMISSOR' && item.id === 'notificacoes' && notificationCount > 0;
            return item.href ? (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${isActive ? 'bg-[#10B981] text-white' : 'text-black hover:bg-gray-50'}`}
                onClick={onMenuClick ? (e) => {
                  e.preventDefault();
                  onMenuClick(item.id);
                  router.push(item.href!);
                } : undefined}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  {showNotificationBadge && (
                    <span className="absolute -top-1 -right-1 bg-[#EF4444] w-2 h-2 rounded-full border-2 border-white"></span>
                  )}
                </span>
                <span className="text-[16px]">{item.label}</span>
              </Link>
            ) : (
              <button
                key={item.id}
                onClick={() => {
                  if (onMenuClick) onMenuClick(item.id);
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${isActive ? 'bg-[#10B981] text-white' : 'text-black hover:bg-gray-50'}`}
              >
                <span className="relative">
                  <Icon className="w-5 h-5" strokeWidth={2} />
                  {showNotificationBadge && (
                    <span className="absolute -top-1 -right-1 bg-[#EF4444] w-2 h-2 rounded-full border-2 border-white"></span>
                  )}
                </span>
                <span className="text-[16px]">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {/* Logout */}
      <div className="px-4 pb-6">
        <button
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-[#EF4444] hover:bg-red-50 transition-all w-full"
          onClick={handleLogoutClick}
        >
          <LogOut className="w-5 h-5" strokeWidth={2} />
          <span className="text-[16px]">Sair</span>
        </button>
      </div>
    </div>
  );
}

