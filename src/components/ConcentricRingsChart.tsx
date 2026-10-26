import React from 'react';
import { SedeConEstado } from '../types';

interface ConcentricRingsChartProps {
  sedes: SedeConEstado[];
}

export const ConcentricRingsChart: React.FC<ConcentricRingsChartProps> = ({ sedes }) => {
  // Calculate real metrics for key groups
  const calculateGroupCoverage = (groupPrefix: string) => {
    const groupSedes = sedes.filter((s) => s.grupo.toUpperCase().includes(groupPrefix.toUpperCase()));
    if (groupSedes.length === 0) return { total: 0, pct: 100 };
    const op = groupSedes.filter((s) => s.es_100_operativa).length;
    return { total: groupSedes.length, pct: Math.round((op / groupSedes.length) * 100) };
  };

  const sf = calculateGroupCoverage('SF');
  const ips = calculateGroupCoverage('IPS');
  const farma = calculateGroupCoverage('DROGUERÍAS');
  const cedi = calculateGroupCoverage('CEDI');

  const rings = [
    { label: 'SF Puntos de Venta', pct: sf.pct, color: '#5B7CFA', r: 54, stroke: 10 },
    { label: 'Sedes IPS', pct: ips.pct, color: '#373D84', r: 42, stroke: 10 },
    { label: 'Droguerías & Farma', pct: farma.pct, color: '#F497BE', r: 30, stroke: 10 },
    { label: 'CEDI & Admin', pct: cedi.pct, color: '#FCE278', r: 18, stroke: 10 },
  ];

  return (
    <div className="dashboard-card p-6 flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-[#1E2545] dark:text-white mb-1">
          Estado por Grupo de Sedes
        </h3>
        <p className="text-xs text-[#8E9BB5] dark:text-slate-400 mb-4">
          % de operatividad y cobertura por grupo
        </p>

        {/* Legend list on top matching reference */}
        <div className="space-y-1.5 mb-2">
          {rings.map((ring) => (
            <div key={ring.label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ring.color }}
                />
                <span className="font-medium text-slate-600 dark:text-slate-300 truncate">
                  {ring.label}
                </span>
              </div>
              <span className="font-bold text-[#1E2545] dark:text-white">
                {ring.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Concentric Arcs Graphic (Exact replica of reference concentric rings) */}
      <div className="flex items-center justify-center pt-2">
        <svg className="w-44 h-44 -rotate-90 transform" viewBox="0 0 140 140">
          {rings.map((ring) => {
            const circ = 2 * Math.PI * ring.r;
            // Max arc span is 270 degrees (3/4 of circle) like in the reference
            const maxSpan = 0.75 * circ;
            const strokeDash = (ring.pct / 100) * maxSpan;

            return (
              <g key={ring.label}>
                {/* Background track */}
                <circle
                  cx="70"
                  cy="70"
                  r={ring.r}
                  fill="none"
                  stroke="#EAEFFD"
                  className="dark:stroke-slate-800"
                  strokeWidth={ring.stroke}
                  strokeDasharray={`${maxSpan} ${circ}`}
                  strokeLinecap="round"
                />
                {/* Colored progress arc */}
                <circle
                  cx="70"
                  cy="70"
                  r={ring.r}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={ring.stroke}
                  strokeDasharray={`${strokeDash} ${circ}`}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
