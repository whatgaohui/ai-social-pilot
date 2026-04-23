// ─── Chart Helper Utilities ──────────────────────────────────────────────────
// Pure utility functions for inline SVG chart rendering.
// No external dependencies — used by all chart components.

/**
 * Format a number for compact display.
 * 1200 → "1.2k", 35000 → "3.5w", 42 → "42"
 */
export function formatNumber(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

/**
 * Map a value to a color from a gradient palette.
 * Interpolates linearly between `colors` based on `value` position between `min` and `max`.
 */
export function getColorScale(
  value: number,
  min: number,
  max: number,
  colors: string[]
): string {
  if (colors.length === 0) return "#8b5cf6";
  if (colors.length === 1) return colors[0];
  const range = max - min;
  const clamped = Math.max(min, Math.min(max, value));
  const t = range === 0 ? 0 : (clamped - min) / range;
  const idx = t * (colors.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.min(lower + 1, colors.length - 1);
  if (lower === upper) return colors[lower];
  const frac = idx - lower;
  return interpolateColor(colors[lower], colors[upper], frac);
}

/**
 * Simple hex color interpolation.
 */
function interpolateColor(a: string, b: string, t: number): string {
  const ah = hexToRgb(a);
  const bh = hexToRgb(b);
  if (!ah || !bh) return a;
  const r = Math.round(ah.r + (bh.r - ah.r) * t);
  const g = Math.round(ah.g + (bh.g - ah.g) * t);
  const bl = Math.round(ah.b + (bh.b - ah.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Generate an SVG path string from data points.
 * If `smooth` is true, uses Catmull-Rom → cubic bezier curves.
 * Otherwise, generates straight line segments.
 */
export function generatePath(
  points: Array<{ x: number; y: number }>,
  smooth = true
): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (!smooth) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  }
  // Catmull-Rom to Bezier conversion for smooth curves
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/**
 * Safe percentage calculation: returns 0 if total is 0.
 */
export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.max((value / total) * 100, 0), 100);
}

/**
 * Determine trend direction from an array of numbers.
 * Compares last value to the second-to-last.
 * Returns 'up', 'down', or 'stable'.
 */
export function getTrendDirection(
  data: number[]
): "up" | "down" | "stable" {
  if (data.length < 2) return "stable";
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const diff = last - prev;
  const threshold = Math.max(Math.abs(prev) * 0.05, 0.5);
  if (diff > threshold) return "up";
  if (diff < -threshold) return "down";
  return "stable";
}

/**
 * Enhanced trend direction with percentage change.
 * Returns direction ('up'/'down'/'stable') and the percentage change.
 */
export function getTrendDirectionFull(
  data: number[]
): { direction: "up" | "down" | "stable"; percentage: number } {
  if (data.length < 2) return { direction: "stable", percentage: 0 };
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const direction = getTrendDirection(data);
  const percentage = prev === 0
    ? (last > 0 ? 100 : 0)
    : Math.round(((last - prev) / Math.abs(prev)) * 100);
  return { direction, percentage: Math.abs(percentage) };
}

/**
 * Alias for generatePath that always uses smooth bezier curves.
 * Provided for a more descriptive API name.
 */
export function generateSmoothPath(
  points: Array<{ x: number; y: number }>
): string {
  return generatePath(points, true);
}

/**
 * Framer-motion animation variants for chart entrance.
 * Use these as reusable animation configs for all chart components.
 */
export const chartAnimationVariants = {
  container: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  },
  item: {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
      },
    },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.6, delay: 0.2 },
    },
  },
} as const;

/**
 * Generate a unique SVG gradient ID.
 * Useful to avoid ID collisions when multiple charts render simultaneously.
 */
export function uniqueGradId(prefix: string, seed: string): string {
  return `${prefix}-${seed.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute nice tick values for an axis.
 * Returns approximately `count` evenly-spaced values from 0 to `maxVal`.
 */
export function niceScale(maxVal: number, count = 5): number[] {
  if (maxVal <= 0) return Array(count).fill(0);
  const roughStep = maxVal / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const residual = roughStep / magnitude;
  let niceStep: number;
  if (residual <= 1.5) niceStep = 1 * magnitude;
  else if (residual <= 3) niceStep = 2 * magnitude;
  else if (residual <= 7) niceStep = 5 * magnitude;
  else niceStep = 10 * magnitude;
  const ticks: number[] = [];
  for (let v = 0; v <= maxVal + niceStep * 0.5; v += niceStep) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

/**
 * Color palette for charts — purple-centric to match the app theme.
 */
export const CHART_PALETTE = {
  primary: "#8b5cf6",
  secondary: "#a855f7",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#f43f5e",
  info: "#06b6d4",
  rose: "#ec4899",
  amber: "#d97706",
  teal: "#14b8a6",
  slate: "#94a3b8",
  multi: [
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#f43f5e",
    "#06b6d4",
    "#ec4899",
    "#d97706",
    "#14b8a6",
  ],
  heatmap: [
    "rgba(139,92,246,0.05)",
    "rgba(139,92,246,0.2)",
    "rgba(139,92,246,0.4)",
    "rgba(139,92,246,0.65)",
    "rgba(139,92,246,0.9)",
  ],
} as const;
