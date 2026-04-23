"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

interface EnhancedTooltipProps {
  title: string;
  description?: string;
  shortcut?: string;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  delayDuration?: number;
}

export function EnhancedTooltip({
  title,
  description,
  shortcut,
  children,
  side = "bottom",
  className,
  delayDuration = 500,
}: EnhancedTooltipProps) {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            className={cn(
              "z-50 w-fit max-w-[240px] rounded-lg border bg-popover px-3 py-2 text-popover-foreground shadow-md",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
              className
            )}
          >
            {/* Arrow */}
            <TooltipPrimitive.Arrow className="bg-popover fill-popover size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
            <div className="space-y-1">
              <p className="text-xs font-semibold">{title}</p>
              {description && (
                <p className="text-[11px] text-muted-foreground leading-relaxed">{description}</p>
              )}
              {shortcut && (
                <div className="flex items-center gap-1.5 pt-0.5">
                  <kbd className="tooltip-shortcut inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/20 bg-muted px-1.5 font-mono text-[10px] text-muted-foreground font-medium">
                    {shortcut}
                  </kbd>
                </div>
              )}
            </div>
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
