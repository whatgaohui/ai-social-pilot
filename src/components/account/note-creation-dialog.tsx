'use client';

import { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Image as ImageIcon, Link, Loader2, Plus, Sparkles, Upload, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { extractVideoThumbnail } from '@/lib/video-thumbnail';

type MediaType = 'image' | 'video';
type PublishMode = 'now' | 'scheduled';

interface FormData {
  title: string;
  content: string;
  mediaType: MediaType;
  mediaUrls: string[];
  videoUrl: string;
  videoThumbnail: string;
  tags: string[];
  publishMode: PublishMode;
  scheduledDate: string;
  scheduledTime: string;
}

interface FormErrors {
  title?: string;
  content?: string;
  mediaUrls?: string;
  videoUrl?: string;
  tags?: string;
  scheduledAt?: string;
}

const initialForm: FormData = {
  title: '',
  content: '',
  mediaType: 'image',
  mediaUrls: [],
  videoUrl: '',
  videoThumbnail: '',
  tags: [],
  publishMode: 'now',
  scheduledDate: '',
  scheduledTime: '',
};

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function NoteCreationDialog({
  accountId,
  open,
  onClose,
  onSuccess,
}: {
  accountId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<FormData>(initialForm);
  const [tagInput, setTagInput] = useState('');
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'url'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = () => {
    const nextErrors: FormErrors = {};

    if (!formData.title.trim()) nextErrors.title = '请输入标题';
    else if (formData.title.length > 30) nextErrors.title = '标题最多 30 个字';

    if (!formData.content.trim()) nextErrors.content = '请输入正文';
    else if (formData.content.length > 1000) nextErrors.content = '正文最多 1000 个字';

    if (formData.mediaType === 'image' && formData.mediaUrls.length === 0) {
      nextErrors.mediaUrls = '图文笔记至少需要上传 1 张图片';
    }

    if (formData.mediaType === 'video' && !formData.videoUrl) {
      nextErrors.videoUrl = '视频笔记需要上传视频或粘贴视频链接';
    }

    if (formData.tags.length > 10) nextErrors.tags = '最多添加 10 个标签';

    if (formData.publishMode === 'scheduled') {
      if (!formData.scheduledDate || !formData.scheduledTime) {
        nextErrors.scheduledAt = '请选择发布时间';
      } else {
        const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
        if (scheduledAt <= new Date()) nextErrors.scheduledAt = '发布时间必须晚于当前时间';
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const uploadMedia = async (file: File, mediaType: MediaType, thumbnail?: string) => {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/upload-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, filename: file.name, mediaType, thumbnail }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || '上传失败');
    return json.data as { url: string; thumbnailUrl?: string };
  };

  const handleImageUpload = useCallback(async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error('请选择图片文件');
      return;
    }
    if (formData.mediaUrls.length + imageFiles.length > 9) {
      toast.error('最多上传 9 张图片');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const urls: string[] = [];
      for (let index = 0; index < imageFiles.length; index += 1) {
        const result = await uploadMedia(imageFiles[index], 'image');
        urls.push(result.url);
        setUploadProgress(Math.round(((index + 1) / imageFiles.length) * 100));
      }
      setFormData((prev) => ({ ...prev, mediaUrls: [...prev.mediaUrls, ...urls] }));
      setErrors((prev) => ({ ...prev, mediaUrls: undefined }));
      toast.success(`已上传 ${urls.length} 张图片`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '图片上传失败');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [formData.mediaUrls.length]);

  const handleVideoUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('请选择视频文件');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      toast.error('视频文件最大支持 500MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    try {
      // Extract video thumbnail (first frame)
      let thumbnailBase64 = '';
      try {
        setUploadProgress(20);
        thumbnailBase64 = await extractVideoThumbnail(file);
      } catch {
        // Continue without thumbnail if extraction fails
      }

      setUploadProgress(40);
      const result = await uploadMedia(file, 'video', thumbnailBase64);
      setFormData((prev) => ({ ...prev, videoUrl: result.url, videoThumbnail: result.thumbnailUrl || thumbnailBase64 }));
      setErrors((prev) => ({ ...prev, videoUrl: undefined }));
      setUploadProgress(100);
      toast.success('视频上传成功');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '视频上传失败');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (formData.mediaType === 'image') handleImageUpload(files);
    else if (files[0]) handleVideoUpload(files[0]);
  }, [formData.mediaType, handleImageUpload, handleVideoUpload]);

  const addTag = () => {
    const value = tagInput.trim().replace(/^#/, '');
    if (!value) return;
    if (formData.tags.includes(value)) {
      toast.error('标签已存在');
      return;
    }
    if (formData.tags.length >= 10) {
      toast.error('最多添加 10 个标签');
      return;
    }
    setFormData((prev) => ({ ...prev, tags: [...prev.tags, value] }));
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }));
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({ ...prev, mediaUrls: prev.mediaUrls.filter((_, i) => i !== index) }));
  };

  const handleAiAssist = async () => {
    let topic = formData.title.trim() || formData.content.trim().slice(0, 50);
    if (!topic) {
      topic = window.prompt('请输入创作主题，AI 会帮你生成标题、正文和标签：') || '';
      if (!topic.trim()) return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/ai-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), mediaType: formData.mediaType, tags: formData.tags }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'AI 辅助失败');

      setFormData((prev) => ({
        ...prev,
        title: json.data.title || prev.title,
        content: json.data.content || prev.content,
        tags: Array.isArray(json.data.tags) && json.data.tags.length > 0 ? json.data.tags.slice(0, 10) : prev.tags,
      }));
      toast.success(json.aiAvailable ? 'AI 已生成内容，请检查后再发布' : '已生成基础内容，请继续完善');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'AI 辅助失败，请稍后重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const scheduledAt = formData.publishMode === 'scheduled'
        ? `${formData.scheduledDate}T${formData.scheduledTime}:00`
        : undefined;

      const res = await fetch(`/api/accounts/${accountId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          content: formData.content.trim(),
          mediaType: formData.mediaType,
          mediaUrls: formData.mediaUrls,
          videoUrl: formData.videoUrl,
          videoThumbnail: formData.videoThumbnail,
          tags: formData.tags,
          publishMode: formData.publishMode,
          scheduledAt,
        }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error || '创建失败');

      toast.success(formData.publishMode === 'scheduled' ? '笔记已创建并排期' : '笔记草稿已保存');
      setFormData(initialForm);
      setTagInput('');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '创建失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogContent className="w-[min(94vw,820px)] sm:max-w-[820px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建笔记</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-medium">标题 <span className="text-red-500">*</span></label>
            <input
              className={`mt-1 w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring ${errors.title ? 'border-red-500' : 'border-border'}`}
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="输入笔记标题，最多 30 个字"
              maxLength={30}
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-red-500">{errors.title}</span>
              <span className="text-muted-foreground">{formData.title.length}/30</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">内容类型 <span className="text-red-500">*</span></label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {[
                { type: 'image' as const, label: '图文', icon: ImageIcon },
                { type: 'video' as const, label: '视频', icon: Video },
              ].map((item) => {
                const Icon = item.icon;
                const active = formData.mediaType === item.type;
                return (
                  <button
                    key={item.type}
                    className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${active ? 'border-xhs bg-xhs/10 text-xhs' : 'border-border hover:border-xhs/40'}`}
                    onClick={() => setFormData((prev) => ({ ...prev, mediaType: item.type, mediaUrls: [], videoUrl: '' }))}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium">{formData.mediaType === 'image' ? '图片' : '视频'} <span className="text-red-500">*</span></label>

            {formData.mediaType === 'image' ? (
              <>
                {formData.mediaUrls.length > 0 && (
                  <div className="mb-2 mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {formData.mediaUrls.map((url, index) => (
                      <div key={url} className="relative aspect-square overflow-hidden rounded-lg border">
                        <img src={url} alt={`图片 ${index + 1}`} className="h-full w-full object-cover" />
                        <button
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                          onClick={() => removeImage(index)}
                          type="button"
                          aria-label="删除图片"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`mt-1 cursor-pointer rounded-lg border-2 border-dashed p-7 text-center transition-colors hover:border-xhs/40 ${errors.mediaUrls ? 'border-red-500' : 'border-border'}`}
                  onDrop={handleDrop}
                  onDragOver={(event) => event.preventDefault()}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/jpeg,image/jpg,image/png,image/webp';
                    input.multiple = true;
                    input.onchange = (event) => {
                      const files = (event.target as HTMLInputElement).files;
                      if (files) handleImageUpload(files);
                    };
                    input.click();
                  }}
                >
                  <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">拖拽图片到这里，或点击上传</p>
                  <p className="mt-1 text-xs text-muted-foreground/70">支持 JPG、PNG、WebP，最多 9 张</p>
                </div>
                {errors.mediaUrls && <p className="mt-1 text-xs text-red-500">{errors.mediaUrls}</p>}
              </>
            ) : (
              <div className="mt-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm ${videoInputMode === 'upload' ? 'border-xhs bg-xhs/10 text-xhs' : 'border-border'}`}
                    onClick={() => setVideoInputMode('upload')}
                    type="button"
                  >
                    <Upload className="h-4 w-4" />
                    本地上传
                  </button>
                  <button
                    className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm ${videoInputMode === 'url' ? 'border-xhs bg-xhs/10 text-xhs' : 'border-border'}`}
                    onClick={() => setVideoInputMode('url')}
                    type="button"
                  >
                    <Link className="h-4 w-4" />
                    粘贴链接
                  </button>
                </div>

                {videoInputMode === 'upload' ? (
                  <div
                    className={`cursor-pointer rounded-lg border-2 border-dashed p-7 text-center transition-colors hover:border-xhs/40 ${errors.videoUrl ? 'border-red-500' : 'border-border'}`}
                    onDrop={handleDrop}
                    onDragOver={(event) => event.preventDefault()}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/mp4,video/webm,video/quicktime';
                      input.onchange = (event) => {
                        const file = (event.target as HTMLInputElement).files?.[0];
                        if (file) handleVideoUpload(file);
                      };
                      input.click();
                    }}
                  >
                    {formData.videoUrl ? (
                      <div className="text-sm">
                        <p className="text-foreground">视频已上传</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">{formData.videoUrl}</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">拖拽视频到这里，或点击上传</p>
                        <p className="mt-1 text-xs text-muted-foreground/70">支持 MP4、MOV、WebM，最大 500MB</p>
                      </>
                    )}
                  </div>
                ) : (
                  <input
                    className={`w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring ${errors.videoUrl ? 'border-red-500' : 'border-border'}`}
                    value={formData.videoUrl}
                    onChange={(event) => setFormData((prev) => ({ ...prev, videoUrl: event.target.value }))}
                    placeholder="粘贴视频链接..."
                  />
                )}
                {errors.videoUrl && <p className="text-xs text-red-500">{errors.videoUrl}</p>}
              </div>
            )}

            {isUploading && (
              <div className="mt-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="mt-1 text-xs text-muted-foreground">上传中... {Math.round(uploadProgress)}%</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium">正文 <span className="text-red-500">*</span></label>
            <textarea
              className={`mt-1 min-h-[220px] w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring ${errors.content ? 'border-red-500' : 'border-border'}`}
              value={formData.content}
              onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
              placeholder="输入笔记正文..."
              maxLength={1000}
            />
            <div className="mt-1 flex justify-between text-xs">
              <span className="text-red-500">{errors.content}</span>
              <span className="text-muted-foreground">{formData.content.length}/1000</span>
            </div>
          </div>

          <Button variant="outline" size="sm" className="w-full" onClick={handleAiAssist} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4 text-amber-500" />}
            {isGenerating ? 'AI 生成中...' : 'AI 辅助创作'}
          </Button>

          <div>
            <label className="text-xs font-medium">标签</label>
            {formData.tags.length > 0 && (
              <div className="mb-1.5 mt-1.5 flex flex-wrap gap-1.5">
                {formData.tags.map((tag, index) => (
                  <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button onClick={() => removeTag(index)} type="button" className="hover:text-foreground">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-1 flex gap-2">
              <input
                className={`flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring ${errors.tags ? 'border-red-500' : 'border-border'}`}
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                  }
                }}
                placeholder="输入标签后按回车"
                maxLength={20}
              />
              <Button size="icon" variant="outline" onClick={addTag} type="button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">最多 10 个标签</p>
          </div>

          <div>
            <label className="text-xs font-medium">发布方式 <span className="text-red-500">*</span></label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                className={`rounded-md border px-4 py-2 text-sm ${formData.publishMode === 'now' ? 'border-xhs bg-xhs/10 text-xhs' : 'border-border hover:border-xhs/40'}`}
                onClick={() => setFormData((prev) => ({ ...prev, publishMode: 'now' }))}
                type="button"
              >
                保存草稿
              </button>
              <button
                className={`flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm ${formData.publishMode === 'scheduled' ? 'border-xhs bg-xhs/10 text-xhs' : 'border-border hover:border-xhs/40'}`}
                onClick={() => setFormData((prev) => ({ ...prev, publishMode: 'scheduled' }))}
                type="button"
              >
                <Calendar className="h-4 w-4" />
                定时发布
              </button>
            </div>
          </div>

          {formData.publishMode === 'scheduled' && (
            <div>
              <label className="text-xs font-medium">发布时间 <span className="text-red-500">*</span></label>
              <div className="mt-1 flex gap-2">
                <input
                  type="date"
                  className={`flex-1 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring ${errors.scheduledAt ? 'border-red-500' : 'border-border'}`}
                  value={formData.scheduledDate}
                  onChange={(event) => setFormData((prev) => ({ ...prev, scheduledDate: event.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
                <input
                  type="time"
                  className={`w-32 rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring ${errors.scheduledAt ? 'border-red-500' : 'border-border'}`}
                  value={formData.scheduledTime}
                  onChange={(event) => setFormData((prev) => ({ ...prev, scheduledTime: event.target.value }))}
                />
              </div>
              {errors.scheduledAt && <p className="mt-1 text-xs text-red-500">{errors.scheduledAt}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>取消</Button>
          <Button className="flex-1 bg-xhs text-white hover:bg-xhs-dark" onClick={handleSubmit} disabled={submitting || isUploading}>
            {submitting ? '保存中...' : formData.publishMode === 'scheduled' ? '创建并排期' : '保存草稿'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
