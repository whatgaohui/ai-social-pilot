'use client';

import { useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useMaterialStore, type Material } from '@/store/material-store';
import { AlertCircle, Check, FileText, Image as ImageIcon, Upload, Video, X } from 'lucide-react';
import { extractVideoThumbnail } from '@/lib/video-thumbnail';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'];

function getFileIcon(type: string) {
  if (type.startsWith('image')) return <ImageIcon className="h-4 w-4 text-blue-500" />;
  if (type.startsWith('video')) return <Video className="h-4 w-4 text-purple-500" />;
  return <FileText className="h-4 w-4 text-green-500" />;
}

function getFileTypeLabel(type: string) {
  if (type.startsWith('image')) return '图片';
  if (type.startsWith('video')) return '视频';
  return '文件';
}

function addMaterialToList(material: Material) {
  useMaterialStore.setState((state) => {
    if (state.filterType !== 'all' && state.filterType !== material.type) return {};
    if (state.materials.some((item) => item.id === material.id)) return {};
    return {
      materials: [material, ...state.materials],
      total: state.total + 1,
    };
  });
}

export function UploadModal() {
  const { isUploadOpen, setUploadOpen, uploadItems, addUploadItem, updateUploadItem, removeUploadItem, clearUploadItems } = useMaterialStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        addUploadItem({ id: crypto.randomUUID(), file, progress: 0, status: 'error', error: '不支持的文件类型' });
        continue;
      }

      const id = crypto.randomUUID();
      addUploadItem({ id, file, progress: 0, status: 'pending' });

      try {
        updateUploadItem(id, { status: 'uploading', progress: 10 });

        // Extract thumbnail for videos
        let thumbnailBase64: string | undefined;
        if (file.type.startsWith('video')) {
          updateUploadItem(id, { status: 'uploading', progress: 15, error: '正在生成封面...' });
          try {
            thumbnailBase64 = await extractVideoThumbnail(file);
          } catch {
            // Continue without thumbnail if extraction fails
          }
        }

        updateUploadItem(id, { status: 'uploading', progress: 25 });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', file.name);
        if (thumbnailBase64) formData.append('thumbnail', thumbnailBase64);

        updateUploadItem(id, { status: 'uploading', progress: 40 });
        const res = await fetch('/api/materials', { method: 'POST', body: formData });
        const json = await res.json();
        if (json.success) {
          updateUploadItem(id, { status: 'done', progress: 100, result: json.data });
          addMaterialToList(json.data);
        } else {
          updateUploadItem(id, { status: 'error', progress: 0, error: json.error || '上传失败' });
        }
      } catch {
        updateUploadItem(id, { status: 'error', progress: 0, error: '上传失败' });
      }
    }
  }, [addUploadItem, updateUploadItem]);

  const uploadingCount = uploadItems.filter((item) => item.status === 'uploading').length;
  const doneCount = uploadItems.filter((item) => item.status === 'done').length;
  const errorCount = uploadItems.filter((item) => item.status === 'error').length;

  return (
    <Dialog open={isUploadOpen} onOpenChange={setUploadOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>上传素材</DialogTitle>
        </DialogHeader>

        <div
          className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-xhs-light"
          onDrop={(event) => {
            event.preventDefault();
            handleFiles(event.dataTransfer.files);
          }}
          onDragOver={(event) => event.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">拖拽文件到这里，或点击选择</p>
          <p className="mt-1 text-xs text-muted-foreground">支持图片和视频文件；文案请用“新建文案”</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept={ALLOWED_TYPES.join(',')}
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>

        {uploadItems.length > 0 && (
          <div className="max-h-60 space-y-2 overflow-auto">
            {uploadItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                {getFileIcon(item.file.type)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.file.name}</p>
                  <p className="text-xs text-muted-foreground">{getFileTypeLabel(item.file.type)} · {(item.file.size / 1024).toFixed(0)}KB</p>
                  {item.status === 'uploading' && <Progress value={item.progress} className="mt-1 h-1" />}
                  {item.status === 'error' && item.error && <p className="mt-1 text-xs text-red-500">{item.error}</p>}
                </div>
                {item.status === 'done' && <Check className="h-4 w-4 text-green-500" />}
                {item.status === 'error' && <AlertCircle className="h-4 w-4 text-red-500" />}
                {(item.status === 'done' || item.status === 'error') && (
                  <button onClick={() => removeUploadItem(item.id)} className="text-muted-foreground hover:text-foreground" type="button" aria-label="移除">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {uploadItems.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>总计 {uploadItems.length} 个文件</span>
            <span>
              {doneCount > 0 && <span className="mr-2 text-green-500">{doneCount} 完成</span>}
              {uploadingCount > 0 && <span className="mr-2 text-blue-500">{uploadingCount} 上传中</span>}
              {errorCount > 0 && <span className="text-red-500">{errorCount} 失败</span>}
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {uploadItems.some((item) => item.status === 'done' || item.status === 'error') && (
            <Button variant="outline" size="sm" onClick={clearUploadItems}>清空列表</Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { setUploadOpen(false); clearUploadItems(); }}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
