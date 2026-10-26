import React from 'react';
import { ResumenEstadisticas } from '../types';

interface DonutDistributionChartProps {
  stats: ResumenEstadisticas | null;
}

export const DonutDistributionChart: React.FC<DonutDistributionChartProps> = ({ stats }) => {
  if (!stats) return null;

  const total = stats.total_sedes || 1;
  const operativas = stats.operativas_100;
  const novedades = stats.con_novedad;
  const desactivadas = stats.con_desactivado;

  // Circumference for r=50 is 2 * PI * 50 = 314.16
  const circ = 314.16;
  const pctOp = operativas / total;
  const pctNov = novedades / total;
  const pctDes = desactivadas / total;

  const strokeOp = pctOp * circ;
  const strokeNov = pctNov * circ;
  const strokeDes = pctDes * circ;

  return (
    <div className="dashboard-card p-6 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-[#1E2545] dark:text-white">
            Distribución de Estados
          </h3>
          <span className="text-xs font-semibold text-[#8E9BB5] dark:text-slate-400">
            Total {total}
          </span>
        </div>
        <p className="text-xs text-[#8E9BB5] dark:text-slate-400 mb-4">
          Estado actual de cámaras y alarmas
        </p>
      </div>

      {/* Donut graphic */}
      <div className="relative flex items-center justify-center my-2">
        <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 140 140">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r="50"
            fill="none"
            stroke="#EAEFFD"
            className="dark:stroke-slate-800"
            strokeWidth="20"
          />

          {/* Operativo Arc (Blue) */}
          <circle
            cx="70"
            cy="70"
            r="50"
            fill="none"
            stroke="#5B7CFA"
            strokeWidth="20"
            strokeDasharray={`${strokeOp} ${circ}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />

          {/* Con Novedad Arc (Amber/Pink) */}
          {novedades > 0 && (
            <circle
              cx="70"
              cy="70"
              r="50"
              fill="none"
              stroke="#F497BE"
              strokeWidth="20"
              strokeDasharray={`${strokeNov} ${circ}`}
              strokeDashoffset={-strokeOp}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}

          {/* Desactivado Arc (Rose) */}
          {desactivadas > 0 && (
            <circle
              cx="70"
              cy="70"
              r="50"
              fill="none"
              stroke="#EF4444"
              strokeWidth="20"
              strokeDasharray={`${strokeDes} ${circ}`}
              strokeDashoffset={-(strokeOp + strokeNov)}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          )}
        </svg>

        {/* Center text */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold text-[#1E2545] dark:text-white">
            {Math.round(pctOp * 100)}%
          </span>
          <span className="text-[10px] font-bold text-[#8E9BB5] uppercase tracking-wider">
            Operativas
          </span>
        </div>
      </div>

      {/* Legend chips */}
      <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
        <div className="p-2 rounded-xl bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#5B7CFA]" />
            <span className="text-[11px] font-bold text-[#1E2545] dark:text-white">
              {operativas}
            </span>
          </div>
          <span className="text-[10px] text-[#8E9BB5]">Operativo</span>
        </div>

        <div className="p-2 rounded-xl bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#F497BE]" />
            <span className="text-[11px] font-bold text-[#1E2545] dark:text-white">
              {novedades}
            </span>
          </div>
          <span className="text-[10px] text-[#8E9BB5]">Novedad</span>
        </div>

        <div className="p-2 rounded-xl bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center justify-center gap-1.5 mb-0.5">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
            <span className="text-[11px] font-bold text-[#1E2545] dark:text-white">
              {desactivadas}
            </span>
          </div>
          <span className="text-[10px] text-[#8E9BB5]">Desactivado</span>
        </div>
      </div>
    </div>
  );
};
