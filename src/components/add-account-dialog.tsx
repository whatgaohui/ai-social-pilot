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
import { Loader2, ExternalLink } from "lucide-react";
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
  const [loading, setLoading] = useState(false);

  const resetAndClose = () => {
    setUrl("");
    setAddAccountDialogOpen(false);
  };

  const handleSubmit = async () => {
    const normalizedUrl = normalizeXhsUrl(url);

    if (!url.trim()) {
      toast.error("请输入小红书主页链接");
      return;
    }

    if (!normalizedUrl) {
      toast.error("请输入有效的小红书主页链接");
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
      let scrapeData: ScrapeResult | null = null;

      try {
        const scrapeRes = await fetch(`/api/accounts/${account.id}/scrape`, {
          method: "POST",
        });
        scrapeData = await scrapeRes.json().catch(() => null);
      } catch {
        scrapeData = null;
      }

      if (scrapeData?.success && scrapeData.data && !scrapeData.data.partialData) {
        toast.success("账号添加成功，数据采集完成");
      } else {
        toast.success("账号添加成功");
        toast.warning("小红书可能限制直接采集，稍后可重试采集或手动补充账号信息");
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
    }
    setAddAccountDialogOpen(open);
  };

  return (
    <Dialog open={addAccountDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加小红书账号</DialogTitle>
          <DialogDescription>
            输入小红书用户主页链接，系统会添加账号并尝试采集公开主页信息。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="xhs-url">小红书主页链接</Label>
            <Input
              id="xhs-url"
              placeholder="https://www.xiaohongshu.com/user/profile/..."
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !loading) handleSubmit();
              }}
              disabled={loading}
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              如何获取链接
            </p>
            <p>1. 打开小红书 App 或网页版</p>
            <p>2. 进入目标用户的主页</p>
            <p>3. 复制浏览器地址栏中的链接</p>
            <p>4. 支持带参数的链接，系统会自动保留干净主页地址</p>
          </div>
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
