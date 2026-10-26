import React from 'react';
import {
  LayoutGrid,
  Building2,
  AlertTriangle,
  History,
  FileText,
  ShieldCheck,
  Lock,
  LogOut,
  X,
} from 'lucide-react';
import { AdminUser } from '../types';
import { NeuromedicaLogo } from './NeuromedicaLogo';

export type NavTab = 'resumen' | 'sedes' | 'novedades' | 'historial' | 'reportes' | 'admin';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  adminUser: AdminUser | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  unreadCount?: number;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  adminUser,
  onOpenLogin,
  onLogout,
  unreadCount = 0,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'resumen', label: 'Resumen', icon: LayoutGrid },
    { id: 'sedes', label: 'Sedes', icon: Building2 },
    { id: 'novedades', label: 'Novedades', icon: AlertTriangle, badge: unreadCount > 0 ? unreadCount : undefined },
    { id: 'historial', label: 'Historial', icon: History },
    { id: 'reportes', label: 'Reportes', icon: FileText },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out shrink-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Top Official Neuromédica Logo */}
          <div className="flex items-center justify-between mb-8">
            <NeuromedicaLogo size="md" />

            {/* Mobile close button */}
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-[#1a1a37]"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id as NavTab);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#00a6e4] text-white shadow-md shadow-[#00a6e4]/25 translate-x-1'
                      : 'text-[#646482] hover:text-[#1a1a37] hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#646482]'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-white text-[#00a6e4]'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Admin section link */}
            <div className="pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  if (adminUser) {
                    onSelectTab('admin');
                  } else {
                    onOpenLogin();
                  }
                  if (onCloseMobile) onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  currentTab === 'admin'
                    ? 'bg-[#1a1a37] text-white shadow-md shadow-[#1a1a37]/20'
                    : 'text-[#646482] hover:text-[#1a1a37] hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  {adminUser ? (
                    <ShieldCheck className="w-4 h-4 text-[#00a6e4]" />
                  ) : (
                    <Lock className="w-4 h-4 text-[#646482]" />
                  )}
                  <span>{adminUser ? 'Administración' : 'Acceso Admin'}</span>
                </div>

                {adminUser && (
                  <span className="w-2 h-2 rounded-full bg-[#00a6e4] ring-2 ring-[#00a6e4]/30 animate-pulse" />
                )}
              </button>

              {adminUser && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className="mt-2 w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-all duration-200 cursor-pointer"
                  title="Cerrar sesión de administrador"
                >
                  <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer info */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-[11px] text-[#1a1a37]/70">Seguridad v2.6</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#00a6e4]/10 text-[#00a6e4]">
              BOG (UTC-5)
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
