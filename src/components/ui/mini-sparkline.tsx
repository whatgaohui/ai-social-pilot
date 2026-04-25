"use client";

import { useMemo } from "react";

interface MiniSparklineProps {
  /** Array of numeric data points */
  data: number[];
  /** Width of the SVG (px) - default 80 */
  width?: number;
  /** Height of the SVG (px) - default 24 */
  height?: number;
  /** Stroke color - default "currentColor" */
  color?: string;
  /** Stroke width - default 1.5 */
  strokeWidth?: number;
  /** Whether to show gradient fill - default true */
  fill?: boolean;
  /** Fill color (gradient start) - defaults to color with 0.15 opacity */
  fillColor?: string;
  /** Whether to show the latest value dot - default false */
  showDot?: boolean;
  /** Dot radius - default 2.5 */
  dotRadius?: number;
  /** Whether to smooth the line using bezier curves - default true */
  smooth?: boolean;
  /** CSS class name */
  className?: string;
  /** Animate the path drawing - default false */
  animate?: boolean;
}

export function MiniSparkline({
  data,
  width = 80,
  height = 24,
  color = "currentColor",
  strokeWidth = 1.5,
  fill = true,
  fillColor,
  showDot = false,
  dotRadius = 2.5,
  smooth = true,
  className = "",
  animate = false,
}: MiniSparklineProps) {
  const pathD = useMemo(() => {
    if (!data || data.length < 2) return "";

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = strokeWidth;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (width - padding * 2);
      const y = padding + (1 - (value - min) / range) * (height - padding * 2);
      return { x, y };
    });

    if (smooth && points.length > 2) {
      // Catmull-Rom to Bezier conversion for smooth curves
      let d = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        const tension = 0.3;
        const cp1x = p1.x + (p2.x - p0.x) * tension;
        const cp1y = p1.y + (p2.y - p0.y) * tension;
        const cp2x = p2.x - (p3.x - p1.x) * tension;
        const cp2y = p2.y - (p3.y - p1.y) * tension;

        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
      return d;
    }

    // Simple polyline
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  }, [data, width, height, strokeWidth, smooth]);

  const gradientId = useMemo(() => `sparkline-${Math.random().toString(36).slice(2, 8)}`, []);

  if (!data || data.length < 2) return null;

  const fillGradient = fillColor || color;
  const lastPoint = data[data.length - 1];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = strokeWidth;
  const lastX = padding + (width - padding * 2);
  const lastY = padding + (1 - (lastPoint - min) / range) * (height - padding * 2);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      fill="none"
      role="img"
      aria-label={`Sparkline chart with ${data.length} data points`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillGradient} stopOpacity="0.2" />
          <stop offset="100%" stopColor={fillGradient} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Fill area */}
      {fill && (
        <path
          d={`${pathD} L ${lastX} ${height} L ${padding} ${height} Z`}
          fill={`url(#${gradientId})`}
        />
      )}

      {/* Line */}
      <path
        d={pathD}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={animate ? {
          strokeDasharray: 1000,
          strokeDashoffset: 1000,
          animation: `sparkline-draw 1s ease-out forwards`,
        } : undefined}
      />

      {/* End dot */}
      {showDot && (
        <circle
          cx={lastX}
          cy={lastY}
          r={dotRadius}
          fill={color}
          className="animate-pulse"
        />
      )}
    </svg>
  );
}

/* Inline keyframe for animated sparklines */
const style = document.createElement("style");
style.textContent = `
  @keyframes sparkline-draw {
    to { stroke-dashoffset: 0; }
  }
`;
if (typeof document !== "undefined" && !document.getElementById("sparkline-style")) {
  style.id = "sparkline-style";
  document.head.appendChild(style);
}
