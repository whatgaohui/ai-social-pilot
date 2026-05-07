'use client';

import { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, X, Plus, Image as ImageIcon, Video, Upload, Link, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';

type MediaType = 'image' | 'video';
type PublishMode = 'now' | 'scheduled';

interface MediaFile {
  url: string;
  name: string;
  size: number;
  type: string;
}

interface FormData {
  title: string;
  content: string;
  mediaType: MediaType;
  mediaUrls: string[];
  videoUrl: string;
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

export function NoteCreationDialog({
  accountId,
  open,
  onClose,
  onSuccess
}: {
  accountId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    mediaType: 'image',
    mediaUrls: [],
    videoUrl: '',
    tags: [],
    publishMode: 'now',
    scheduledDate: '',
    scheduledTime: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [videoInputMode, setVideoInputMode] = useState<'upload' | 'url'>('upload');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = '请输入标题';
    } else if (formData.title.length > 30) {
      newErrors.title = '标题最多30字';
    }

    if (!formData.content.trim()) {
      newErrors.content = '请输入正文';
    } else if (formData.content.length > 1000) {
      newErrors.content = '正文最多1000字';
    }

    if (formData.mediaType === 'image' && formData.mediaUrls.length === 0) {
      newErrors.mediaUrls = '图文笔记至少需要上传一张图片';
    }

    if (formData.mediaType === 'video' && !formData.videoUrl) {
      newErrors.videoUrl = '视频笔记需要提供视频';
    }

    if (formData.tags.length > 10) {
      newErrors.tags = '最多10个标签';
    }

    if (formData.publishMode === 'scheduled') {
      if (!formData.scheduledDate || !formData.scheduledTime) {
        newErrors.scheduledAt = '请选择发布时间';
      } else {
        const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
        if (scheduledAt <= new Date()) {
          newErrors.scheduledAt = '发布时间必须晚于当前时间';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle image upload
  const handleImageUpload = useCallback(async (files: FileList) => {
    if (formData.mediaUrls.length + files.length > 9) {
      toast.error('最多上传9张图片');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const uploadPromises = Array.from(files).map(async (file, index) => {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      try {
        const res = await fetch(`/api/accounts/${accountId}/notes/upload-media`, {
          method: 'POST',
          body: formDataToSend,
        });

        const json = await res.json();
        if (json.success) {
          setUploadProgress(((index + 1) / files.length) * 100);
          return json.data.url;
        } else {
          toast.error(json.error || '上传失败');
          return null;
        }
      } catch (error) {
        toast.error('上传失败，请重试');
        return null;
      }
    });

    const urls = await Promise.all(uploadPromises);
    const validUrls = urls.filter((url): url is string => url !== null);

    setFormData(prev => ({
      ...prev,
      mediaUrls: [...prev.mediaUrls, ...validUrls]
    }));

    setIsUploading(false);
    setUploadProgress(0);
  }, [accountId, formData.mediaUrls.length]);

  // Handle video upload
  const handleVideoUpload = useCallback(async (file: File) => {
    if (file.size > 500 * 1024 * 1024) {
      toast.error('视频文件最大支持 500MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formDataToSend = new FormData();
    formDataToSend.append('file', file);

    try {
      const res = await fetch(`/api/accounts/${accountId}/notes/upload-media`, {
        method: 'POST',
        body: formDataToSend,
      });

      const json = await res.json();
      if (json.success) {
        setFormData(prev => ({ ...prev, videoUrl: json.data.url }));
        toast.success('视频上传成功');
      } else {
        toast.error(json.error || '上传失败');
      }
    } catch (error) {
      toast.error('上传失败，请重试');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [accountId]);

  // Handle video URL input
  const handleVideoUrlInput = () => {
    const url = prompt('请输入视频链接');
    if (url) {
      try {
        new URL(url);
        setFormData(prev => ({ ...prev, videoUrl: url }));
      } catch {
        toast.error('请输入有效的视频链接');
      }
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      mediaUrls: prev.mediaUrls.filter((_, i) => i !== index)
    }));
  };

  // Add tag
  const addTag = () => {
    const val = tagInput.trim();
    if (!val) return;
    if (formData.tags.includes(val)) {
      toast.error('标签已存在');
      return;
    }
    if (formData.tags.length >= 10) {
      toast.error('最多10个标签');
      return;
    }
    setFormData(prev => ({ ...prev, tags: [...prev.tags, val] }));
    setTagInput('');
  };

  // Remove tag
  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;

    if (formData.mediaType === 'image') {
      const imageFiles = Array.from(files).filter(file =>
        file.type.startsWith('image/')
      );
      if (imageFiles.length > 0) {
        handleImageUpload(files);
      } else {
        toast.error('请上传图片文件');
      }
    } else {
      const videoFile = files[0];
      if (videoFile && videoFile.type.startsWith('video/')) {
        handleVideoUpload(videoFile);
      } else {
        toast.error('请上传视频文件');
      }
    }
  }, [formData.mediaType, handleImageUpload, handleVideoUpload]);

  // Handle submit
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const scheduledAt = formData.publishMode === 'scheduled' && formData.scheduledDate && formData.scheduledTime
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
          tags: formData.tags,
          publishMode: formData.publishMode,
          scheduledAt,
        }),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(formData.publishMode === 'scheduled' ? '笔记已创建并排期' : '笔记草稿已保存');
        // Reset form
        setFormData({
          title: '',
          content: '',
          mediaType: 'image',
          mediaUrls: [],
          videoUrl: '',
          tags: [],
          publishMode: 'now',
          scheduledDate: '',
          scheduledTime: '',
        });
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

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新建笔记</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div>
            <label className="text-xs font-medium">
              标题 <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full mt-1 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring ${
                errors.title ? 'border-red-500' : 'border-border'
              }`}
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="输入笔记标题（最多30字）"
              maxLength={30}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">{errors.title}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.title.length}/30
            </p>
          </div>

          {/* Content Type */}
          <div>
            <label className="text-xs font-medium">
              内容类型 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mt-1">
              <button
                className={`flex-1 px-4 py-2 text-sm border rounded-md flex items-center justify-center gap-2 transition-colors ${
                  formData.mediaType === 'image'
                    ? 'border-xhs bg-xhs/10 text-xhs'
                    : 'border-border hover:border-xhs/30'
                }`}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  mediaType: 'image',
                  mediaUrls: [],
                  videoUrl: ''
                }))}
              >
                <ImageIcon className="w-4 h-4" />
                图文
              </button>
              <button
                className={`flex-1 px-4 py-2 text-sm border rounded-md flex items-center justify-center gap-2 transition-colors ${
                  formData.mediaType === 'video'
                    ? 'border-xhs bg-xhs/10 text-xhs'
                    : 'border-border hover:border-xhs/30'
                }`}
                onClick={() => setFormData(prev => ({
                  ...prev,
                  mediaType: 'video',
                  mediaUrls: [],
                  videoUrl: ''
                }))}
              >
                <Video className="w-4 h-4" />
                视频
              </button>
            </div>
          </div>

          {/* Media Upload */}
          <div>
            <label className="text-xs font-medium">
              {formData.mediaType === 'image' ? '图片' : '视频'}{' '}
              <span className="text-red-500">*</span>
            </label>

            {formData.mediaType === 'image' ? (
              // Image Upload
              <>
                {formData.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2 mb-2">
                    {formData.mediaUrls.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                        <img src={url} alt={`图片 ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`mt-1 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-xhs/30 transition-colors ${
                    errors.mediaUrls ? 'border-red-500' : 'border-border'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'image/jpeg,image/jpg,image/png';
                    input.multiple = true;
                    input.onchange = (e) => {
                      const files = (e.target as HTMLInputElement).files;
                      if (files) handleImageUpload(files);
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    拖拽图片或点击上传
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    支持 JPG, PNG，最多9张
                  </p>
                </div>
                {errors.mediaUrls && (
                  <p className="text-xs text-red-500 mt-1">{errors.mediaUrls}</p>
                )}
              </>
            ) : (
              // Video Upload
              <div className="mt-1 space-y-2">
                <div className="flex gap-2">
                  <button
                    className={`flex-1 px-3 py-2 text-sm border rounded-md flex items-center justify-center gap-1.5 ${
                      videoInputMode === 'upload'
                        ? 'border-xhs bg-xhs/10 text-xhs'
                        : 'border-border'
                    }`}
                    onClick={() => setVideoInputMode('upload')}
                  >
                    <Upload className="w-4 h-4" />
                    本地上传
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 text-sm border rounded-md flex items-center justify-center gap-1.5 ${
                      videoInputMode === 'url'
                        ? 'border-xhs bg-xhs/10 text-xhs'
                        : 'border-border'
                    }`}
                    onClick={() => setVideoInputMode('url')}
                  >
                    <Link className="w-4 h-4" />
                    粘贴链接
                  </button>
                </div>

                {videoInputMode === 'upload' ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-xhs/30 transition-colors ${
                      errors.videoUrl ? 'border-red-500' : 'border-border'
                    }`}
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/mp4,video/quicktime';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) handleVideoUpload(file);
                      };
                      input.click();
                    }}
                  >
                    {formData.videoUrl ? (
                      <div className="text-sm">
                        <p className="text-muted-foreground">视频已上传</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          {formData.videoUrl}
                        </p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          拖拽视频或点击上传
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          支持 MP4, MOV，最大500MB
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className={`flex-1 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring ${
                        errors.videoUrl ? 'border-red-500' : 'border-border'
                      }`}
                      value={formData.videoUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                      placeholder="粘贴视频链接..."
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleVideoUrlInput}
                    >
                      粘贴
                    </Button>
                  </div>
                )}
                {errors.videoUrl && (
                  <p className="text-xs text-red-500">{errors.videoUrl}</p>
                )}
              </div>
            )}

            {/* Upload Progress */}
            {isUploading && (
              <div className="mt-2">
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  上传中... {Math.round(uploadProgress)}%
                </p>
              </div>
            )}
          </div>

          {/* Content */}
          <div>
            <label className="text-xs font-medium">
              正文 <span className="text-red-500">*</span>
            </label>
            <textarea
              className={`w-full mt-1 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring min-h-[280px] ${
                errors.content ? 'border-red-500' : 'border-border'
              }`}
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="输入笔记正文..."
              maxLength={1000}
            />
            {errors.content && (
              <p className="text-xs text-red-500 mt-1">{errors.content}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.content.length}/1000
            </p>
          </div>

          {/* AI Assist button */}
          <Button variant="outline" size="sm" className="w-full" onClick={handleAiAssist}>
            <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
            AI 辅助创作
          </Button>

          {/* Tags */}
          <div>
            <label className="text-xs font-medium">标签</label>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1.5">
                {formData.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 text-xs">
                    {tag}
                    <button onClick={() => removeTag(i)} className="hover:text-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-1">
              <input
                className={`flex-1 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring ${
                  errors.tags ? 'border-red-500' : 'border-border'
                }`}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="输入标签后按回车..."
                maxLength={20}
              />
              <Button size="sm" variant="outline" onClick={addTag}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            {errors.tags && (
              <p className="text-xs text-red-500 mt-1">{errors.tags}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              最多10个标签
            </p>
          </div>

          {/* Publish Mode */}
          <div>
            <label className="text-xs font-medium">
              发布方式 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 mt-1">
              <button
                className={`flex-1 px-4 py-2 text-sm border rounded-md flex items-center justify-center gap-2 transition-colors ${
                  formData.publishMode === 'now'
                    ? 'border-xhs bg-xhs/10 text-xhs'
                    : 'border-border hover:border-xhs/30'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, publishMode: 'now' }))}
              >
                立即发布
              </button>
              <button
                className={`flex-1 px-4 py-2 text-sm border rounded-md flex items-center justify-center gap-2 transition-colors ${
                  formData.publishMode === 'scheduled'
                    ? 'border-xhs bg-xhs/10 text-xhs'
                    : 'border-border hover:border-xhs/30'
                }`}
                onClick={() => setFormData(prev => ({ ...prev, publishMode: 'scheduled' }))}
              >
                <Calendar className="w-4 h-4" />
                定时发布
              </button>
            </div>
          </div>

          {/* Scheduled Time */}
          {formData.publishMode === 'scheduled' && (
            <div>
              <label className="text-xs font-medium">
                发布时间 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2 mt-1">
                <input
                  type="date"
                  className={`flex-1 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring ${
                    errors.scheduledAt ? 'border-red-500' : 'border-border'
                  }`}
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
                <input
                  type="time"
                  className={`w-32 px-3 py-2 text-sm border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring ${
                    errors.scheduledAt ? 'border-red-500' : 'border-border'
                  }`}
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                />
              </div>
              {errors.scheduledAt && (
                <p className="text-xs text-red-500 mt-1">{errors.scheduledAt}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            取消
          </Button>
          <Button
            className="flex-1 bg-xhs hover:bg-xhs-dark text-white"
            onClick={handleSubmit}
            disabled={submitting || isUploading}
          >
            {submitting
              ? '保存中...'
              : formData.publishMode === 'scheduled'
                ? '创建并排期'
                : '保存草稿'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}