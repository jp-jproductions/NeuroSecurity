import React from 'react';
import { History, Clock, FileText, CheckCheck, Edit3, AlertCircle } from 'lucide-react';
import { SedeConEstado } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatBogotaDate } from '../utils/date';

interface SedeCardProps {
  sede: SedeConEstado;
  isAdmin?: boolean;
  onViewHistory: (sede: SedeConEstado) => void;
  onEditStatus?: (sede: SedeConEstado) => void;
  onMarkOperational?: (sede: SedeConEstado) => void;
}

export const SedeCard: React.FC<SedeCardProps> = ({
  sede,
  isAdmin = false,
  onViewHistory,
  onEditStatus,
  onMarkOperational,
}) => {
  const hasDesactivado = sede.tiene_desactivado;
  const hasNovedad = sede.tiene_novedad;

  let cardStyle = 'dashboard-card hover:-translate-y-0.5 hover:border-[#00a6e4]/40';
  let badgeHighlight = null;

  if (hasDesactivado) {
    cardStyle = 'dashboard-card border-rose-300 bg-rose-50/20 ring-1 ring-rose-400/30 hover:-translate-y-0.5';
    badgeHighlight = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500 text-white shadow-xs">
        <AlertCircle className="w-3 h-3" /> Desactivado
      </span>
    );
  } else if (hasNovedad) {
    cardStyle = 'dashboard-card border-amber-300 bg-amber-50/20 ring-1 ring-amber-400/30 hover:-translate-y-0.5';
    badgeHighlight = (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-xs">
        <AlertCircle className="w-3 h-3" /> Con Novedad
      </span>
    );
  }

  return (
    <div className={`p-5 flex flex-col justify-between ${cardStyle}`}>
      <div>
        {/* Top: Group Tag in Neuromédica Colors & Highlight */}
        <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-[#1a1a37]/5 text-[#1a1a37] border border-[#1a1a37]/10">
            {sede.grupo}
          </span>
          {badgeHighlight}
        </div>

        {/* Sede Name */}
        <h3 className="text-base font-bold text-[#1a1a37] leading-snug mb-3">
          {sede.nombre}
        </h3>

        {/* System Badges: Stacked rows so text never overflows */}
        <div className="flex flex-col gap-2 mb-3.5">
          <StatusBadge type="camaras" status={sede.estado_camaras} size="md" />
          <StatusBadge type="alarma" status={sede.estado_alarma} size="md" />
        </div>

        {/* Note if any */}
        {sede.nota ? (
          <div className={`p-3 rounded-2xl text-xs mb-3 border ${
            hasNovedad || hasDesactivado
              ? 'bg-amber-50/70 text-amber-900 border-amber-200'
              : 'bg-slate-50 text-slate-700 border-slate-200/80'
          }`}>
            <div className="flex items-start gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="font-bold block text-[10px] uppercase tracking-wider opacity-75">
                  Novedad:
                </span>
                <p className="mt-0.5 leading-relaxed">{sede.nota}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer: Date & History button */}
      <div className="pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between text-xs text-[#646482] mb-2">
          <div className="flex items-center gap-1.5 truncate">
            <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
            <span className="truncate">
              {formatBogotaDate(sede.fecha_revision)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onViewHistory(sede)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00a6e4] hover:text-[#008ec5] transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            Historial
          </button>
        </div>

        {/* Admin Quick Actions using #32CD32 for OK */}
        {isAdmin && (
          <div className="flex items-center gap-2 pt-2 border-t border-dashed border-slate-100">
            {!sede.es_100_operativa && onMarkOperational && (
              <button
                type="button"
                onClick={() => onMarkOperational(sede)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#32CD32] hover:bg-[#2bb82b] text-white transition-colors cursor-pointer shadow-xs"
                title="Marcar como operativa"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar OK
              </button>
            )}

            {onEditStatus && (
              <button
                type="button"
                onClick={() => onEditStatus(sede)}
                className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sede.es_100_operativa
                    ? 'flex-1 bg-[#00a6e4] hover:bg-[#008ec5] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-[#1a1a37] border border-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editar
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
