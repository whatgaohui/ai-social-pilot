import { useState, useEffect, useCallback, useMemo } from "react";


import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { useAppStore } from "@/store/app-store";
import { useAccountHubStore } from "@/store/account-hub-store";
import type { XhsAccountInfo, XhsPostInfo } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HealthScoreCard } from "@/components/account/health-score-card";
import { AISuggestionsPanel } from "@/components/account/ai-suggestions-panel";
import { ActivityTimeline } from "@/components/account/activity-timeline";
import { NoteDetailModal } from "@/components/account/note-detail-drawer";
import { NoteCreationDialog } from "@/components/account/note-creation-dialog";
import { CalendarTab } from '@/components/account/calendar-tab';
import {
  UserCircle,
  CalendarDays,
  Theater,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Sparkles,
  Star,
  Eye,
  TrendingUp,
  BarChart3,
  Lightbulb,
  Clock,
  FileText,
} from "lucide-react";

// ─── Utility: format numbers ────────────────────────────────────────────
function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Metric Card ────────────────────────────────────────────────────────
function MetricCard({ icon: Icon, label, value, color, bgColor }: { icon: React.ElementType; label: string; value: string; color: string; bgColor: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", bgColor)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
        <p className="text-xl font-bold mt-2">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── Engagement Bar ─────────────────────────────────────────────────────
function EngagementBar({ icon: Icon, label, value, max, color }: { icon: React.ElementType; label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <Icon className={cn("w-4 h-4 shrink-0", color)} />
      <span className="text-sm w-10 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn("text-sm font-medium w-12 text-right", color)}>{fmt(value)}</span>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────
function OverviewTab({ accountId }: { accountId: string | null }) {
  const [account, setAccount] = useState<XhsAccountInfo | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const accRes = await fetch(`/api/accounts/${accountId}`);
      const accData = await accRes.json();
      if (accData.success) setAccount(accData.data);
      const anaRes = await fetch(`/api/accounts/${accountId}/analysis`);
      const anaData = await anaRes.json();
      if (anaData.success) {
        setAnalysis(anaData.data);
        // Extract recent posts for timeline
        const calRes = await fetch(`/api/accounts/${accountId}/calendar`);
        const calData = await calRes.json();
        if (calData.success) setPosts(calData.data || []);
      }
    } catch {
      toast.error("加载账号数据失败");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!account) return <div className="flex items-center justify-center h-48 text-muted-foreground">账号不存在</div>;

  const totalEngagement = (analysis?.avgLikes || 0) + (analysis?.avgComments || 0) + (analysis?.avgCollects || 0) + (analysis?.avgShares || 0);
  const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
  const totalCollects = posts.reduce((s, p) => s + (p.collects || 0), 0);
  const totalShares = posts.reduce((s, p) => s + (p.shares || 0), 0);
  const avgEngagementRate = posts.length > 0
    ? (posts.reduce((s, p) => s + ((p.likes || 0) + (p.comments || 0) + (p.collects || 0) + (p.shares || 0)), 0) / posts.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Account Profile */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-4">
            {account.avatarUrl ? (
              <img src={account.avatarUrl} alt={account.nickname} className="w-16 h-16 rounded-full object-cover border-2 border-xhs/20" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-xhs-light to-xhs-light/30 flex items-center justify-center border-2 border-xhs/20">
                <UserCircle className="w-10 h-10 text-xhs" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{account.nickname || "未命名用户"}</h3>
              {account.bio && <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{account.bio}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{account.location && `@${account.location} · `}粉丝 {fmt(account.followers)} · 关注 {fmt(account.following)}</p>
            </div>
            <Button variant="outline" size="sm" className="border-border shrink-0" onClick={loadData}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health Score */}
      <HealthScoreCard accountId={accountId} />

      {/* 6 Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricCard icon={UserCircle} label="粉丝" value={fmt(account.followers)} color="text-xhs" bgColor="bg-xhs-light/10" />
        <MetricCard icon={BarChart3} label="笔记数" value={fmt(analysis?.totalPosts || 0)} color="text-blue-500" bgColor="bg-blue-50 dark:bg-blue-950/20" />
        <MetricCard icon={Heart} label="总点赞" value={fmt(totalLikes)} color="text-pink-500" bgColor="bg-pink-50 dark:bg-pink-950/20" />
        <MetricCard icon={Bookmark} label="总收藏" value={fmt(totalCollects)} color="text-amber-500" bgColor="bg-amber-50 dark:bg-amber-950/20" />
        <MetricCard icon={Share2} label="总分享" value={fmt(totalShares)} color="text-emerald-500" bgColor="bg-emerald-50 dark:bg-emerald-950/20" />
        <MetricCard icon={Sparkles} label="平均互动" value={fmt(totalEngagement)} color="text-purple-500" bgColor="bg-purple-50 dark:bg-purple-950/20" />
      </div>

      {/* AI Suggestions + Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AISuggestionsPanel accountId={accountId} />
        {analysis && analysis.totalPosts > 0 && (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Heart className="w-4 h-4 text-xhs" />互动数据分布</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <EngagementBar icon={Heart} label="点赞" value={analysis.avgLikes} max={Math.max(analysis.avgLikes, 1)} color="text-pink-500" />
              <EngagementBar icon={MessageCircle} label="评论" value={analysis.avgComments} max={Math.max(analysis.avgLikes, 1)} color="text-blue-500" />
              <EngagementBar icon={Bookmark} label="收藏" value={analysis.avgCollects} max={Math.max(analysis.avgLikes, 1)} color="text-amber-500" />
              <EngagementBar icon={Share2} label="分享" value={analysis.avgShares} max={Math.max(analysis.avgLikes, 1)} color="text-emerald-500" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Activity Timeline */}
      {posts.length > 0 && <ActivityTimeline posts={posts.map((p: any) => ({
        id: p.id, title: p.title, publishDate: p.publishDate,
        likes: p.likes || 0, comments: p.comments || 0, collects: p.collects || 0,
        shares: p.shares || 0, category: p.category, aiScore: p.aiScore,
      }))} />}
    </div>
  );
}

// ─── Calendar Tab (moved to calendar-tab.tsx) ──────────────────────────────
// Re-exported from @/components/account/calendar-tab

// ─── Persona Tab ────────────────────────────────────────────────────────

function PersonaTab({ accountId }: { accountId: string | null }) {
  const [persona, setPersona] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", tone: "warm" as string, writingStyle: "balanced" as string,
    targetAudience: "", contentThemes: [] as string[], keywords: [] as string[],
    avoidTopics: [] as string[], referenceDesc: "", signaturePhrase: "",
  });
  const [newTag, setNewTag] = useState("");
  const [tagType, setTagType] = useState<"contentThemes" | "keywords" | "avoidTopics">("contentThemes");

  const loadPersona = useCallback(async () => {
    if (!accountId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/persona?accountId=${accountId}`);
      const data = await res.json();
      if (data.success && data.data) {
        const p = data.data;
        setPersona(p);
        setForm({
          name: p.name || "", tone: p.tone || "warm", writingStyle: p.writingStyle || "balanced",
          targetAudience: p.targetAudience || "", contentThemes: Array.isArray(p.contentThemes) ? p.contentThemes : [],
          keywords: Array.isArray(p.keywords) ? p.keywords : [], avoidTopics: Array.isArray(p.avoidTopics) ? p.avoidTopics : [],
          referenceDesc: p.referenceDesc || "", signaturePhrase: p.signaturePhrase || "",
        });
      }
    } catch {
      toast.error("加载人设失败");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    loadPersona();
  }, [loadPersona]);

  const handleSave = async () => {
    if (!accountId) return;
    setSaving(true);
    try {
      const method = persona ? "PUT" : "POST";
      const res = await fetch("/api/persona", {
        method, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accountId }),
      });
      const data = await res.json();
      if (data.success) {
        setPersona(data.data);
        toast.success(persona ? "人设已更新" : "人设已创建");
      } else {
        toast.error(data.error || "保存失败");
      }
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    const val = newTag.trim();
    if (!val || form[tagType].includes(val)) return;
    setForm({ ...form, [tagType]: [...form[tagType], val] });
    setNewTag("");
  };

  const removeTag = (type: "contentThemes" | "keywords" | "avoidTopics", index: number) => {
    const updated = form[type].filter((_, i) => i !== index);
    setForm({ ...form, [type]: updated });
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-32 rounded-xl" /></div>;

  const toneOptions = [
    { value: "warm", label: "温暖亲切", emoji: "😊" },
    { value: "professional", label: "专业严谨", emoji: "💼" },
    { value: "witty", label: "幽默风趣", emoji: "😄" },
    { value: "casual", label: "随性自然", emoji: "🤙" },
    { value: "elegant", label: "优雅精致", emoji: "✨" },
  ];
  const styleOptions = [
    { value: "concise", label: "简洁精炼", emoji: "📝" },
    { value: "detailed", label: "详细丰富", emoji: "📖" },
    { value: "emotional", label: "感性细腻", emoji: "💗" },
    { value: "balanced", label: "平衡适中", emoji: "⚖️" },
  ];

  const completeness = [
    !!form.name.trim(), true, true, !!form.targetAudience.trim(),
    form.contentThemes.length > 0, form.keywords.length > 0,
    !!form.referenceDesc.trim(), !!form.signaturePhrase.trim(),
  ].filter(Boolean).length;
  const pct = Math.round((completeness / 8) * 100);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">基本信息</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">人设名称</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="例如：生活美学博主"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">语气风格</label>
                <div className="grid grid-cols-5 gap-2">
                  {toneOptions.map(opt => (
                    <button key={opt.value} onClick={() => setForm({ ...form, tone: opt.value })}
                      className={cn("flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs",
                        form.tone === opt.value ? "border-xhs bg-xhs-light text-xhs" : "border-border hover:border-xhs/30")}>
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">写作风格</label>
                <div className="grid grid-cols-4 gap-2">
                  {styleOptions.map(opt => (
                    <button key={opt.value} onClick={() => setForm({ ...form, writingStyle: opt.value })}
                      className={cn("flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-xs",
                        form.writingStyle === opt.value ? "border-xhs bg-xhs-light text-xhs" : "border-border hover:border-xhs/30")}>
                      <span className="text-xl">{opt.emoji}</span>
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">目标受众</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.targetAudience}
                  onChange={e => setForm({ ...form, targetAudience: e.target.value })}
                  placeholder="例如：25-35岁都市女性"
                />
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">内容策略</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {(["contentThemes", "keywords", "avoidTopics"] as const).map(type => {
                const labels = { contentThemes: "内容主题", keywords: "核心关键词", avoidTopics: "避免话题" };
                return (
                  <div key={type} className="space-y-2">
                    <label className="text-xs font-medium">{labels[type]}</label>
                    {form[type].length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {form[type].map((tag: string, i: number) => (
                          <Badge key={i} variant="secondary" className="gap-1 text-xs border-0 bg-xhs-light/60 text-xhs/80">
                            {tag}
                            <button onClick={() => removeTag(type, i)} className="hover:text-xhs"><span className="text-sm">×</span></button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                        value={newTag}
                        onChange={e => setNewTag(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                        placeholder="输入后按回车添加"
                      />
                      <Button size="sm" variant="outline" onClick={() => { setTagType(type); addTag(); }}>添加</Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">参考描述</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">人设描述</label>
                <textarea
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring min-h-[80px]"
                  value={form.referenceDesc}
                  onChange={e => setForm({ ...form, referenceDesc: e.target.value })}
                  placeholder="描述人设定位、品牌调性等..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">标志性用语</label>
                <input
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  value={form.signaturePhrase}
                  onChange={e => setForm({ ...form, signaturePhrase: e.target.value })}
                  placeholder="每篇内容的结尾签名语"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <Button size="sm" className="bg-xhs hover:bg-xhs-dark text-white" onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存人设"}
          </Button>
        </div>

        {/* Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">人设完整度</CardTitle></CardHeader>
            <CardContent className="pb-4">
              <div className="text-lg font-bold text-center mb-2">{pct}%</div>
              <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                <div className="h-full rounded-full bg-xhs transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="sticky top-6">
            <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Eye className="w-4 h-4" />人设预览</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-xhs-light/50 to-xhs-light/10 border border-xhs/10">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-xhs-light to-xhs-light/30 flex items-center justify-center">
                  <UserCircle className="w-8 h-8 text-xhs" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm">{form.name || "未命名人设"}</h4>
                  <p className="text-xs text-muted-foreground">
                    {toneOptions.find(t => t.value === form.tone)?.emoji} {toneOptions.find(t => t.value === form.tone)?.label} · {styleOptions.find(s => s.value === form.writingStyle)?.label}
                  </p>
                </div>
              </div>
              {form.targetAudience && (
                <div><p className="text-[10px] font-semibold text-muted-foreground uppercase">目标受众</p><p className="text-xs">{form.targetAudience}</p></div>
              )}
              {form.contentThemes.length > 0 && (
                <div><p className="text-[10px] font-semibold text-muted-foreground uppercase">内容主题</p>
                  <div className="flex flex-wrap gap-1">{form.contentThemes.map((t: string, i: number) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}</div>
                </div>
              )}
              {form.keywords.length > 0 && (
                <div><p className="text-[10px] font-semibold text-muted-foreground uppercase">核心关键词</p>
                  <div className="flex flex-wrap gap-1">{form.keywords.map((k: string, i: number) => <Badge key={i} className="text-[10px] bg-xhs-light text-xhs border-0">#{k}</Badge>)}</div>
                </div>
              )}
              {form.signaturePhrase && (
                <div className="pt-2 border-t border-border/50"><p className="text-xs italic text-xhs font-medium">&ldquo;{form.signaturePhrase}&rdquo;</p></div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Main Account Hub View ─────────────────────────────────────────────

const hubTabs = [
  { id: "overview" as const, label: "账号概览", icon: UserCircle },
  { id: "calendar" as const, label: "笔记日历", icon: CalendarDays },
  { id: "persona" as const, label: "人设管理", icon: Theater },
];

export function AccountHubView() {
  const { selectedAccountId, setSelectedAccountId, setAddAccountDialogOpen } = useAppStore();
  const { activeHubTab, setActiveHubTab } = useAccountHubStore();
  const [calendarSelectedNoteId, setCalendarSelectedNoteId] = useState<string | null>(null);
  const [calendarCreateDialogOpen, setCalendarCreateDialogOpen] = useState(false);
  const [accounts, setAccounts] = useState<XhsAccountInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) {
        const accountList = data.data || [];
        setAccounts(accountList);
        if (!selectedAccountId && accountList.length > 0) {
          setSelectedAccountId(accountList[0].id);
        }
      } else {
        toast.error(data.error || "加载账号列表失败");
      }
    } catch {
      toast.error("网络错误，无法加载账号列表");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, setSelectedAccountId]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 view-animate">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-4 md:p-6 view-animate">
        <EmptyState icon={UserCircle} title="还没有添加账号" description="添加小红书账号后，即可查看账号数据、笔记日历和人设管理" actionLabel="添加账号" onAction={() => setAddAccountDialogOpen(true)} />
      </div>
    );
  }

  const currentAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="p-4 md:p-6 space-y-5 view-animate h-full overflow-y-auto custom-scrollbar pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight">账号中心</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" className="bg-xhs text-white" onClick={() => setAddAccountDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            添加账号
          </Button>
          <select value={selectedAccountId || ""} onChange={e => setSelectedAccountId(e.target.value)}
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-white dark:bg-neutral-950">
            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.nickname || "未命名用户"}</option>)}
          </select>
          <Button variant="outline" size="sm" className="border-border" onClick={loadAccounts}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {currentAccount && (
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white dark:bg-neutral-950 border border-border">
          {currentAccount.avatarUrl ? (
            <img src={currentAccount.avatarUrl} alt={currentAccount.nickname} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-xhs-light to-xhs-light/30 flex items-center justify-center">
              <UserCircle className="w-6 h-6 text-xhs" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{currentAccount.nickname || "未命名用户"}</p>
            <p className="text-xs text-muted-foreground">粉丝 {currentAccount.followers?.toLocaleString() || 0} · 笔记 {currentAccount.notesCount || 0}</p>
          </div>
          {currentAccount.lastScrapedAt && (
            <p className="text-xs text-muted-foreground hidden sm:block">上次采集: {new Date(currentAccount.lastScrapedAt).toLocaleDateString("zh-CN")}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-border">
        {hubTabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveHubTab(tab.id)}
            className={cn("flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              activeHubTab === tab.id ? "border-xhs text-xhs" : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted")}>
            <tab.icon className="w-4 h-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeHubTab === "overview" && <OverviewTab accountId={selectedAccountId} />}
      {activeHubTab === "calendar" && <CalendarTab accountId={selectedAccountId} onNoteClick={(id) => setCalendarSelectedNoteId(id)} onCreateClick={() => setCalendarCreateDialogOpen(true)} />}
      {activeHubTab === "persona" && <PersonaTab accountId={selectedAccountId} />}

      {/* Calendar note detail modal */}
      {calendarSelectedNoteId && selectedAccountId && (
        <NoteDetailModal accountId={selectedAccountId} noteId={calendarSelectedNoteId} open onClose={() => setCalendarSelectedNoteId(null)} />
      )}

      {/* Calendar note creation dialog */}
      {selectedAccountId && (
        <NoteCreationDialog accountId={selectedAccountId} open={calendarCreateDialogOpen} onClose={() => setCalendarCreateDialogOpen(false)} onSuccess={() => {}} />
      )}
    </div>
  );
}
