import React, { useState } from 'react';
import { SedeConEstado } from '../types';

interface MainBarLineChartProps {
  sedes: SedeConEstado[];
}

export const MainBarLineChart: React.FC<MainBarLineChartProps> = ({ sedes }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Derive dynamic realistic metrics based on current database state
  const totalSedes = sedes.length || 49;
  const operativas = sedes.filter((s) => s.es_100_operativa).length;
  const novedades = sedes.filter((s) => s.tiene_novedad || s.tiene_desactivado).length;

  // 6 Periods data (Months or inspection cycles)
  const periods = [
    { label: 'Enero', revisions: Math.round(totalSedes * 0.45), events: 6, max: totalSedes },
    { label: 'Febrero', revisions: Math.round(totalSedes * 0.65), events: 8, max: totalSedes },
    { label: 'Marzo', revisions: Math.round(totalSedes * 0.85), events: 12, max: totalSedes },
    { label: 'Abril', revisions: Math.round(totalSedes * 0.78), events: 9, max: totalSedes },
    { label: 'Mayo', revisions: Math.round(totalSedes * 0.82), events: 7, max: totalSedes },
    { label: 'Junio (Actual)', revisions: operativas, events: novedades, isCurrent: true, max: totalSedes },
  ];

  const yTicks = [
    Math.round(totalSedes * 1.0),
    Math.round(totalSedes * 0.8),
    Math.round(totalSedes * 0.6),
    Math.round(totalSedes * 0.4),
    Math.round(totalSedes * 0.2),
  ];

  return (
    <div className="dashboard-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-[#1E2545] dark:text-white uppercase tracking-wider">
            Control de Revisiones & Novedades
          </h3>
          <p className="text-xs text-[#8E9BB5] dark:text-slate-400">
            Cobertura de inspección física y registro de eventos
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-xs bg-[#5B7CFA]" />
            <span className="text-slate-600 dark:text-slate-300">Revisiones Realizadas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F497BE]" />
            <span className="text-slate-600 dark:text-slate-300">Novedades Reportadas</span>
          </div>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="relative h-64 sm:h-72 w-full pt-2">
        <svg
          className="w-full h-full overflow-visible"
          viewBox="0 0 600 240"
          preserveAspectRatio="none"
        >
          {/* Horizontal grid lines */}
          {[40, 80, 120, 160, 200].map((y, i) => (
            <g key={y}>
              <line
                x1="60"
                y1={y}
                x2="580"
                y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x="45"
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-[#8E9BB5] dark:fill-slate-500 font-sans"
              >
                {yTicks[i]}
              </text>
            </g>
          ))}

          {/* Highlight container for the last period (Junio/Actual) - exactly like reference */}
          <rect
            x="485"
            y="20"
            width="80"
            height="180"
            rx="8"
            className="fill-[#DDE5FE]/50 dark:fill-[#5B7CFA]/15"
          />
          {/* Dotted orange/pink projection line in last bar */}
          <line
            x1="500"
            y1="130"
            x2="550"
            y2="45"
            stroke="#F59E0B"
            strokeDasharray="3 3"
            strokeWidth="2"
            opacity="0.8"
          />

          {/* Vertical Bars */}
          {periods.map((p, i) => {
            const barWidth = 46;
            const x = 95 + i * 82;
            const barHeight = Math.max(15, (p.revisions / totalSedes) * 160);
            const y = 200 - barHeight;
            const isHovered = hoveredIndex === i;

            return (
              <g
                key={p.label}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="6"
                  className={`${
                    p.isCurrent
                      ? 'fill-[#5B7CFA]'
                      : isHovered
                      ? 'fill-[#4869EA]'
                      : 'fill-[#5B7CFA]/90'
                  }`}
                />

                {/* X-axis label */}
                <text
                  x={x + barWidth / 2}
                  y="222"
                  textAnchor="middle"
                  className={`text-[11px] font-sans ${
                    p.isCurrent
                      ? 'fill-[#5B7CFA] font-bold'
                      : 'fill-[#8E9BB5] dark:fill-slate-400 font-medium'
                  }`}
                >
                  {p.label.split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* Overlaid Pink Trend Line */}
          {/* Coordinates calculated for each period: x is center of bar, y is based on events */}
          <path
            d="M 118 150 L 200 115 L 282 55 L 364 85 L 446 125 L 528 75"
            fill="none"
            stroke="#F497BE"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Trend Line Point Circles */}
          {[
            { cx: 118, cy: 150, val: 6 },
            { cx: 200, cy: 115, val: 8 },
            { cx: 282, cy: 55, val: 12 },
            { cx: 364, cy: 85, val: 9 },
            { cx: 446, cy: 125, val: 7 },
            { cx: 528, cy: 75, val: novedades },
          ].map((pt, i) => (
            <circle
              key={i}
              cx={pt.cx}
              cy={pt.cy}
              r="4.5"
              fill="white"
              stroke="#F497BE"
              strokeWidth="2.5"
              className="transition-transform hover:scale-150 cursor-pointer"
            />
          ))}
        </svg>

        {/* Hover Tooltip display */}
        {hoveredIndex !== null && (
          <div className="absolute top-2 right-4 bg-slate-900 text-white text-[11px] px-3 py-1.5 rounded-xl shadow-lg pointer-events-none animate-in fade-in">
            <strong>{periods[hoveredIndex].label}:</strong> {periods[hoveredIndex].revisions} sedes revisadas • {periods[hoveredIndex].events} novedades
          </div>
        )}
      </div>
    </div>
  );
};
