"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ImagePlus,
  Loader2,
  Download,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface CoverImageGeneratorProps {
  postTopic: string;
  postContent: string;
}

const STYLE_PRESETS = [
  { label: "清新ins风", keywords: "，清新ins风，明亮色调，柔和光线，简约构图" },
  { label: "日系小清新", keywords: "，日系小清新，淡雅色彩，自然光线，文艺气息" },
  { label: "简约高级感", keywords: "，简约高级感，低饱和度，留白设计，质感十足" },
  { label: "复古胶片风", keywords: "，复古胶片风，暖色调，颗粒感，怀旧氛围" },
];

export function CoverImageGenerator({
  postTopic,
  postContent,
}: CoverImageGeneratorProps) {
  const [prompt, setPrompt] = useState(() =>
    `一张精美的小红书风格封面图，主题：${postTopic}。清新明亮，ins风格，3:4竖版构图，柔和渐变背景`
  );
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const defaultPrompt = useMemo(
    () =>
      `一张精美的小红书风格封面图，主题：${postTopic}。清新明亮，ins风格，3:4竖版构图，柔和渐变背景`,
    [postTopic]
  );

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error("请输入封面描述");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/cover-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        throw new Error("生成失败");
      }
      const data = await res.json();
      setImageUrl(data.imageUrl);
      toast.success("封面图生成成功！");
    } catch {
      toast.error("生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  }, [prompt]);

  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `xiaohongshu-cover-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("封面图已下载");
  }, [imageUrl]);

  const handlePresetSelect = useCallback(
    (preset: (typeof STYLE_PRESETS)[number]) => {
      // Build prompt from the default base + style keywords
      const baseTopic = postTopic || prompt.replace(/一张精美的小红书风格封面图，主题：/, '').split('。')[0];
      const newPrompt = `一张精美的小红书风格封面图，主题：${baseTopic}${preset.keywords}`;
      setPrompt(newPrompt);
      setActivePreset(preset.label);
      toast.success(`已应用「${preset.label}」风格`);
    },
    [postTopic, prompt]
  );

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
            <ImagePlus className="h-3.5 w-3.5 text-white" />
          </div>
          封面图生成
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Style Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">
            风格预设
          </span>
          <div className="flex flex-wrap gap-1.5">
            {STYLE_PRESETS.map((preset) => (
              <motion.button
                key={preset.label}
                whileTap={{ scale: 0.95 }}
                onClick={() => handlePresetSelect(preset)}
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                  activePreset === preset.label
                    ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm"
                    : "bg-white/60 dark:bg-white/10 text-muted-foreground hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400 border border-rose-200/50 dark:border-rose-800/30"
                }`}
              >
                {preset.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Prompt Input */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-muted-foreground font-medium">
            封面描述
          </span>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的封面图效果..."
            className="min-h-[72px] text-xs resize-none bg-white/60 dark:bg-white/5 border-rose-200/50 dark:border-rose-800/30 focus:border-rose-400 dark:focus:border-rose-600"
            rows={3}
          />
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          size="sm"
          className="w-full h-8 text-xs gap-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-sm"
        >
          {generating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              AI生成中...
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              {imageUrl ? "重新生成" : "生成封面"}
            </>
          )}
        </Button>

        {/* Image Preview */}
        <AnimatePresence mode="wait">
          {(generating || imageUrl) && (
            <motion.div
              key={generating ? "loading" : imageUrl || "empty"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              {/* Image Container */}
              <div className="relative mx-auto max-w-[200px]">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md">
                  {generating ? (
                    /* Loading shimmer */
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-200/60 to-pink-200/60 dark:from-rose-900/30 dark:to-pink-900/30">
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{
                          duration: 1.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 text-rose-400 animate-spin" />
                        <span className="text-[11px] text-rose-400 font-medium">
                          生成中...
                        </span>
                      </div>
                    </div>
                  ) : imageUrl ? (
                    /* Generated Image */
                    <img
                      src={imageUrl}
                      alt="生成的封面图"
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
              </div>

              {/* Action Buttons */}
              {!generating && imageUrl && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="flex gap-2 justify-center"
                >
                  <Button
                    onClick={handleDownload}
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Download className="h-3 w-3" />
                    下载
                  </Button>
                  <Button
                    onClick={handleRegenerate}
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <RefreshCw className="h-3 w-3" />
                    换一张
                  </Button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tip */}
        {!imageUrl && !generating && (
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            输入描述或选择风格预设，AI 将为你生成精美封面图
          </p>
        )}
      </CardContent>
    </Card>
  );
}
