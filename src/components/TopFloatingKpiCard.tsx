import React from 'react';
import { Building2, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';
import { ResumenEstadisticas } from '../types';

interface TopFloatingKpiCardProps {
  stats: ResumenEstadisticas | null;
  onFilterChange: (filter: string) => void;
  activeFilter: string;
}

export const TopFloatingKpiCard: React.FC<TopFloatingKpiCardProps> = ({
  stats,
  onFilterChange,
  activeFilter,
}) => {
  if (!stats) return null;

  const total = stats.total_sedes || 1;
  const pctOperativas = Math.round((stats.operativas_100 / total) * 100);

  return (
    <div className="dashboard-card p-3.5 sm:p-5 lg:p-6 mb-4 sm:mb-6 bg-white border border-slate-200">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-4 items-center">
        {/* Total Sedes */}
        <button
          type="button"
          onClick={() => onFilterChange('todas')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'todas'
              ? 'border-[#00a6e4] bg-[#00a6e4]/5 ring-2 ring-[#00a6e4]/20'
              : 'border-slate-200/90 hover:border-[#00a6e4]/50 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-semibold text-[#646482]">
              Total Sedes
            </span>
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00a6e4]" />
          </div>
          <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1a1a37] tracking-tight">
            {stats.total_sedes}
          </span>
          <span className="block text-[10px] text-[#646482] mt-0.5 truncate">Sedes activas</span>
        </button>

        {/* 100% Operativas */}
        <button
          type="button"
          onClick={() => onFilterChange('operativas')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'operativas'
              ? 'border-[#32CD32] bg-[#32CD32]/10 ring-2 ring-[#32CD32]/20'
              : 'border-slate-200/90 hover:border-[#32CD32]/50 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-semibold text-[#646482]">
              Operativas
            </span>
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#32CD32]" />
          </div>
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1a1a37] tracking-tight">
              {stats.operativas_100}
            </span>
            <span className="text-[11px] sm:text-xs font-extrabold text-[#228B22]">
              {pctOperativas}%
            </span>
          </div>
          <span className="block text-[10px] text-[#646482] mt-0.5 truncate">Cámaras y alarma OK</span>
        </button>

        {/* Con Novedad */}
        <button
          type="button"
          onClick={() => onFilterChange('novedad')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'novedad'
              ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
              : 'border-slate-200/90 hover:border-amber-500/50 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-semibold text-[#646482]">
              Con Novedad
            </span>
            <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
          </div>
          <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1a1a37] tracking-tight">
            {stats.con_novedad}
          </span>
          <span className="block text-[10px] text-[#646482] mt-0.5 truncate">
            {stats.con_novedad > 0 ? 'Con nota explicativa' : 'Sin pendientes'}
          </span>
        </button>

        {/* Desactivadas */}
        <button
          type="button"
          onClick={() => onFilterChange('desactivadas')}
          className={`text-left p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
            activeFilter === 'desactivadas'
              ? 'border-rose-500 bg-rose-50/60 ring-2 ring-rose-500/20'
              : 'border-slate-200/90 hover:border-rose-500/50 bg-white'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] sm:text-xs font-semibold text-[#646482]">
              Desactivadas
            </span>
            <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" />
          </div>
          <span className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-[#1a1a37] tracking-tight">
            {stats.con_desactivado}
          </span>
          <span className="block text-[10px] text-[#646482] mt-0.5 truncate">
            {stats.con_desactivado === 0 ? 'Ninguna' : 'Atención urgente'}
          </span>
        </button>

        {/* Barra de Cobertura */}
        <div className="col-span-2 lg:col-span-1 p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 bg-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] sm:text-xs font-semibold text-[#646482]">
              Cobertura
            </span>
            <span className="text-xs font-extrabold text-[#1a1a37]">
              {pctOperativas}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${pctOperativas}%`,
                backgroundColor: pctOperativas === 100 ? '#32CD32' : '#00a6e4',
              }}
            />
          </div>
          <span className="block text-[10px] text-[#646482] mt-1.5 truncate">
            {stats.operativas_100} de {stats.total_sedes} al 100%
          </span>
        </div>
      </div>
    </div>
  );
};
