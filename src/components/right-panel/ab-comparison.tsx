"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import type { ContentPost } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GitCompare, ChevronDown, ChevronUp, Loader2, Sparkles,
  Check, Copy, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface ABComparisonProps {
  post: ContentPost;
}

export function ABComparison({ post }: ABComparisonProps) {
  const { persona, knowledgeItems, updateContentPost } = useAppStore();
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [versionB, setVersionB] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<"a" | "b" | null>(null);
  const [applying, setApplying] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const generateAlternative = async () => {
    setGenerating(true);
    setVersionB("");
    setSelectedVersion(null);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto",
          persona,
          knowledgeItems,
          topic: post.topic,
          existingContent: post.content,
          tone: persona?.tone || "专业严谨",
          style: persona?.style || "均衡兼顾",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setVersionB(data.content);
        toast.success("B版本生成完成");
      } else {
        toast.error("生成失败");
      }
    } catch {
      toast.error("生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const applyVersion = async (version: "a" | "b") => {
    const content = version === "a" ? post.content : versionB;
    if (!content) return;

    setApplying(true);
    try {
      const res = await fetch(`/api/content/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (res.ok) {
        const updated = await res.json();
        updateContentPost(post.id, updated);
        toast.success(`已应用${version === "a" ? "A" : "B"}版本`);
        setSelectedVersion(null);
        setOpen(false);
        // Auto-save version record for the selected content
        try {
          await fetch(`/api/content/${post.id}/versions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: content,
              changeType: "optimize",
              summary: `A/B测试选择${version === "a" ? "A" : "B"}版本`,
              aiScore: post.aiScore,
            }),
          });
        } catch (e) {
          console.error("Failed to save version:", e);
        }
      } else {
        toast.error("应用失败");
      }
    } catch {
      toast.error("应用失败");
    } finally {
      setApplying(false);
    }
  };

  const handleCopy = (text: string) => {
    copy(text);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group/trig">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 flex items-center justify-center">
                <GitCompare className="h-4 w-4 text-violet-500" />
              </div>
              <span className="text-sm font-medium">A/B 对比测试</span>
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
        <div className="px-1 pb-3 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            AI为当前内容生成一个替代版本，对比选择更优方案
          </p>

          {!versionB ? (
            <Button
              onClick={generateAlternative}
              disabled={generating}
              size="sm"
              className="w-full h-8 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  生成B版本中...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  生成替代版本
                </>
              )}
            </Button>
          ) : (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {/* Version A */}
                <div
                  onClick={() => setSelectedVersion("a")}
                  className={`
                    relative rounded-lg border-2 p-3 cursor-pointer transition-all duration-200
                    ${selectedVersion === "a" 
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/20 ring-2 ring-violet-500/30" 
                      : "border-border hover:border-violet-300 dark:hover:border-violet-700"
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] h-5 bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300" variant="secondary">
                        A 版本 (当前)
                      </Badge>
                      {selectedVersion === "a" && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check className="h-3.5 w-3.5 text-violet-600" />
                        </motion.div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className={`h-5 px-1.5 ${copied ? "text-emerald-600" : ""}`} onClick={(e) => { e.stopPropagation(); handleCopy(post.content); }}>
                      {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{post.content}</p>
                </div>

                {/* Version B */}
                <div
                  onClick={() => setSelectedVersion("b")}
                  className={`
                    relative rounded-lg border-2 p-3 cursor-pointer transition-all duration-200
                    ${selectedVersion === "b"
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/30"
                      : "border-border hover:border-emerald-300 dark:hover:border-emerald-700"
                    }
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] h-5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" variant="secondary">
                        B 版本 (AI生成)
                      </Badge>
                      {selectedVersion === "b" && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        </motion.div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className={`h-5 px-1.5 ${copied ? "text-emerald-600" : ""}`} onClick={(e) => { e.stopPropagation(); handleCopy(versionB); }}>
                      {copied ? <Check className="h-2.5 w-2.5 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{versionB}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => applyVersion("a")}
                    disabled={applying || selectedVersion !== "a"}
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    应用A版本
                  </Button>
                  <Button
                    onClick={() => applyVersion("b")}
                    disabled={applying || selectedVersion !== "b"}
                    size="sm"
                    variant="outline"
                    className="flex-1 h-8 text-xs border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 disabled:opacity-50"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    应用B版本
                  </Button>
                  <Button
                    onClick={generateAlternative}
                    disabled={generating || applying}
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <RotateCcw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
