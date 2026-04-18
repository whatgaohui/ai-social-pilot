"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileUp, Loader2, Sparkles, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

interface FragmentToolProps {
  isXHS: boolean;
  mode: "standalone" | "collapsible";
  defaultOpen?: boolean;
}

export function FragmentTool({ isXHS, mode, defaultOpen }: FragmentToolProps) {
  const persona = useAppStore((s) => s.persona);
  const knowledgeItems = useAppStore((s) => s.knowledgeItems);
  const platform = useAppStore((s) => s.platform);

  const [fragmentInput, setFragmentInput] = useState("");
  const [fragmentType, setFragmentType] = useState("conversation");
  const [fragmentResult, setFragmentResult] = useState("");
  const [fragmenting, setFragmenting] = useState(false);
  const [open, setOpen] = useState(defaultOpen ?? false);

  const handleFragmentGenerate = async () => {
    if (!fragmentInput.trim()) {
      toast.error("请输入碎片内容");
      return;
    }
    setFragmenting(true);
    setFragmentResult("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "fragment",
          persona,
          knowledgeItems,
          material: {
            type: "text",
            content: fragmentInput,
            contentType: fragmentType,
          },
          platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFragmentResult(data.content);
        toast.success(isXHS ? "碎片转化为笔记完成" : "碎片转化完成");
      }
    } catch {
      toast.error("转化失败");
    } finally {
      setFragmenting(false);
    }
  };

  const handleCopyInline = () => {
    if (fragmentResult) {
      navigator.clipboard.writeText(fragmentResult);
      toast.success("已复制");
    }
  };

  const handleCopy = () => {
    if (fragmentResult) {
      navigator.clipboard.writeText(fragmentResult);
      toast.success("已复制到剪贴板");
    }
  };

  const typeSelector = (
    <div className={mode === "collapsible" ? "flex gap-1.5" : "flex gap-2"}>
      {(["conversation", "experience", "question"] as const).map((type) => (
        <Button
          key={type}
          variant={fragmentType === type ? "secondary" : "ghost"}
          size="sm"
          className={`flex-1 ${mode === "collapsible" ? "h-7" : "h-7"} text-[10px]`}
          onClick={() => setFragmentType(type)}
        >
          {type === "conversation" ? "💬 对话" : type === "experience" ? "📖 经历" : "❓ 疑问"}
        </Button>
      ))}
    </div>
  );

  if (mode === "collapsible") {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <FileUp className="h-4 w-4 text-blue-500" />
                </div>
                <span className="text-sm font-medium">碎片转文案</span>
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
              placeholder="粘贴对话/想法..."
              value={fragmentInput}
              onChange={(e) => setFragmentInput(e.target.value)}
              className="min-h-[60px] resize-none text-sm"
            />
            {typeSelector}
            <Button
              onClick={handleFragmentGenerate}
              disabled={fragmenting || !fragmentInput.trim()}
              size="sm"
              className="w-full h-8"
            >
              {fragmenting ? (
                <><Loader2 className="h-3 w-3 mr-1 animate-spin" />AI转化中...</>
              ) : (
                <><Sparkles className="h-3 w-3 mr-1" />转化为文案</>
              )}
            </Button>
            {fragmentResult && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-2.5 border border-blue-100 dark:border-blue-900/30 relative">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">转化结果</span>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]" onClick={handleCopyInline}>
                      <Copy className="h-2.5 w-2.5 mr-0.5" />复制
                    </Button>
                  </div>
                  <p className="text-xs leading-relaxed whitespace-pre-wrap">{fragmentResult}</p>
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
    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <FileUp className="h-4 w-4 text-blue-500" />
          </div>
          碎片转文案
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          {isXHS ? '粘贴日常对话、截图文字等碎片内容，AI转化为小红书笔记' : '粘贴日常对话、截图文字等碎片内容，AI转化为优质朋友圈文案'}
        </p>
        <Textarea
          placeholder="粘贴对话记录、想法片段、聊天截图文字..."
          value={fragmentInput}
          onChange={(e) => setFragmentInput(e.target.value)}
          className="min-h-[80px] resize-none text-sm"
        />
        {typeSelector}
        <Button
          onClick={handleFragmentGenerate}
          disabled={fragmenting || !fragmentInput.trim()}
          size="sm"
          className="w-full"
        >
          {fragmenting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              AI转化中...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              转化为文案
            </>
          )}
        </Button>
        {fragmentResult && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rounded-lg bg-background p-3 border relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">转化结果</span>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={handleCopy}>
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </Button>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{fragmentResult}</p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
