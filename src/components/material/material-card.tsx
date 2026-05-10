'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { useMaterialStore, type Material } from '@/store/material-store';
import { Image as ImageIcon, Loader2, Sparkles, Video } from 'lucide-react';
import { useState } from 'react';
import { extractVideoThumbnail } from '@/lib/video-thumbnail';
import { toast } from 'sonner';

function getTypeIcon(type: string) {
  if (type === 'image') return <ImageIcon className="h-4 w-4" />;
  if (type === 'video') return <Video className="h-4 w-4" />;
  return <Sparkles className="h-4 w-4" />;
}

function getTypeLabel(type: string) {
  return type === 'image' ? '图片' : type === 'video' ? '视频' : '文案';
}

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function parseTags(tags: string) {
  try {
    const parsed = JSON.parse(tags || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ThumbnailImage({ src, alt, type, className }: { src: string; alt: string; type: string; className?: string }) {
  return (
    <div className={className}>
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50 text-muted-foreground">
        {getTypeIcon(type)}
      </div>
      {src && (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={(event) => { (event.target as HTMLImageElement).remove(); }}
        />
      )}
      {type === 'video' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
          <div className="rounded-full bg-black/60 p-2 text-white">
            <Video className="h-4 w-4" />
          </div>
        </div>
      )}
    </div>
  );
}

export function MaterialGridCard({ material }: { material: Material }) {
  const { setSelectedMaterial, selectedIds, toggleSelect } = useMaterialStore();
  const isSelected = selectedIds.includes(material.id);
  const [generating, setGenerating] = useState(false);

  // For videos, only use thumbnailUrl (not fileUrl which is the video itself)
  const previewUrl = material.type === 'video' ? material.thumbnailUrl : material.thumbnailUrl || material.fileUrl;

  const handleRegenerateThumb = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setGenerating(true);
    try {
      // Fetch the video file and extract thumbnail
      const res = await fetch(material.fileUrl);
      const blob = await res.blob();
      const file = new File([blob], material.name, { type: material.mimeType });
      const thumbnail = await extractVideoThumbnail(file);

      const patchRes = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail }),
      });
      const json = await patchRes.json();
      if (json.success) {
        useMaterialStore.setState((state) => ({
          materials: state.materials.map((m) =>
            m.id === material.id ? { ...m, thumbnailUrl: json.data.thumbnailUrl } : m
          ),
        }));
        toast.success('封面已生成');
      } else {
        toast.error(json.error || '生成失败');
      }
    } catch {
      toast.error('生成封面失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className={`group relative w-40 flex-shrink-0 cursor-pointer border transition-colors hover:ring-1 hover:ring-xhs-light ${isSelected ? 'ring-2 ring-xhs-light' : ''}`}
      onClick={() => setSelectedMaterial(material)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') setSelectedMaterial(material);
      }}
    >
      <div className="relative h-40 w-40 overflow-hidden bg-muted">
        {material.type === 'text' ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Sparkles className="h-5 w-5 text-amber-500/60" />
          </div>
        ) : previewUrl ? (
          <ThumbnailImage src={previewUrl} alt={material.name} type={material.type} className="relative h-full w-full" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            {getTypeIcon(material.type)}
            <span className="text-[9px]">{material.type === 'video' ? '点击生成封面' : ''}</span>
          </div>
        )}
        {material.type === 'video' && !material.thumbnailUrl && (
          <div className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground shadow hover:bg-white"
              onClick={handleRegenerateThumb}
              disabled={generating}
              type="button"
            >
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
              {generating ? '生成中' : '生成封面'}
            </button>
          </div>
        )}
        <div className="absolute left-1 top-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelect(material.id)}
            onClick={(event) => event.stopPropagation()}
            className="h-3.5 w-3.5 bg-background/80"
          />
        </div>
      </div>
      <p className="truncate px-1 py-0.5 text-[10px] font-medium leading-tight">{material.name}</p>
    </div>
  );
}

export function MaterialListRow({ material }: { material: Material }) {
  const { setSelectedMaterial, selectedIds, toggleSelect } = useMaterialStore();
  const isSelected = selectedIds.includes(material.id);
  const tags = parseTags(material.tags).slice(0, 2);
  const previewUrl = material.type === 'video' ? material.thumbnailUrl : material.thumbnailUrl || material.fileUrl;
  const [generating, setGenerating] = useState(false);

  const handleRegenerateThumb = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setGenerating(true);
    try {
      const res = await fetch(material.fileUrl);
      const blob = await res.blob();
      const file = new File([blob], material.name, { type: material.mimeType });
      const thumbnail = await extractVideoThumbnail(file);

      const patchRes = await fetch(`/api/materials/${material.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thumbnail }),
      });
      const json = await patchRes.json();
      if (json.success) {
        useMaterialStore.setState((state) => ({
          materials: state.materials.map((m) =>
            m.id === material.id ? { ...m, thumbnailUrl: json.data.thumbnailUrl } : m
          ),
        }));
        toast.success('封面已生成');
      } else {
        toast.error(json.error || '生成失败');
      }
    } catch {
      toast.error('生成封面失败');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors hover:bg-muted/50 ${isSelected ? 'border-xhs-light bg-xhs-light/5' : ''}`}
      onClick={() => setSelectedMaterial(material)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') setSelectedMaterial(material);
      }}
    >
      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(material.id)} onClick={(event) => event.stopPropagation()} className="h-3.5 w-3.5" />
      <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
        {material.type === 'text' ? (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Sparkles className="h-4 w-4 text-amber-500/60" />
          </div>
        ) : previewUrl ? (
          <ThumbnailImage src={previewUrl} alt={material.name} type={material.type} className="relative h-full w-full" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            {getTypeIcon(material.type)}
          </div>
        )}
        {material.type === 'video' && !material.thumbnailUrl && (
          <button
            className="absolute inset-0 flex items-center justify-center bg-black/30 text-white opacity-0 transition-opacity hover:opacity-100"
            onClick={handleRegenerateThumb}
            disabled={generating}
            type="button"
          >
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Video className="h-3 w-3" />}
          </button>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{material.name}</p>
        <p className="text-xs text-muted-foreground">{getTypeLabel(material.type)} · {formatSize(material.size)}</p>
      </div>
      <div className="hidden items-center gap-1 sm:flex">
        {tags.map((tag: string) => (
          <span key={tag} className="rounded bg-muted px-2 py-0.5 text-[10px]">{tag}</span>
        ))}
      </div>
      <span className="hidden text-xs text-muted-foreground md:block">{new Date(material.createdAt).toLocaleDateString('zh-CN')}</span>
      {material.usageCount > 0 && <span className="text-xs text-muted-foreground">使用 {material.usageCount} 次</span>}
    </div>
  );
}
