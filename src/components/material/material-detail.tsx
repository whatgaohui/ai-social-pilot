'use client';

import { useEffect, useState } from 'react';
import { useMaterialStore, type Material } from '@/store/material-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X, Download, Trash2, Edit, Check, FileText, ExternalLink } from 'lucide-react';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function getTypeLabel(type: string) {
  return type === 'image' ? '图片' : type === 'video' ? '视频' : '文本';
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
    setDetail(selectedMaterial);
    setEditName(selectedMaterial.name);
    setEditing(false);
    setTextContent(null);
    setLoading(true);
    fetch(`/api/materials/${selectedMaterial.id}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setDetail(json.data); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMaterial?.id]);

  useEffect(() => {
    if (!detail || detail.type !== 'text' || !detail.fileUrl) return;
    const filePath = detail.fileUrl.replace('/upload/', '');
    fetch(`/api/materials/file/${encodeURIComponent(filePath)}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setTextContent(json.data.content); })
      .catch(() => setTextContent(null));
  }, [detail?.fileUrl]);

  const handleSave = async () => {
    if (!detail) return;
    const res = await fetch(`/api/materials/${detail.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
    });
    const json = await res.json();
    if (json.success) {
      setDetail(json.data);
      setEditing(false);
      setMaterials({ materials: materials.map((m) => m.id === json.data.id ? json.data : m), total: materials.length, page: 1, totalPages: 1 });
    }
  };

  const handleDelete = async () => {
    if (!detail || !confirm('确定删除此素材？')) return;
    const res = await fetch(`/api/materials/${detail.id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setSelectedMaterial(null);
      setMaterials({ materials: materials.filter((m) => m.id !== detail.id), total: materials.length - 1, page: 1, totalPages: 1 });
    }
  };

  return (
    <Dialog open={!!selectedMaterial} onOpenChange={(o) => { if (!o) setSelectedMaterial(null); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span className="text-lg font-bold">素材详情</span>
            <Button variant="ghost" size="icon" onClick={() => setSelectedMaterial(null)} className="h-7 w-7"><X className="w-4 h-4" /></Button>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">加载中...</div>
          ) : detail ? (
            <>
              {/* Preview */}
              <div className="rounded-xl border bg-muted/30 overflow-hidden mb-4 flex justify-center">
                {detail.type === 'image' ? (
                  <img src={detail.fileUrl} alt={detail.name} className="max-h-96 w-auto object-contain" />
                ) : detail.type === 'video' ? (
                  <video src={detail.fileUrl} controls className="max-h-96 w-full max-w-2xl" />
                ) : (
                  <div className="w-full p-4 max-h-96 overflow-auto">
                    {textContent ? (
                      <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">{textContent}</pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                        <FileText className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">文本加载中...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1 block">名称</label>
                {editing ? (
                  <div className="flex gap-2">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />
                    <Button size="sm" onClick={handleSave}><Check className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(false)}>取消</Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-medium">{detail.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)}><Edit className="w-3 h-3" /></Button>
                  </div>
                )}
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">类型</p>
                  <p className="text-sm font-medium">{getTypeLabel(detail.type)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">大小</p>
                  <p className="text-sm font-medium">{formatSize(detail.size)}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">上传时间</p>
                  <p className="text-sm font-medium">{new Date(detail.createdAt).toLocaleDateString('zh-CN')}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">使用次数</p>
                  <p className="text-sm font-medium">{detail.usageCount} 次</p>
                </div>
              </div>

              {/* Tags */}
              {(() => { try { return JSON.parse(detail.tags || '[]'); } catch { return []; } })().length > 0 && (
                <div className="mb-4">
                  <label className="text-xs text-muted-foreground mb-2 block">标签</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => { try { return JSON.parse(detail.tags || '[]'); } catch { return []; } })().map((tag: string) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Usage history */}
              {detail.usages && detail.usages.length > 0 && (
                <>
                  <Separator className="mb-4" />
                  <div className="mb-4">
                    <label className="text-xs text-muted-foreground mb-2 block">使用记录</label>
                    <div className="space-y-2">
                      {detail.usages.map((usage: { id: string; postId: string; usedAt: string }) => (
                        <div key={usage.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                          <span>用于笔记 {usage.postId}</span>
                          <span className="text-xs text-muted-foreground">{new Date(usage.usedAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-muted-foreground">加载失败</div>
          )}
        </div>

        {/* Actions footer */}
        {detail && (
          <div className="px-6 pb-6 flex items-center gap-2">
            <Button variant="outline" className="flex-1" onClick={() => window.open(detail.fileUrl, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-1" />在新窗口打开
            </Button>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
