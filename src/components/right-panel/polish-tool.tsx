"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wand2, Loader2, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

interface PolishToolProps {
  isXHS: boolean;
  mode: "standalone" | "collapsible";
  defaultOpen?: boolean;
}

export function PolishTool({ isXHS, mode, defaultOpen }: PolishToolProps) {
  const persona = useAppStore((s) => s.persona);
  const knowledgeItems = useAppStore((s) => s.knowledgeItems);
  const platform = useAppStore((s) => s.platform);
  const addNotification = useAppStore((s) => s.addNotification);
  const selectedPostId = useAppStore((s) => s.selectedPostId);

  const [polishInput, setPolishInput] = useState("");
  const [polishResult, setPolishResult] = useState("");
  const [polishing, setPolishing] = useState(false);
  const [open, setOpen] = useState(defaultOpen ?? false);

  const handlePolish = async () => {
    if (!polishInput.trim()) {
      toast.error("请输入需要润色的文字");
      return;
    }
    setPolishing(true);
    setPolishResult("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "polish",
          persona,
          knowledgeItems,
          existingContent: polishInput,
          platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPolishResult(data.content);
        toast.success(isXHS ? "笔记润色完成" : "润色完成");
        addNotification({
          type: "polish",
          title: "润色完成",
          description: isXHS ? "小红书笔记已通过AI润色优化" : "朋友圈文案已通过AI润色优化",
          postId: selectedPostId || undefined,
        });
        // Auto-save version snapshot for polish operation
        if (selectedPostId) {
          try {
            await fetch(`/api/content/${selectedPostId}/versions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content: polishInput,
                changeType: "polish",
                summary: "口水话润色",
                aiScore: 0,
              }),
            });
          } catch (e) {
            console.error("Failed to save version snapshot:", e);
          }
        }
      }
    } catch {
      toast.error("润色失败");
      addNotification({
        type: "error",
        title: "润色失败",
        description: "AI润色过程中出错，请重试",
      });
    } finally {
      setPolishing(false);
    }
  };

  const handleCopy = () => {
    if (polishResult) {
      navigator.clipboard.writeText(polishResult);
      toast.success("已复制到剪贴板");
    }
  };

  const handleCopyInline = () => {
    if (polishResult) {
      navigator.clipboard.writeText(polishResult);
      toast.success("已复制");
    }
  };

  if (mode === "collapsible") {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Wand2 className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm font-medium">口水话润色</span>
              </div>
              {open ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </CardContent>
          </Card>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-1 pb-3 space-y-2">
            <Textarea
              placeholder="粘贴大白话..."
              value={polishInput}
              onChange={(e) => setPolishInput(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
            />
            <Button
              onClick={handlePolish}
              disabled={polishing || !polishInput.trim()}
              size="sm"
              className="w-full h-8"
            >
              {polishing ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />AI润色中...</>
              ) : (
                <><Wand2 className="h-3 w-3 mr-1" />一键润色</>
              )}
            </Button>
            {polishResult && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2.5 border border-amber-100 dark:border-amber-900/30 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">润色结果</span>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={handleCopyInline}>
                      <Copy className="h-2.5 w-2.5 mr-0.5" />复制
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{polishResult}</p>
                </div>
              </motion.div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Standalone mode
  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Wand2 className="h-4 w-4 text-amber-500" />
          </div>
          口水话润色
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          {isXHS ? '把大白话粘贴进来，AI帮您优化成吸引人的小红书笔记' : '把大白话粘贴进来，AI帮您优化成优美的朋友圈文案'}
        </p>
        <Textarea
          placeholder="粘贴您的日常文字..."
          value={polishInput}
          onChange={(e) => setPolishInput(e.target.value)}
          className="min-h-[80px] resize-none text-sm"
        />
        <Button
          onClick={handlePolish}
          disabled={polishing || !polishInput.trim()}
          size="sm"
          className="w-full"
        >
          {polishing ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              AI润色中...
            </>
          ) : (
            <>
              <Wand2 className="h-3.5 w-3.5 mr-1.5" />
              一键润色
            </>
          )}
        </Button>

        {polishResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rounded-lg bg-background p-3 border relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">润色结果</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </Button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{polishResult}</p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
