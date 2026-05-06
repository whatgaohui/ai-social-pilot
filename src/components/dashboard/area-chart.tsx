'use client';

import { useState } from 'react';
import { formatNumber } from '@/components/account-card';

/** SVG Area Chart with cubic bezier curves, grid lines, tooltips, and dot markers */
export function AreaChart({ data, labels, height = 160 }: { data: number[]; labels: string[]; height?: number }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  if (!data || data.length < 2) return null;

  const width = 320;
  const padX = 28;
  const padY = 16;
  const chartW = width - padX * 2;
  const chartH = height - padY * 2;

  const maxVal = Math.max(...data, 1);
  const minVal = Math.min(...data, 0);
  const rangeVal = maxVal - minVal || 1;

  const points = data.map((val, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + (1 - (val - minVal) / rangeVal) * chartH;
    return { x, y };
  });

  // Build smooth cubic bezier path
  const tension = 0.3;
  let smoothPath = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;
    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    smoothPath += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  const areaPath = `${smoothPath} L ${points[points.length - 1].x},${height - padY} L ${points[0].x},${height - padY} Z`;

  // Grid lines
  const gridLines = 4;
  const gridYs = Array.from({ length: gridLines + 1 }, (_, i) => padY + (i / gridLines) * chartH);
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => Math.round(maxVal - (i / gridLines) * rangeVal));

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id="area-chart-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF2442" stopOpacity="0.25" />
          <stop offset="60%" stopColor="#FF2442" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FF2442" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridYs.map((y, i) => (
        <g key={`grid-${i}`}>
          <line x1={padX} y1={y} x2={width - padX} y2={y} stroke="currentColor" strokeOpacity="0.06" strokeWidth="1" />
          <text x={padX - 4} y={y + 3} textAnchor="end" fill="currentColor" fillOpacity="0.3" fontSize="8" fontFamily="system-ui">
            {formatNumber(gridValues[i])}
          </text>
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#area-chart-grad)" />

      {/* Smooth line */}
      <path d={smoothPath} fill="none" stroke="#FF2442" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dot markers */}
      {points.map((p, i) => (
        <g key={`dot-${i}`}>
          <circle
            cx={p.x} cy={p.y} r={hoveredIndex === i ? 5 : 3}
            fill={hoveredIndex === i ? "#FF2442" : "white"}
            stroke="#FF2442" strokeWidth="2"
            className="transition-all duration-200"
            style={{ cursor: "pointer" }}
          />
        </g>
      ))}

      {/* Hover line & tooltip */}
      {hoveredIndex !== null && points[hoveredIndex] && (
        <g>
          <line x1={points[hoveredIndex].x} y1={padY} x2={points[hoveredIndex].x} y2={height - padY} stroke="#FF2442" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3,3" />
          <rect
            x={points[hoveredIndex].x - 30}
            y={points[hoveredIndex].y - 28}
            width="60"
            height="20"
            rx="4"
            fill="#FF2442"
            fillOpacity="0.9"
          />
          <text
            x={points[hoveredIndex].x}
            y={points[hoveredIndex].y - 15}
            textAnchor="middle"
            fill="white"
            fontSize="10"
            fontWeight="600"
            fontFamily="system-ui"
          >
            {formatNumber(data[hoveredIndex])}
          </text>
        </g>
      )}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text key={`label-${i}`} x={p.x} y={height - 2} textAnchor="middle" fill="currentColor" fillOpacity="0.4" fontSize="9" fontFamily="system-ui">
          {labels[i] || ""}
        </text>
      ))}

      {/* Invisible hover areas */}
      {points.map((p, i) => (
        <rect
          key={`hover-${i}`}
          x={p.x - (chartW / data.length) / 2}
          y={0}
          width={chartW / data.length}
          height={height}
          fill="transparent"
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{ cursor: "pointer" }}
        />
      ))}
    </svg>
  );
}
