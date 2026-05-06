'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, X, Plus, Image } from 'lucide-react';
import { toast } from 'sonner';

export function NoteCreationDialog({ accountId, open, onClose, onSuccess }: { accountId: string; open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addTag = () => {
    const val = tagInput.trim();
    if (!val || tags.includes(val)) return;
    setTags([...tags, val]);
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('请输入标题');
      return;
    }
    if (!content.trim()) {
      toast.error('请输入内容');
      return;
    }

    setSubmitting(true);
    try {
      const scheduledAt = scheduledDate && scheduledTime ? `${scheduledDate}T${scheduledTime}:00` : undefined;

      const res = await fetch(`/api/accounts/${accountId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          tags,
          mediaUrls: [],
          scheduledAt,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(scheduledAt ? '笔记已创建并排程' : '笔记草稿已保存');
        setTitle('');
        setContent('');
        setTags([]);
        setScheduledDate('');
        setScheduledTime('');
        onSuccess();
        onClose();
      } else {
        toast.error(json.error || '创建失败');
      }
    } catch {
      toast.error('网络错误，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAiAssist = () => {
    toast.info('AI 辅助创作功能开发中');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-background rounded-xl border shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">新建笔记</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">标题</label>
            <input
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入笔记标题..."
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">内容</label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring min-h-[120px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入笔记正文..."
            />
          </div>

          {/* AI Assist button */}
          <Button variant="outline" size="sm" className="w-full" onClick={handleAiAssist}>
            <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
            AI 辅助创作
          </Button>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">标签</label>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button onClick={() => removeTag(i)} className="hover:text-foreground"><span className="text-sm">×</span></button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="输入标签后按回车..."
              />
              <Button size="sm" variant="outline" onClick={addTag}><Plus className="w-3 h-3" /></Button>
            </div>
          </div>

          {/* Media placeholder */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">媒体素材</label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-xhs/30 transition-colors">
              <Image className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">拖拽图片或点击上传</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">支持 JPG, PNG, WebP</p>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">发布排程（可选）</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
              <input
                type="time"
                className="w-28 px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 p-4 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1 bg-xhs hover:bg-xhs-dark text-white" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '保存中...' : scheduledDate ? '创建并排程' : '保存草稿'}
          </Button>
        </div>
      </div>
    </div>
  );
}
