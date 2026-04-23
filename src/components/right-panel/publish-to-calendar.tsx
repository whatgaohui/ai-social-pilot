"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  CONTENT_TYPE_LABELS, CONTENT_TYPE_COLORS,
  XHS_CONTENT_TYPE_LABELS, XHS_CONTENT_TYPE_COLORS,
  ContentType, XHSContentType,
} from "@/types";
import { CalendarPlus, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { safeFormat } from "@/lib/safe-date";
import { useAppStore } from "@/store/app-store";

interface PublishToCalendarProps {
  isXHS: boolean;
  mode: "standalone" | "collapsible";
  defaultOpen?: boolean;
}

function getContentTypeColor(ct: string, isXHS: boolean) {
  if (isXHS) return XHS_CONTENT_TYPE_COLORS[ct as XHSContentType] || '';
  return CONTENT_TYPE_COLORS[ct as ContentType] || '';
}

export function PublishToCalendar({ isXHS, mode, defaultOpen }: PublishToCalendarProps) {
  const currentPlan = useAppStore((s) => s.currentPlan);
  const addContentPost = useAppStore((s) => s.addContentPost);
  const platform = useAppStore((s) => s.platform);
  const addNotification = useAppStore((s) => s.addNotification);

  const [pubTopic, setPubTopic] = useState("");
  const [pubContent, setPubContent] = useState("");
  const [pubContentType, setPubContentType] = useState<ContentType>("text");
  const [pubDate, setPubDate] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [open, setOpen] = useState(defaultOpen ?? false);

  const contentTypeOptions = isXHS
    ? (Object.entries(XHS_CONTENT_TYPE_LABELS) as [XHSContentType, string][]).map(([value, label]) => ({ value, label }))
    : (Object.entries(CONTENT_TYPE_LABELS) as [ContentType, string][]).map(([value, label]) => ({ value, label }));

  const handlePublishToCalendar = async () => {
    if (!pubContent.trim()) {
      toast.error("请输入文案内容");
      return;
    }
    if (!pubTopic.trim()) {
      toast.error("请输入主题");
      return;
    }
    if (!pubDate) {
      toast.error("请选择发布日期");
      return;
    }
    if (!currentPlan?.id) {
      toast.error("请先生成内容计划");
      return;
    }

    setPublishing(true);
    try {
      const dateStr = safeFormat(new Date(pubDate), 'yyyy-MM-dd');
      const res = await fetch("/api/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: currentPlan.id,
          scheduledDate: dateStr,
          contentType: pubContentType,
          topic: pubTopic,
          content: pubContent,
          platform,
          status: "generated",
          generationType: "polish",
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          favorites: 0,
          aiScore: 0,
          feedback: "",
        }),
      });

      if (res.ok) {
        const newPost = await res.json();
        addContentPost(newPost);
        toast.success("已发布到日历！");
        addNotification({
          type: "publish",
          title: "内容已添加到日历",
          description: `"${pubTopic}" 已添加到 ${safeFormat(new Date(pubDate), 'MM-dd')} 的发布计划`,
          postId: newPost.id,
        });
        setPubTopic("");
        setPubContent("");
        setPubDate("");
        setPubContentType("text");
        setOpen(false);
      } else {
        toast.error("发布失败，请重试");
      }
    } catch {
      toast.error("发布失败");
    } finally {
      setPublishing(false);
    }
  };

  const compact = mode === "collapsible";

  const publishForm = (
    <div className="space-y-2">
      <Input
        placeholder="输入主题"
        value={pubTopic}
        onChange={(e) => setPubTopic(e.target.value)}
        className="text-sm h-8"
      />
      <Textarea
        placeholder="输入文案内容..."
        value={pubContent}
        onChange={(e) => setPubContent(e.target.value)}
        className={`resize-none text-sm ${compact ? "min-h-[60px]" : "min-h-[80px]"}`}
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <div className="flex flex-wrap gap-1">
            {contentTypeOptions.map((ct) => (
              <Button
                key={ct.value}
                variant={pubContentType === ct.value ? "secondary" : "ghost"}
                size="sm"
                className={`h-6 px-2 text-[10px] ${pubContentType === ct.value ? getContentTypeColor(ct.value, isXHS) : ""}`}
                onClick={() => setPubContentType(ct.value)}
              >
                {ct.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <Input
        type="date"
        value={pubDate}
        onChange={(e) => setPubDate(e.target.value)}
        className="text-sm h-8"
      />
      <Button
        onClick={handlePublishToCalendar}
        disabled={publishing || !pubContent.trim() || !pubTopic.trim() || !pubDate}
        size="sm"
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        {publishing ? (
          <><Loader2 className="h-3 w-3 mr-1.5 animate-spin" />发布中...</>
        ) : (
          <><CalendarPlus className="h-3 w-3 mr-1.5" />发布到日历</>
        )}
      </Button>
    </div>
  );

  const noPlanWarning = !currentPlan?.id ? (
    <div className={`rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2.5 ${compact ? "mb-2" : ""}`}>
      <p className="text-[10px] text-amber-600 dark:text-amber-400">
        ⚠️ 请先生成内容计划后再发布
      </p>
    </div>
  ) : null;

  if (mode === "collapsible") {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="w-full">
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CalendarPlus className="h-4 w-4 text-emerald-500" />
                </div>
                <span className="text-sm font-medium">发布新内容到日历</span>
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
          <div className="px-3 pb-3">
            {noPlanWarning}
            {publishForm}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Standalone mode
  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <CalendarPlus className="h-4 w-4 text-emerald-500" />
          </div>
          发布到日历
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          将文案直接创建为日历内容，快速排期发布
        </p>
        {noPlanWarning}
        {publishForm}
      </CardContent>
    </Card>
  );
}
