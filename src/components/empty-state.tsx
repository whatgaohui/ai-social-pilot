"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  demoLabel?: string;
  onDemoAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  demoLabel,
  onDemoAction,
  className,
}: EmptyStateProps) {
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemoAction = async () => {
    if (!onDemoAction) return;
    setDemoLoading(true);
    try {
      await onDemoAction();
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-4 text-center",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {actionLabel && onAction && (
          <Button onClick={onAction} className="bg-xhs hover:bg-xhs-dark text-white">
            {actionLabel}
          </Button>
        )}
        {demoLabel && onDemoAction && (
          <Button
            variant="outline"
            onClick={handleDemoAction}
            disabled={demoLoading}
          >
            {demoLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                加载中...
              </>
            ) : (
              demoLabel
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
