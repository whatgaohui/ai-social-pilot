"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, Cookie, Globe } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import type { XhsAccountInfo } from "@/types";

type ScrapeResult = {
  success: boolean;
  data?: {
    partialData?: boolean;
    warnings?: string[];
    scrapeMethod?: string;
  };
  error?: string;
};

function normalizeXhsUrl(input: string): string {
  const trimmed = input.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();

    if (!host.includes("xiaohongshu.com") && !host.includes("xhslink.com")) {
      return "";
    }

    parsed.hash = "";

    if (host.includes("xiaohongshu.com")) {
      const profileMatch = parsed.pathname.match(/^\/user\/profile\/([^/?#]+)/);

      if (!profileMatch) {
        return "";
      }

      return `${parsed.origin}/user/profile/${profileMatch[1]}`;
    }

    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return "";
  }
}

export function AddAccountDialog() {
  const { addAccountDialogOpen, setAddAccountDialogOpen } = useAppStore();
  const [url, setUrl] = useState("");
  const [cookies, setCookies] = useState("");
  const [method, setMethod] = useState<"cookie" | "search">("cookie");
  const [loading, setLoading] = useState(false);

  const resetAndClose = () => {
    setUrl("");
    setCookies("");
    setMethod("cookie");
    setAddAccountDialogOpen(false);
  };

  const handleSubmit = async () => {
    const normalizedUrl = normalizeXhsUrl(url);

    if (!url.trim()) {
      toast.error("请输入小红书主页链接");
      return;
    }

    if (!normalizedUrl) {
      toast.error("请输入有效的小红书主页链接，格式如 https://www.xiaohongshu.com/user/profile/...");
      return;
    }

    if (method === "cookie" && !cookies.trim()) {
      toast.error("请选择采集方式或粘贴 Cookie");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xhsUrl: normalizedUrl }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        toast.error(data?.error || "添加账号失败");
        return;
      }

      const account = data.data as XhsAccountInfo;

      const scrapeBody: { method: string; cookies?: string } = { method };
      if (method === "cookie") {
        scrapeBody.cookies = cookies.trim();
      }

      let scrapeData: ScrapeResult | null = null;

      try {
        const scrapeRes = await fetch(`/api/accounts/${account.id}/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(scrapeBody),
        });
        scrapeData = await scrapeRes.json().catch(() => null);
      } catch {
        scrapeData = null;
      }

      if (scrapeData?.success && scrapeData.data && !scrapeData.data.partialData) {
        toast.success("账号添加成功，数据采集完成");
      } else if (scrapeData?.success) {
        toast.success("账号添加成功");
        const warnings = scrapeData.data?.warnings || [];
        if (warnings.length > 0) {
          toast.warning(warnings[0]);
        }
      } else {
        toast.warning("账号已添加，但数据采集失败，可稍后重试");
      }

      resetAndClose();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setUrl("");
      setCookies("");
      setMethod("cookie");
    }
    setAddAccountDialogOpen(open);
  };

  return (
    <Dialog open={addAccountDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>添加小红书账号</DialogTitle>
          <DialogDescription>
            输入小红书用户主页链接，并选择采集方式。推荐使用 Cookie 采集以获得完整数据。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* URL Input */}
          <div className="space-y-2">
            <Label htmlFor="xhs-url">小红书主页链接</Label>
            <Input
              id="xhs-url"
              placeholder="https://www.xiaohongshu.com/user/profile/..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !loading && method !== "cookie") handleSubmit();
              }}
              disabled={loading}
            />
          </div>

          {/* Method Selection */}
          <Tabs value={method} onValueChange={(v) => setMethod(v as "cookie" | "search")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cookie" className="flex items-center gap-1.5">
                <Cookie className="w-3.5 h-3.5" />
                Cookie 采集
              </TabsTrigger>
              <TabsTrigger value="search" className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                搜索采集
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cookie" className="space-y-2 mt-3">
              <Label htmlFor="xhs-cookie">登录 Cookie</Label>
              <Textarea
                id="xhs-cookie"
                placeholder="粘贴浏览器 DevTools 中的 Cookie 字符串，格式如 a1=xxx; webId=xxx; web_session=xxx..."
                className="min-h-[80px] font-mono text-xs"
                value={cookies}
                onChange={(e) => setCookies(e.target.value)}
                disabled={loading}
              />
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  如何获取 Cookie
                </p>
                <p>1. 在浏览器中打开小红书网页版并登录</p>
                <p>2. 按 F12 打开开发者工具 → Network 标签</p>
                <p>3. 刷新页面，点击任意请求</p>
                <p>4. 在 Headers 中找到 Cookie，复制整行值</p>
                <p>5. 粘贴到上方文本框</p>
              </div>
            </TabsContent>

            <TabsContent value="search" className="mt-3">
              <div className="bg-amber-500/10 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-200 space-y-1">
                <p className="font-medium">搜索采集说明</p>
                <p>无需 Cookie，通过搜索公开页面采集。可能无法获取完整的笔记列表和互动数据。</p>
                <p>需要配置 .z-ai-config 才能使用此功能。</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={loading}>
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-xhs hover:bg-xhs-dark text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                添加中...
              </>
            ) : (
              "添加账号"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
