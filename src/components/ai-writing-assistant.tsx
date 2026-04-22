"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sparkles,
  Wand2,
  FileText,
  MessageSquare,
  Lightbulb,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useIsMobile } from "@/hooks/use-mobile";

interface WritingAction {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
  action: () => void;
}

export function AIWritingAssistant() {
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { setRightPanelTab, setSelectedPostId } = useAppStore();

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setExpanded(false);
      }
    }
    if (expanded) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [expanded]);

  const actions: WritingAction[] = [
    {
      id: "polish",
      icon: Wand2,
      label: "口水话润色",
      description: "将口语化内容润色为专业文案",
      color: "from-violet-500 to-purple-600",
      action: () => {
        setRightPanelTab("workspace");
        setExpanded(false);
      },
    },
    {
      id: "fragment",
      icon: MessageSquare,
      label: "碎片转文案",
      description: "将零散想法转化为完整内容",
      color: "from-emerald-500 to-teal-600",
      action: () => {
        setRightPanelTab("workspace");
        setExpanded(false);
      },
    },
    {
      id: "batch",
      icon: FileText,
      label: "批量生成计划",
      description: "AI一键生成30天内容计划",
      color: "from-amber-500 to-orange-600",
      action: () => {
        setRightPanelTab("workspace");
        setExpanded(false);
      },
    },
    {
      id: "inspiration",
      icon: Lightbulb,
      label: "爆款灵感",
      description: "获取创意话题和标题灵感",
      color: "from-rose-500 to-pink-600",
      action: () => {
        setRightPanelTab("workspace");
        setExpanded(false);
      },
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div ref={menuRef} className="fixed z-40 bottom-20 right-4 sm:bottom-6 sm:right-6">
        {/* Expanded menu */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              className="absolute bottom-14 right-0 w-56 rounded-2xl bg-background/95 backdrop-blur-xl border border-border/50 shadow-xl p-2"
            >
              <div className="flex items-center justify-between px-2 py-1.5 mb-1">
                <span className="text-xs font-semibold text-foreground">AI 写作助手</span>
                <button
                  onClick={() => setExpanded(false)}
                  className="h-5 w-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="space-y-0.5 stagger-children">
                {actions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Tooltip key={action.id}>
                      <TooltipTrigger asChild>
                        <motion.button
                          whileHover={{ x: 2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={action.action}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted/70 transition-colors group"
                        >
                          <div className={`flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shadow-sm`}>
                            <Icon className="h-4 w-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">{action.label}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{action.description}</div>
                          </div>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-xs">
                        <p>{action.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpanded(!expanded)}
              className={`relative h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
                expanded
                  ? "bg-muted text-foreground rotate-0"
                  : "bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-violet-300/50 dark:shadow-violet-900/50"
              }`}
            >
              <motion.div
                animate={{ rotate: expanded ? 0 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {expanded ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Sparkles className="h-5 w-5" />
                )}
              </motion.div>
              {/* Pulse ring when closed */}
              {!expanded && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-purple-600"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            <p>{expanded ? "关闭" : "AI 写作助手"}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
