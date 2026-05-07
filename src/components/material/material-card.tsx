'use client';

import { Image, Video, FileText, MoreVertical, Trash2, Edit, Sparkles } from 'lucide-react';
import { useMaterialStore, type Material } from '@/store/material-store';
import { Checkbox } from '@/components/ui/checkbox';

function getTypeIcon(type: string) {
  switch (type) {
    case 'image': return <Image className="w-4 h-4" />;
    case 'video': return <Video className="w-4 h-4" />;
    default: return <Sparkles className="w-4 h-4" />;
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

interface MaterialCardProps {
  material: Material;
}

function ThumbnailImage({ src, alt, icon, className }: { src: string; alt: string; icon: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
        {icon}
      </div>
      {src && (
        <img
          src={src}
          alt={alt}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).remove(); }}
        />
      )}
    </div>
  );
}

export function MaterialGridCard({ material }: MaterialCardProps) {
  const { setSelectedMaterial, selectedIds, toggleSelect } = useMaterialStore();
  const isSelected = selectedIds.includes(material.id);

  return (
    <div
      className={`group relative w-20 flex-shrink-0 border transition-colors cursor-pointer hover:ring-1 hover:ring-xhs-light ${isSelected ? 'ring-2 ring-xhs-light' : ''}`}
      onClick={() => setSelectedMaterial(material)}
    >
      <div className="relative w-20 h-20 bg-muted overflow-hidden">
        {material.type === 'text' ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Sparkles className="w-5 h-5 text-amber-500/60" />
          </div>
        ) : material.thumbnailUrl ? (
          <ThumbnailImage
            src={material.thumbnailUrl}
            alt={material.name}
            icon={material.type === 'image' ? <Image className="w-5 h-5 text-muted-foreground/40" /> : <Video className="w-5 h-5 text-muted-foreground/40" />}
            className="relative w-full h-full"
          />
        ) : material.fileUrl ? (
          <ThumbnailImage
            src={material.fileUrl}
            alt={material.name}
            icon={material.type === 'image' ? <Image className="w-5 h-5 text-muted-foreground/40" /> : <Video className="w-5 h-5 text-muted-foreground/40" />}
            className="relative w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {getTypeIcon(material.type)}
          </div>
        )}
        <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(material.id)} onClick={(e) => e.stopPropagation()} className="w-3.5 h-3.5 bg-background/80" />
        </div>
      </div>
      <p className="text-[10px] font-medium truncate px-1 py-0.5 leading-tight">{material.name}</p>
    </div>
  );
}

export function MaterialListRow({ material }: MaterialCardProps) {
  const { setSelectedMaterial, selectedIds, toggleSelect } = useMaterialStore();
  const isSelected = selectedIds.includes(material.id);

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors hover:bg-muted/50 ${isSelected ? 'border-xhs-light bg-xhs-light/5' : ''}`}
      onClick={() => setSelectedMaterial(material)}
    >
      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(material.id)} onClick={(e) => e.stopPropagation()} className="w-3.5 h-3.5" />
      <div className="relative w-9 h-9 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
        {material.type === 'text' ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
            <Sparkles className="w-4 h-4 text-amber-500/60" />
          </div>
        ) : material.thumbnailUrl ? (
          <ThumbnailImage
            src={material.thumbnailUrl}
            alt=""
            icon={getTypeIcon(material.type)}
            className="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {getTypeIcon(material.type)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{material.name}</p>
        <p className="text-xs text-muted-foreground">
          {material.type === 'image' ? '图片' : material.type === 'video' ? '视频' : '文案'} · {formatSize(material.size)}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-1">
        {(() => { try { return JSON.parse(material.tags).slice(0, 2); } catch { return []; } })().map((tag: string) => (
          <span key={tag} className="px-2 py-0.5 bg-muted rounded text-[10px]">{tag}</span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground hidden md:block">{new Date(material.createdAt).toLocaleDateString('zh-CN')}</span>
      {material.usageCount > 0 && <span className="text-xs text-muted-foreground">使用 {material.usageCount} 次</span>}
    </div>
  );
}
