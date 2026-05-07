'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Edit, Trash2, Play, Video, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface Draft {
  id: string;
  title: string;
  content: string;
  mediaType: string;
  mediaUrls: string[];
  videoUrl: string;
  tags: string[];
  status: string;
  scheduledAt: string;
  createdAt: string;
  updatedAt: string;
}

interface DraftBoxProps {
  accountId: string;
  onEditDraft?: (draft: Draft) => void;
}

export function DraftBox({ accountId, onEditDraft }: DraftBoxProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, [accountId]);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts`);
      const json = await res.json();
      if (json.success) {
        setDrafts(json.data);
      } else {
        toast.error('获取草稿列表失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (draftId: string) => {
    if (!confirm('确定要删除这个草稿吗？')) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts/${draftId}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        toast.success('草稿已删除');
        fetchDrafts();
      } else {
        toast.error(json.error || '删除失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    }
  };

  const handleSchedule = async (draft: Draft) => {
    const dateInput = prompt('请输入发布日期 (YYYY-MM-DD):');
    if (!dateInput) return;

    const timeInput = prompt('请输入发布时间 (HH:mm):', '10:00');
    if (!timeInput) return;

    const scheduledAt = `${dateInput}T${timeInput}:00`;

    try {
      const res = await fetch(`/api/accounts/${accountId}/drafts/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'scheduled',
          scheduledAt,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('草稿已排期');
        fetchDrafts();
      } else {
        toast.error(json.error || '排期失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    }
  };

  const handlePublish = async (draft: Draft) => {
    toast.info('发布功能开发中，当前请手动发布');
    // TODO: Implement actual publish logic
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: '草稿', variant: 'secondary' },
      scheduled: { label: '已排期', variant: 'default' },
      published: { label: '已发布', variant: 'success' },
      cancelled: { label: '已取消', variant: 'destructive' },
    };
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return <Badge variant={config.variant as any}>{config.label}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground">暂无草稿</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          创建笔记后会保存在这里
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">草稿箱</h2>
        <Badge variant="outline">{drafts.length} 条</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {drafts.map((draft) => (
          <Card key={draft.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium line-clamp-1">
                  {draft.title || '未命名笔记'}
                </CardTitle>
                {getStatusBadge(draft.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Media Type */}
              <div className="flex items-center gap-2">
                {draft.mediaType === 'image' ? (
                  <ImageIcon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Video className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground">
                  {draft.mediaType === 'image' ? '图文' : '视频'}
                </span>
                {draft.mediaType === 'image' && draft.mediaUrls.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    ({draft.mediaUrls.length}张)
                  </span>
                )}
              </div>

              {/* Content Preview */}
              <p className="text-xs text-muted-foreground line-clamp-2">
                {draft.content || '暂无内容'}
              </p>

              {/* Tags */}
              {draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {draft.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {draft.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{draft.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Schedule Info */}
              {draft.status === 'scheduled' && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {formatDate(draft.scheduledAt)}
                  <Clock className="w-3 h-3 ml-1" />
                  {formatTime(draft.scheduledAt)}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditDraft?.(draft)}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  编辑
                </Button>

                {draft.status === 'draft' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSchedule(draft)}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      排期
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePublish(draft)}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      发布
                    </Button>
                  </>
                )}

                {draft.status === 'scheduled' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSchedule(draft)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    修改排期
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(draft.id)}
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}