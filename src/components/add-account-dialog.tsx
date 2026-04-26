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
import { Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { toast } from "sonner";
import type { XhsAccountInfo } from "@/types";

export function AddAccountDialog() {
  const { addAccountDialogOpen, setAddAccountDialogOpen } = useAppStore();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [partialMessage, setPartialMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!url.trim()) {
      toast.error("请输入小红书主页链接");
      return;
    }

    if (!url.includes("xiaohongshu.com") && !url.includes("xhslink.com")) {
      toast.error("请输入有效的小红书链接");
      return;
    }

    setLoading(true);
    setPartialMessage(null);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xhsUrl: url.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "添加账号失败");
        return;
      }

      const account = data.data as XhsAccountInfo;

      // Trigger scraping
      let scrapeData: { success: boolean; data?: { partialData?: boolean; warnings?: string[]; scrapeMethod?: string }; error?: string } | null = null;
      try {
        const scrapeRes = await fetch(`/api/accounts/${account.id}/scrape`, { method: "POST" });
        scrapeData = await scrapeRes.json();
      } catch {
        toast.error("启动采集失败，请手动触发");
      }

      if (scrapeData?.success && scrapeData.data) {
        if (scrapeData.data.partialData) {
          // Partial data - keep dialog open, show warning
          toast.warning("⚠️ 小红书网站限制了直接访问，部分数据可能不完整。你可以手动补充账号信息。");
          setPartialMessage('⚠️ 数据采集不完整 - 小红书网站限制了直接访问，部分信息需要手动补充。你可以关闭此对话框，在账号详情中点击"编辑账号"来手动补充信息。');
        } else {
          toast.success("账号添加成功，数据采集完成！");
          setUrl("");
          setAddAccountDialogOpen(false);
        }
      } else {
        // Scraping failed completely - keep account, show error
        toast.error("账号已添加，但采集失败。小红书网站限制了访问，你可以手动补充账号信息。");
        setPartialMessage('采集失败，小红书网站限制了直接访问。你可以关闭此对话框，在账号详情中点击"编辑账号"来手动补充信息。');
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setUrl("");
      setPartialMessage(null);
    }
    setAddAccountDialogOpen(open);
  };

  return (
    <Dialog open={addAccountDialogOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加小红书账号</DialogTitle>
          <DialogDescription>
            输入小红书用户主页链接，系统将自动采集账号信息和笔记数据
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="xhs-url">小红书主页链接</Label>
            <Input
              id="xhs-url"
              placeholder="https://www.xiaohongshu.com/user/profile/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !loading) handleSubmit();
              }}
              disabled={loading}
            />
          </div>

          {partialMessage && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{partialMessage}</span>
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-medium text-foreground flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              如何获取链接
            </p>
            <p>1. 打开小红书App或网页版</p>
            <p>2. 进入目标用户的主页</p>
            <p>3. 复制浏览器地址栏中的链接</p>
            <p>4. 链接格式通常为 xiaohongshu.com/user/profile/xxx</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleClose(false)}
            disabled={loading}
          >
            {partialMessage ? "关闭" : "取消"}
          </Button>
          {!partialMessage && (
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
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
