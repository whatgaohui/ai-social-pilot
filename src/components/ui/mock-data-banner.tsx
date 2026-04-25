import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A compact banner indicating that the surrounding component displays
 * mock / simulated / sample data rather than real production data.
 *
 * Usage:  <MockDataBanner />
 */
export function MockDataBanner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5 rounded bg-amber-50 dark:bg-amber-950/20 py-1 px-2 text-[10px] text-amber-700 dark:text-amber-300", className)}>
      <Info className="h-3 w-3 flex-shrink-0" />
      <span>
        示例数据 — 此处展示为模拟数据，仅供参考
      </span>
    </div>
  );
}
