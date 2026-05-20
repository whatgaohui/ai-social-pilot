"use client";

/**
 * LibraryView — 素材管理 (v3.1, new module)
 *
 * Upload and manage images / videos / text snippets for reuse in notes.
 * Scaffold version: shows upload area + empty grid. Full impl in next batch.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FolderOpen,
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Search,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AssetType = "all" | "image" | "video" | "text";

interface MediaAsset {
  id: string;
  type: "image" | "video" | "text";
  fileName: string;
  url: string;
  thumbnail?: string;
  createdAt: string;
  fileSize?: number;
}

export function LibraryView() {
  const [filterType, setFilterType] = useState<AssetType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [assets] = useState<MediaAsset[]>([]); // TODO: fetch from /api/media

  const filters: { id: AssetType; label: string; icon: typeof ImageIcon }[] = [
    { id: "all", label: "全部", icon: FolderOpen },
    { id: "image", label: "图片", icon: ImageIcon },
    { id: "video", label: "视频", icon: Video },
    { id: "text", label: "文字", icon: FileText },
  ];

  const isEmpty = assets.length === 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-rose-500" />
            素材管理
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            上传图片、视频、文字片段，创作笔记时一键调用
          </p>
        </div>
        <Button className="btn-gradient-brand text-white border-0 gap-1.5">
          <Upload className="w-4 h-4" />
          上传素材
        </Button>
      </header>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="搜索素材..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/60">
          {filters.map((f) => {
            const Icon = f.icon;
            const isActive = filterType === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                  isActive
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upload zone */}
      <div className="rounded-xl border-2 border-dashed border-border/60 bg-muted/20 hover:bg-muted/30 hover:border-rose-300/60 transition-all p-12 text-center cursor-pointer group">
        <div className="w-14 h-14 mx-auto rounded-full bg-gradient-brand-soft flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
          <Upload className="w-7 h-7 text-rose-500" />
        </div>
        <h3 className="font-semibold text-base">拖拽文件到这里上传</h3>
        <p className="text-sm text-muted-foreground mt-1">
          或点击此处选择文件 · 支持 JPG / PNG / MP4 / WebM
        </p>
        <p className="text-xs text-muted-foreground/70 mt-3">
          图片单文件 ≤ 5MB · 视频 ≤ 100MB
        </p>
      </div>

      {/* Grid / Empty state */}
      {isEmpty ? (
        <div className="rounded-xl border border-border/60 bg-card p-12 text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <FolderOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold">素材库还空着</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
            上传你的第一份素材开始构建创作弹药库。所有素材都会在 AI 创作笔记时供你选择插入。
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              上传文件
            </Button>
            <Button size="sm" className="gap-1.5 btn-gradient-brand text-white border-0">
              <Sparkles className="w-3.5 h-3.5" />
              AI 生成图片
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {assets.map((asset) => (
            <div key={asset.id} className="card-elevated p-2 group cursor-pointer">
              <div className="aspect-square rounded-md bg-muted overflow-hidden relative">
                {asset.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.thumbnail} alt={asset.fileName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
              </div>
              <p className="text-xs mt-2 truncate font-medium">{asset.fileName}</p>
            </div>
          ))}
        </div>
      )}

      {/* Beta notice */}
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground flex items-start gap-2">
        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0 text-[10px] font-semibold shrink-0">
          Beta
        </Badge>
        <span>
          素材管理 v0.1 — 上传与 AI 创作联动正在开发中。
          下个迭代将支持：批量上传、自动压缩、AI 标签识别、笔记一键插入。
        </span>
      </div>
    </div>
  );
}