import React from 'react';
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Shield,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  LogOut,
} from 'lucide-react';
import { AdminUser, SedeConEstado, RegistroHistorial } from '../types';
import { formatBogotaTimeOnly } from '../utils/date';

interface RightPanelProps {
  adminUser: AdminUser | null;
  onOpenLogin: () => void;
  onEditProfile: () => void;
  onLogout: () => void;
  sedesWithIssues: SedeConEstado[];
  allSedesCount: number;
  historyList: RegistroHistorial[];
  onSelectSede?: (sede: SedeConEstado) => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  adminUser,
  onOpenLogin,
  onEditProfile,
  onLogout,
  sedesWithIssues,
  allSedesCount,
  historyList,
  onSelectSede,
}) => {
  // Determine overall security status
  const hasDesactivado = sedesWithIssues.some((s) => s.tiene_desactivado);
  const hasNovedad = sedesWithIssues.some((s) => s.tiene_novedad);

  // Dynamic security shield status configuration using #32CD32 for operative
  const securityStatus = hasDesactivado
    ? {
        label: 'Alerta Crítica',
        sublabel: `${sedesWithIssues.filter((s) => s.tiene_desactivado).length} sede(s) con sistemas desactivados`,
        icon: ShieldAlert,
        bgGradient: 'from-rose-500 to-red-600',
        badgeBg: 'bg-rose-100 text-rose-700',
        ringColor: 'ring-rose-500/20 text-rose-600',
        statusColor: 'text-rose-600',
      }
    : hasNovedad
    ? {
        label: 'Atención Requerida',
        sublabel: `${sedesWithIssues.filter((s) => s.tiene_novedad).length} sede(s) reportando novedad`,
        icon: ShieldAlert,
        bgGradient: 'from-amber-500 to-amber-600',
        badgeBg: 'bg-amber-100 text-amber-700',
        ringColor: 'ring-amber-500/20 text-amber-600',
        statusColor: 'text-amber-600',
      }
    : {
        label: '100% Operativo',
        sublabel: `Todas las ${allSedesCount} sedes sin novedades`,
        icon: ShieldCheck,
        bgGradient: 'from-[#32CD32] to-[#228B22]',
        badgeBg: 'bg-[#32CD32]/15 text-[#14532d] border border-[#32CD32]/30',
        ringColor: 'ring-[#32CD32]/20 text-[#32CD32]',
        statusColor: 'text-[#32CD32]',
      };

  const SecurityIcon = securityStatus.icon;

  // Group history items by "Hoy", "Ayer", and "Anteriores"
  const groupedHistory = React.useMemo(() => {
    const today = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toDateString();

    const groups: { [key: string]: RegistroHistorial[] } = {
      Hoy: [],
      Ayer: [],
      Anteriores: [],
    };

    historyList.slice(0, 8).forEach((item) => {
      const itemDate = new Date(item.fecha).toDateString();
      if (itemDate === today) {
        groups.Hoy.push(item);
      } else if (itemDate === yesterday) {
        groups.Ayer.push(item);
      } else {
        groups.Anteriores.push(item);
      }
    });

    return groups;
  }, [historyList]);

  return (
    <aside className="hidden lg:flex w-80 xl:w-88 flex-col gap-6 shrink-0 p-6 bg-white border-l border-slate-200 sticky top-0 h-screen overflow-y-auto">
      {/* 1. Admin Avatar Header with Neuromédica Colors */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1a1a37] via-[#00a6e4] to-[#00a6e4] flex items-center justify-center text-white shadow-md shadow-[#00a6e4]/20">
            {adminUser ? (
              <User className="w-10 h-10" />
            ) : (
              <Shield className="w-10 h-10 text-white" />
            )}
          </div>
          {adminUser && (
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#32CD32] border-2 border-white" />
          )}
        </div>

        <h3 className="text-base font-bold text-[#1a1a37]">
          {adminUser ? adminUser.nombre || 'Administrador' : 'Seguridad Neuromédica'}
        </h3>
        {adminUser && (
          <p className="text-xs text-[#646482] truncate max-w-[200px] mt-0.5">
            {adminUser.email}
          </p>
        )}

        {adminUser ? (
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              onClick={onEditProfile}
              className="text-xs px-2.5 py-1 rounded-lg text-[#00a6e4] hover:bg-[#00a6e4]/10 transition-colors font-medium cursor-pointer border border-[#00a6e4]/30"
              title="Cambiar contraseña o gestionar administradores"
            >
              Editar perfil
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors font-semibold cursor-pointer shadow-2xs"
              title="Cerrar sesión de administrador"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            className="text-xs text-[#00a6e4] hover:underline font-semibold mt-0.5 cursor-pointer flex items-center gap-1"
          >
            <Lock className="w-3 h-3" />
            Iniciar sesión de administrador
          </button>
        )}
      </div>

      {/* 2. Security Status Emblem with #32CD32 */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#646482]">
            Estado Global de Seguridad
          </span>
          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${securityStatus.badgeBg}`}>
            {securityStatus.label}
          </span>
        </div>

        {/* Big Icon Emblem */}
        <div className="flex items-center gap-4 py-2">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${securityStatus.bgGradient} shadow-md shrink-0`}>
            <SecurityIcon className="w-8 h-8" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-[#1a1a37] leading-tight">
              {securityStatus.label}
            </h4>
            <p className="text-xs text-[#646482] mt-1 leading-snug">
              {securityStatus.sublabel}
            </p>
          </div>
        </div>

        {/* Novedades list preview if any */}
        {sedesWithIssues.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
            <span className="text-[11px] font-semibold text-[#646482] block">
              Sedes que requieren atención:
            </span>
            {sedesWithIssues.slice(0, 3).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectSede && onSelectSede(s)}
                className="w-full text-left p-2 rounded-xl text-xs hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="font-semibold text-[#1a1a37] truncate">
                  {s.nombre}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                  s.tiene_desactivado
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {s.tiene_desactivado ? 'Desactivado' : 'Novedad'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. "Actividad reciente" Feed */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <h4 className="text-sm font-bold text-[#1a1a37] mb-3">
          Actividad reciente
        </h4>

        <div className="space-y-4 overflow-y-auto pr-1">
          {Object.entries(groupedHistory).map(([periodName, items]) => {
            if (items.length === 0) return null;

            return (
              <div key={periodName} className="space-y-2.5">
                <span className="text-xs font-semibold text-[#646482] block">
                  {periodName}
                </span>

                {items.map((item) => {
                  const isNovedad = item.tipo_evento === 'actualizacion' && (item.estado_camaras_nuevo === 'novedad' || item.estado_alarma_nuevo === 'novedad');
                  const isDesactivada = item.estado_camaras_nuevo === 'desactivado' || item.estado_alarma_nuevo === 'desactivado';

                  let tagLabel = 'ACTUALIZADA';
                  let tagClass = 'text-[#00a6e4] bg-[#00a6e4]/10';

                  if (isDesactivada) {
                    tagLabel = 'DESACTIVADA';
                    tagClass = 'text-rose-600 bg-rose-50';
                  } else if (isNovedad) {
                    tagLabel = 'NOVEDAD';
                    tagClass = 'text-amber-600 bg-amber-50';
                  } else if (item.tipo_evento === 'marcado_operativo') {
                    tagLabel = 'OPERATIVA';
                    tagClass = 'text-[#14532d] bg-[#32CD32]/20';
                  }

                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-[#00a6e4]/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <div className="p-2 rounded-xl bg-slate-50 shrink-0 text-[#646482]">
                          {isDesactivada ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#00a6e4]" />
                          )}
                        </div>
                        <div className="truncate">
                          <h6 className="text-xs font-bold text-[#1a1a37] truncate">
                            {item.sede_nombre}
                          </h6>
                          <p className="text-[10px] text-[#646482] truncate">
                            {item.estado_camaras_nuevo !== item.estado_camaras_anterior
                              ? `Cámaras: ${item.estado_camaras_nuevo}`
                              : `Alarma: ${item.estado_alarma_nuevo}`}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md ${tagClass}`}>
                          {tagLabel}
                        </span>
                        <span className="block text-[10px] text-[#646482] mt-0.5">
                          {formatBogotaTimeOnly(item.fecha)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
