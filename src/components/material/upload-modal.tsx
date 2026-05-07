'use client';

import { useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMaterialStore } from '@/store/material-store';
import { X, Upload, Image, Video, FileText, Check, AlertCircle } from 'lucide-react';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

function getFileIcon(type: string) {
  if (type.startsWith('image')) return <Image className="w-4 h-4 text-blue-500" />;
  if (type.startsWith('video')) return <Video className="w-4 h-4 text-purple-500" />;
  return <FileText className="w-4 h-4 text-green-500" />;
}

function getFileTypeLabel(type: string) {
  if (type.startsWith('image')) return '图片';
  if (type.startsWith('video')) return '视频';
  return '文本';
}

export function UploadModal() {
  const { isUploadOpen, setUploadOpen, uploadItems, addUploadItem, updateUploadItem, removeUploadItem, clearUploadItems } = useMaterialStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        addUploadItem({ id: crypto.randomUUID(), file, progress: 0, status: 'error', error: '不支持的文件类型' });
        continue;
      }
      const id = crypto.randomUUID();
      addUploadItem({ id, file, progress: 0, status: 'pending' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);

      try {
        updateUploadItem(id, { status: 'uploading', progress: 10 });
        const res = await fetch('/api/materials', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
          updateUploadItem(id, { status: 'done', progress: 100, result: json.data });
        } else {
          updateUploadItem(id, { status: 'error', progress: 0, error: json.error });
        }
      } catch {
        updateUploadItem(id, { status: 'error', progress: 0, error: '上传失败' });
      }
    }
  }, [addUploadItem, updateUploadItem]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    isDragging.current = false;
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    isDragging.current = true;
  }, []);

  const handleDragLeave = useCallback(() => {
    isDragging.current = false;
  }, []);

  const uploadingCount = uploadItems.filter((i) => i.status === 'uploading').length;
  const doneCount = uploadItems.filter((i) => i.status === 'done').length;
  const errorCount = uploadItems.filter((i) => i.status === 'error').length;

  return (
    <Dialog open={isUploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>上传素材</DialogTitle>
        </DialogHeader>

        <div
          className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-xhs-light"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">拖拽文件到此处，或点击选择</p>
          <p className="text-xs text-muted-foreground mt-1">支持图片、视频文件（文案请使用「新建文案」按钮）</p>
          <input ref={fileInputRef} type="file" multiple className="hidden" accept={ALLOWED_TYPES.join(',')} onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {uploadItems.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-auto">
            {uploadItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                {getFileIcon(item.file.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{getFileTypeLabel(item.file.type)} · {(item.file.size / 1024).toFixed(0)}KB</p>
                  {item.status === 'uploading' && <Progress value={item.progress} className="h-1 mt-1" />}
                </div>
                {item.status === 'done' && <Check className="w-4 h-4 text-green-500" />}
                {item.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                {(item.status === 'done' || item.status === 'error') && (
                  <button onClick={() => removeUploadItem(item.id)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {uploadItems.length > 0 && (
          <div className="flex justify-between items-center text-xs text-muted-foreground">
            <span>总计 {uploadItems.length} 个文件</span>
            <span>
              {doneCount > 0 && <span className="text-green-500 mr-2">✓ {doneCount} 完成</span>}
              {uploadingCount > 0 && <span className="text-blue-500 mr-2">↻ {uploadingCount} 上传中</span>}
              {errorCount > 0 && <span className="text-red-500">✗ {errorCount} 失败</span>}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {uploadItems.some((i) => i.status === 'done' || i.status === 'error') && (
            <Button variant="outline" size="sm" onClick={clearUploadItems}>清空列表</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setUploadOpen(false); clearUploadItems(); }}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
