'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Shield, AlertTriangle, CheckCircle2, XCircle, Clock, Play, RefreshCw } from 'lucide-react';

interface InspectionRun {
  id: string;
  status: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  issuesFound: number;
  newIssues: number;
  durationMs: number;
  startedAt: string;
  completedAt: string | null;
  skipReason?: string;
}

interface InspectionIssue {
  id: string;
  issueCode: string;
  category: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  foundAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

function severityLabel(severity: string): string {
  switch (severity) {
    case 'critical': return '严重';
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return severity;
  }
}

function runStatusIcon(status: string) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
    case 'skipped': return <Clock className="w-4 h-4 text-gray-500" />;
    default: return <Clock className="w-4 h-4 text-gray-500" />;
  }
}

export function InspectionPanel() {
  const [runs, setRuns] = useState<InspectionRun[]>([]);
  const [issues, setIssues] = useState<InspectionIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [tab, setTab] = useState<'runs' | 'issues'>('runs');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [runsRes, issuesRes] = await Promise.all([
        fetch('/api/inspection/runs?limit=10').then((r) => r.json()),
        fetch('/api/inspection/issues?limit=20').then((r) => r.json()),
      ]);
      if (runsRes.success) setRuns(runsRes.data);
      if (issuesRes.success) setIssues(issuesRes.data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/inspection/run', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setTimeout(() => fetchData(), 3000); // wait for completion
      }
    } catch {
      // silently fail
    } finally {
      setRunning(false);
    }
  };

  const latestRun = runs[0];
  const openIssues = issues.filter((i) => i.status === 'open');
  const criticalIssues = openIssues.filter((i) => i.severity === 'critical' || i.severity === 'high');

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="w-5 h-5" />
          加载中...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-xhs" />
          <h3 className="font-semibold">自动巡检</h3>
          {criticalIssues.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalIssues.length} 个紧急问题
            </Badge>
          )}
        </div>
        <Button size="sm" onClick={handleRun} disabled={running}>
          {running ? (
            <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-1.5" />
          )}
          {running ? '巡检中...' : '立即巡检'}
        </Button>
      </div>

      {/* Summary */}
      {latestRun && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <p className="text-2xl font-bold">{latestRun.totalChecks}</p>
            <p className="text-xs text-muted-foreground">总检查数</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{latestRun.passedChecks}</p>
            <p className="text-xs text-muted-foreground">通过</p>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-2xl font-bold text-red-600">{latestRun.failedChecks}</p>
            <p className="text-xs text-muted-foreground">失败</p>
          </div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <p className="text-2xl font-bold text-amber-600">{openIssues.length}</p>
            <p className="text-xs text-muted-foreground">待修复</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        <Button
          variant={tab === 'runs' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('runs')}
          className="text-xs"
        >
          巡检记录
        </Button>
        <Button
          variant={tab === 'issues' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTab('issues')}
          className="text-xs"
        >
          问题列表 ({openIssues.length})
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-2 max-h-96 overflow-auto">
        {tab === 'runs' && (
          runs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无巡检记录</p>
          ) : (
            runs.map((run) => (
              <div
                key={run.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {runStatusIcon(run.status)}
                  <div>
                    <p className="text-sm font-medium">
                      {run.status === 'completed' ? '巡检完成'
                        : run.status === 'running' ? '巡检中'
                        : run.status === 'failed' ? '巡检失败'
                        : run.status === 'skipped' ? '已跳过'
                        : run.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {run.completedAt ? `${run.passedChecks}/${run.totalChecks} 通过` : ''}
                      {' · '}
                      {timeAgo(run.startedAt)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {run.failedChecks > 0 && (
                    <p className="text-xs text-red-500">{run.failedChecks} 失败</p>
                  )}
                  {run.skipReason && (
                    <p className="text-xs text-muted-foreground truncate max-w-40" title={run.skipReason}>
                      {run.skipReason}
                    </p>
                  )}
                </div>
              </div>
            ))
          )
        )}

        {tab === 'issues' && (
          issues.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">暂无问题</p>
          ) : (
            issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start gap-2">
                  {issue.status === 'open' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{issue.title}</p>
                      <Badge variant="secondary" className={`text-[10px] ${severityColor(issue.severity)}`}>
                        {severityLabel(issue.severity)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {issue.issueCode} · {issue.category} · {timeAgo(issue.foundAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </Card>
  );
}
