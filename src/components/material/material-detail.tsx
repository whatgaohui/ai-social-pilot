'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMaterialStore, type Material } from '@/store/material-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Check, Edit, ExternalLink, FileText, ImageOff, Trash2, X } from 'lucide-react';

function formatSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0B';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getTypeLabel(type: string) {
  return type === 'image' ? '图片' : type === 'video' ? '视频' : '文案';
}

function parseTags(tags: string) {
  try {
    const parsed = JSON.parse(tags || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function MaterialDetailView() {
  const { selectedMaterial, setSelectedMaterial, materials, setMaterials } = useMaterialStore();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [detail, setDetail] = useState<Material | null>(null);
  const [loading, setLoading] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedMaterial) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDetail(selectedMaterial);
    setEditName(selectedMaterial.name);
    setEditing(false);
    setTextContent(null);
    setLoading(true);
    fetch(`/api/materials/${selectedMaterial.id}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setDetail(json.data); })
      .finally(() => setLoading(false));
  }, [selectedMaterial]);

  useEffect(() => {
    if (!detail || detail.type !== 'text' || !detail.fileUrl) return;
    const filePath = detail.fileUrl.replace('/upload/', '');
    fetch(`/api/materials/file/${encodeURIComponent(filePath)}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setTextContent(json.data.content); })
      .catch(() => setTextContent(null));
  }, [detail]);

  const tags = useMemo(() => parseTags(detail?.tags || '[]'), [detail?.tags]);

  const handleSave = async () => {
    if (!detail) return;
    const res = await fetch(`/api/materials/${detail.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() || detail.name }),
    });
    const json = await res.json();
    if (json.success) {
      setDetail(json.data);
      setEditing(false);
      setMaterials({
        materials: materials.map((m) => (m.id === json.data.id ? json.data : m)),
        total: materials.length,
        page: 1,
        totalPages: 1,
      });
    }
  };

  const handleDelete = async () => {
    if (!detail || !confirm('确定删除这个素材？')) return;
    const res = await fetch(`/api/materials/${detail.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setSelectedMaterial(null);
      setMaterials({
        materials: materials.filter((m) => m.id !== detail.id),
        total: Math.max(0, materials.length - 1),
        page: 1,
        totalPages: 1,
      });
    }
  };

  const close = () => setSelectedMaterial(null);

  return (
    <Dialog open={!!selectedMaterial} onOpenChange={(nextOpen) => { if (!nextOpen) close(); }}>
      <DialogContent
        className="w-[min(94vw,1180px)] sm:max-w-[1180px] max-h-[92vh] overflow-hidden p-0"
        showCloseButton={false}
      >
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center justify-between gap-4">
            <span className="text-lg font-semibold">素材详情</span>
            <Button variant="ghost" size="icon" onClick={close} className="h-8 w-8" aria-label="关闭">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(92vh-73px)] overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">正在加载素材...</div>
          ) : detail ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_360px]">
              <section className="min-w-0">
                <div className="flex min-h-[460px] items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                  {detail.type === 'image' && detail.fileUrl ? (
                    <img src={detail.fileUrl} alt={detail.name} className="max-h-[72vh] w-auto object-contain" />
                  ) : detail.type === 'video' && detail.fileUrl ? (
                    <video src={detail.fileUrl} controls className="max-h-[72vh] w-full bg-black object-contain" preload="metadata" />
                  ) : detail.type === 'text' ? (
                    <div className="h-full w-full p-5">
                      {textContent ? (
                        <pre className="whitespace-pre-wrap break-words text-sm leading-6">{textContent}</pre>
                      ) : (
                        <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
                          <FileText className="mb-2 h-9 w-9 opacity-50" />
                          <p className="text-sm">文案内容加载中...</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageOff className="h-9 w-9 opacity-50" />
                      <p className="text-sm">没有可预览的源文件</p>
                    </div>
                  )}
                </div>
              </section>

              <aside className="min-w-0 space-y-5">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">名称</label>
                  {editing ? (
                    <div className="flex gap-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                      <Button size="icon" onClick={handleSave} className="shrink-0">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>取消</Button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <h2 className="flex-1 break-words text-xl font-semibold leading-snug">{detail.name}</h2>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setEditing(true)} aria-label="编辑名称">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">类型</p>
                    <p className="mt-1 text-sm font-medium">{getTypeLabel(detail.type)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">大小</p>
                    <p className="mt-1 text-sm font-medium">{formatSize(detail.size)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">上传时间</p>
                    <p className="mt-1 text-sm font-medium">{new Date(detail.createdAt).toLocaleDateString('zh-CN')}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground">使用次数</p>
                    <p className="mt-1 text-sm font-medium">{detail.usageCount} 次</p>
                  </div>
                </div>

                {tags.length > 0 && (
                  <div>
                    <label className="mb-2 block text-xs text-muted-foreground">标签</label>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detail.usages && detail.usages.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <label className="mb-2 block text-xs text-muted-foreground">使用记录</label>
                      <div className="space-y-2">
                        {detail.usages.map((usage) => (
                          <div key={usage.id} className="flex items-center justify-between rounded bg-muted/30 p-2 text-sm">
                            <span>用于笔记 {usage.postId}</span>
                            <span className="text-xs text-muted-foreground">{new Date(usage.usedAt).toLocaleDateString('zh-CN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" disabled={!detail.fileUrl} onClick={() => window.open(detail.fileUrl, '_blank')}>
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    打开源文件
                  </Button>
                  <Button variant="outline" className="border-red-200 text-red-500 hover:bg-red-50" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </aside>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">素材加载失败</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
