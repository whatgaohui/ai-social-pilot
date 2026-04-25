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

export function AddAccountDialog() {
  const { addAccountDialogOpen, setAddAccountDialogOpen } = useAppStore();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

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

      toast.success("账号添加成功，正在开始采集...");

      // Trigger scraping
      const account = data.data as XhsAccountInfo;
      try {
        await fetch(`/api/accounts/${account.id}/scrape`, { method: "POST" });
        toast.success("采集任务已启动");
      } catch {
        toast.error("启动采集失败，请手动触发");
      }

      setUrl("");
      setAddAccountDialogOpen(false);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={addAccountDialogOpen} onOpenChange={setAddAccountDialogOpen}>
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
            />
          </div>

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
            onClick={() => setAddAccountDialogOpen(false)}
            disabled={loading}
          >
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
