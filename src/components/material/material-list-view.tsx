'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMaterialStore } from '@/store/material-store';
import { MaterialGridCard, MaterialListRow } from './material-card';
import { UploadModal } from './upload-modal';
import { MaterialDetailView } from './material-detail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Grid, List, Search, Trash2, Tag, Loader2, Plus, X, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const FILTER_TYPES = [
  { value: 'all', label: '全部' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'text', label: '文案' },
];

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: '最新上传' },
  { value: 'createdAt_asc', label: '最早上传' },
  { value: 'name_asc', label: '名称 A-Z' },
  { value: 'size_desc', label: '最大文件' },
];

function NewTextDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) { toast.error('请输入文案内容'); return; }
    setSubmitting(true);
    try {
      const blob = new Blob([content], { type: 'text/plain' });
      const file = new File([blob], `${title.trim() || '未命名文案'}.txt`, { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', title.trim() || '未命名文案');
      formData.append('tags', JSON.stringify(tags));

      const res = await fetch('/api/materials', { method: 'POST', body: formData });
      const json = await res.json();
      if (json.success) {
        toast.success('文案已保存');
        setTitle(''); setContent(''); setTags([]);
        onSuccess();
        onClose();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const addTag = () => {
    const val = tagInput.trim();
    if (!val || tags.includes(val)) return;
    setTags([...tags, val]);
    setTagInput('');
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            新建文案
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium">标题</label>
            <Input
              className="mt-1 h-9"
              placeholder="文案标题（可选）"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium">内容</label>
            <textarea
              className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring min-h-[160px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="粘贴或输入文案内容..."
            />
          </div>
          <div>
            <label className="text-xs font-medium">标签</label>
            <div className="flex gap-2 mt-1">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {tags.map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-muted rounded text-xs flex items-center gap-1">
                      {tag}
                      <button onClick={() => setTags(tags.filter((_, j) => j !== i))} className="hover:text-foreground">×</button>
                    </span>
                  ))}
                </div>
              )}
              <Input
                className="h-9"
                placeholder="输入标签后按回车"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>取消</Button>
            <Button size="sm" className="bg-xhs text-white" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MaterialListView() {
  const {
    materials, total, page, totalPages, loading, filterType, searchQuery, viewMode, sort,
    selectedIds, clearSelection,
    setMaterials, setLoading, setFilterType, setSearchQuery, setViewMode, setSort,
    setUploadOpen, setSelectedMaterial,
  } = useMaterialStore();

  const [bulkAction, setBulkAction] = useState<string | null>(null);
  const [showNewText, setShowNewText] = useState(false);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', type: filterType === 'all' ? '' : filterType, sort, search: searchQuery });
      const res = await fetch(`/api/materials?${params}`);
      const json = await res.json();
      if (json.success) setMaterials(json.data);
    } catch {
      console.error('Failed to fetch materials');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, sort, searchQuery, setLoading, setMaterials]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);

  const handleBulkDelete = async () => {
    if (!confirm(`确定删除 ${selectedIds.length} 个素材？`)) return;
    setBulkAction('delete');
    try {
      const res = await fetch('/api/materials/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'delete' }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`已删除 ${json.data.count} 个素材`);
        clearSelection();
        fetchMaterials();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error('删除失败');
    } finally {
      setBulkAction(null);
    }
  };

  const handleBulkAddTags = async () => {
    const tagInput = prompt('输入标签（多个用逗号分隔）：');
    if (!tagInput?.trim()) return;
    const tags = tagInput.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean);
    setBulkAction('tags');
    try {
      const res = await fetch('/api/materials/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, action: 'add-tags', tags }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`已为 ${json.data.count} 个素材添加标签`);
        clearSelection();
        fetchMaterials();
      } else {
        toast.error(json.error);
      }
    } catch {
      toast.error('添加标签失败');
    } finally {
      setBulkAction(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 p-4 border-b flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {FILTER_TYPES.map((t) => (
            <Button key={t.value} variant={filterType === t.value ? 'default' : 'outline'} size="sm" onClick={() => { setFilterType(t.value); clearSelection(); }}>
              {t.label}
            </Button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-8 w-48" placeholder="搜索素材..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>{SORT_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <div className="flex border rounded-lg overflow-hidden">
          <Button variant={viewMode === 'grid' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-none" onClick={() => setViewMode('grid')}><Grid className="w-4 h-4" /></Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="icon" className="h-8 w-8 rounded-none" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowNewText(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" />新建文案
        </Button>
        <Button size="sm" onClick={() => setUploadOpen(true)}>
          <Upload className="w-3.5 h-3.5 mr-1" />上传
        </Button>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-xhs-light/5 border-b">
          <span className="text-sm text-muted-foreground">已选 {selectedIds.length} 项</span>
          <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50" onClick={handleBulkDelete} disabled={bulkAction !== null}>
            {bulkAction === 'delete' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Trash2 className="w-3 h-3 mr-1" />}删除
          </Button>
          <Button variant="outline" size="sm" onClick={handleBulkAddTags} disabled={bulkAction !== null}>
            {bulkAction === 'tags' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Tag className="w-3 h-3 mr-1" />}添加标签
          </Button>
          <Button variant="ghost" size="sm" onClick={clearSelection}>取消选择</Button>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto p-4" onClick={() => setSelectedMaterial(null)}>
        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' : 'space-y-2'}>
            {Array.from({ length: 8 }).map((_, i) => (
              viewMode === 'grid' ? (
                <div key={i} className="rounded-xl border overflow-hidden"><Skeleton className="aspect-square" /><div className="p-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2 mt-2" /></div></div>
              ) : (
                <div key={i} className="flex items-center gap-4 p-3"><Skeleton className="w-10 h-10 rounded" /><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-20" /></div>
              )
            ))}
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            {filterType === 'text' ? (
              <>
                <Plus className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">暂无文案素材</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setShowNewText(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />新建第一条文案
                </Button>
              </>
            ) : (
              <>
                <Upload className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-lg font-medium">暂无素材</p>
                <p className="text-sm">点击上方「上传」按钮添加素材</p>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="flex flex-wrap gap-2">
            {materials.map((m) => <MaterialGridCard key={m.id} material={m} />)}
          </div>
        ) : (
          <div className="space-y-1.5">
            {materials.map((m) => <MaterialListRow key={m.id} material={m} />)}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-3 border-t">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { useMaterialStore.setState({ page: page - 1 }); }}>上一页</Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { useMaterialStore.setState({ page: page + 1 }); }}>下一页</Button>
        </div>
      )}

      <UploadModal />
      <NewTextDialog open={showNewText} onClose={() => setShowNewText(false)} onSuccess={() => fetchMaterials()} />
    </div>
  );
}
