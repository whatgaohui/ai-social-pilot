"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, Eye, Heart, TrendingUp, Zap, Clock,
  BarChart3, Layers, Star, DollarSign, Activity, Settings, Plus, Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/ui/data-table";
import { TagInput } from "@/components/ui/tag-input";
import {
  StatCard,
} from "@/components/ui/stat-card";
import {
  CircularProgress,
  LinearProgress,
  StepProgress,
  ScoreGauge,
} from "@/components/ui/progress-indicators";
import {
  GlowPanel,
  GradientDivider,
  SectionHeader,
} from "@/components/ui/panel-enhancements";
import {
  MorphingButton,
  StaggerList,
  RevealOnScroll,
  NumberRoll,
  ShimmerOverlay,
} from "@/components/ui/advanced-animations";
import { InspirationWaterfall } from "@/components/right-panel/inspiration-waterfall";
import { CreativeAssetsLibrary } from "@/components/right-panel/creative-assets-library";
import { Lightbulb, FolderOpen, Sparkles as SparklesIcon } from "lucide-react";

// ─── Demo Data ────────────────────────────────────────────────────────────────

interface PostRecord {
  id: number;
  title: string;
  platform: string;
  likes: number;
  comments: number;
  status: string;
  date: string;
}

const generatePosts = (): PostRecord[] => {
  const titles = [
    "职场成长心得分享", "周末咖啡探店", "产品思考总结",
    "设计灵感收藏", "读书笔记分享", "生活小妙招",
    "年度目标复盘", "团队管理经验", "前端技术分享",
    "AI工具测评", "健身打卡记录", "旅行攻略整理",
    "摄影作品展示", "美食制作教程", "理财心得分享",
    "职场穿搭指南", "时间管理技巧", "数据分析报告",
    "创意营销案例", "用户体验优化", "社区运营心得",
    "个人品牌打造", "跨年感悟总结", "新年计划制定",
    "高效学习方法", "项目管理实践", "远程办公技巧",
  ];
  const platforms = ["朋友圈", "小红书", "微博", "抖音"];
  const statuses = ["已发布", "草稿", "审核中", "定时发布"];

  return Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    title: titles[i % titles.length],
    platform: platforms[i % platforms.length],
    likes: Math.floor(Math.random() * 2000) + 10,
    comments: Math.floor(Math.random() * 300) + 1,
    status: statuses[i % statuses.length],
    date: `2025-01-${String(Math.floor(i / 4) + 1).padStart(2, "0")}`,
  }));
};

const posts = generatePosts();

const columns: DataTableColumn<PostRecord>[] = [
  { key: "id", title: "#", width: "50px", align: "center", sortable: true },
  {
    key: "title", title: "标题", sortable: true, width: "200px",
    render: (_, row) => (
      <span className="font-medium text-foreground max-w-[180px] truncate block">{row.title}</span>
    ),
  },
  {
    key: "platform", title: "平台", sortable: true, width: "90px",
    render: (_, row) => {
      const colors: Record<string, string> = {
        "朋友圈": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        "小红书": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        "微博": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
        "抖音": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      };
      return <Badge variant="secondary" className={colors[row.platform] || ""}>{row.platform}</Badge>;
    },
  },
  {
    key: "likes", title: "点赞", sortable: true, width: "80px", align: "right",
    render: (val) => <span className="tabular-nums">{Number(val).toLocaleString()}</span>,
  },
  {
    key: "comments", title: "评论", sortable: true, width: "80px", align: "right",
    render: (val) => <span className="tabular-nums">{Number(val).toLocaleString()}</span>,
  },
  {
    key: "status", title: "状态", width: "100px",
    render: (_, row) => {
      const statusConfig: Record<string, { label: string; className: string }> = {
        "已发布": { label: "已发布", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
        "草稿": { label: "草稿", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
        "审核中": { label: "审核中", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
        "定时发布": { label: "定时", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
      };
      const config = statusConfig[row.status] || statusConfig["草稿"];
      return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
    },
  },
  { key: "date", title: "日期", width: "100px", align: "right" },
];

// ─── Section Wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <SectionHeader
        title={title}
        subtitle={description}
        accentColor="purple"
        bottomGlow
      />
      {children}
    </motion.section>
  );
}

// ─── Main Showcase Page ──────────────────────────────────────────────────────

export default function Home() {
  const [tags, setTags] = useState<string[]>(["AI运营", "朋友圈", "内容营销"]);
  const [step, setStep] = useState(3);
  const [progressValue, setProgressValue] = useState(72);
  const [score, setScore] = useState(82);
  const [showEmpty, setShowEmpty] = useState(false);
  const [morphState, setMorphState] = useState<"idle" | "loading" | "done">("idle");
  const [targetNumber, setTargetNumber] = useState(2847);
  const [shimmerLoading, setShimmerLoading] = useState(true);

  const cycleStep = useCallback(() => setStep((s) => (s >= 5 ? 1 : s + 1)), []);
  const cycleProgress = useCallback(() => setProgressValue((v) => (v >= 100 ? 10 : v + 15)), []);
  const cycleScore = useCallback(() => {
    setScore((s) => { const next = s + 18; return next > 100 ? next - 118 : next; });
  }, []);

  const handleMorphClick = useCallback(() => {
    setMorphState("loading");
    setTimeout(() => setMorphState("done"), 1500);
    setTimeout(() => setMorphState("idle"), 3000);
  }, []);

  const cycleNumber = useCallback(() => {
    setTargetNumber((n) => Math.floor(Math.random() * 9000) + 1000);
  }, []);

  const toggleShimmer = useCallback(() => {
    if (shimmerLoading) {
      setShimmerLoading(false);
    } else {
      setShimmerLoading(true);
      setTimeout(() => setShimmerLoading(false), 3000);
    }
  }, [shimmerLoading]);

  return (
    <div className="min-h-screen bg-gradient-animated">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          <Badge className="badge-glow badge-glow-violet text-[11px] px-3 py-0.5">
            Round 40 — Track A
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="text-gradient-purple-pink">内容灵感瀑布流</span>
            <span className="text-muted-foreground font-normal ml-2">+ 创意素材库</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            30+ 灵感瀑布流 · 分类筛选 · 收藏/AI改写 · 25+ 文案片段 · 40 话题标签 · 拖拽排序 · 暗黑模式
          </p>
        </motion.div>

        {/* ─── Section 1: GlowPanel Showcase ────────────────── */}
        <Section
          title="发光面板组件"
          description="GlowPanel: 3种强度 × 3种颜色 · 悬浮增强 · 渐变背景"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subtle */}
            <GlowPanel variant="subtle" glowColor="purple" gradient>
              <p className="text-sm font-semibold">Subtle · Purple</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">微光紫，适合次要面板</p>
            </GlowPanel>

            {/* Default */}
            <GlowPanel variant="default" glowColor="green" gradient>
              <p className="text-sm font-semibold">Default · Green</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">标准绿，适合主要面板</p>
            </GlowPanel>

            {/* Intense */}
            <GlowPanel variant="intense" glowColor="amber" gradient>
              <p className="text-sm font-semibold">Intense · Amber</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">强光琥珀，适合强调区域</p>
            </GlowPanel>

            {/* Shimmer variant */}
            <GlowPanel variant="default" glowColor="purple" className="animate-border-dance">
              <p className="text-sm font-semibold">Border Dance</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">流光边框效果</p>
            </GlowPanel>

            {/* No gradient */}
            <GlowPanel variant="subtle" glowColor="green">
              <p className="text-sm font-semibold">Solid Background</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">纯色背景 + 微光边框</p>
            </GlowPanel>

            {/* Intense purple */}
            <GlowPanel variant="intense" glowColor="purple" gradient className="animate-glow-pulse">
              <p className="text-sm font-semibold">Glow Pulse</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">呼吸发光动画</p>
            </GlowPanel>
          </div>
        </Section>

        {/* ─── Section 2: GradientDivider Showcase ───────────── */}
        <Section
          title="渐变分割线"
          description="GradientDivider: 6种预设 · 水平/垂直 · 可选闪烁动画"
        >
          <div className="space-y-4">
            {(["purple-pink", "green-teal", "amber-orange", "rainbow", "purple-green", "subtle"] as const).map(
              (preset) => (
                <div key={preset} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-[var(--text-muted)] w-24 shrink-0">
                    {preset}
                  </span>
                  <GradientDivider preset={preset} thickness={1} className="flex-1" />
                  <GradientDivider preset={preset} thickness={1} direction="vertical" height="24px" shimmer />
                </div>
              )
            )}
          </div>
        </Section>

        {/* ─── Section 3: SectionHeader Showcase ─────────────── */}
        <Section
          title="区域标题组件"
          description="SectionHeader: 5种色条 · 标题+副标题 · 右侧操作区 · 底部阴影"
        >
          <div className="space-y-6">
            <SectionHeader
              title="数据分析面板"
              subtitle="实时追踪核心运营指标"
              accentColor="purple"
              bottomGlow
              actions={
                <Button variant="outline" size="sm" className="text-xs">
                  <Settings className="w-3 h-3 mr-1" /> 设置
                </Button>
              }
            />
            <SectionHeader
              title="内容创作工作台"
              subtitle="AI 辅助生成高质量内容"
              accentColor="green"
              bottomGlow
              actions={
                <Button size="sm" className="text-xs">
                  <Plus className="w-3 h-3 mr-1" /> 新建
                </Button>
              }
            />
            <SectionHeader
              title="灵感收藏夹"
              subtitle="收集和管理创意素材"
              accentColor="amber"
              bottomGlow
              actions={
                <Button variant="ghost" size="sm" className="text-xs">
                  <Sparkles className="w-3 h-3 mr-1" /> AI推荐
                </Button>
              }
            />
          </div>
        </Section>

        <Separator />

        {/* ─── Section 4: MorphingButton Showcase ────────────── */}
        <Section
          title="形变按钮"
          description="MorphingButton: idle→hover圆角膨胀 · loading→done勾号绘制动画"
        >
          <div className="flex flex-wrap gap-4 items-center">
            <MorphingButton
              state={morphState}
              onClick={handleMorphClick}
              className="bg-[var(--accent-purple)] text-white hover:bg-[var(--accent-purple)]/90"
            >
              发送内容
            </MorphingButton>
            <MorphingButton
              variant="outline"
              className="border-[var(--accent-green)] text-[var(--accent-green)]"
              state="idle"
            >
              保存草稿
            </MorphingButton>
            <span className="text-xs text-[var(--text-muted)]">
              点击紫色按钮查看 loading → done 动画
            </span>
          </div>
        </Section>

        {/* ─── Section 5: StaggerList & RevealOnScroll ───────── */}
        <Section
          title="交错动画与滚动揭示"
          description="StaggerList: 子项依次入场 · RevealOnScroll: 5种揭示效果"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* StaggerList */}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-3">StaggerList — fade-up</p>
              <StaggerList animation="fade-up" staggerDelay={80} className="space-y-2">
                {["内容策略", "视觉设计", "发布时间", "互动数据", "效果复盘"].map(
                  (item, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover-lift-sm press-scale-enhanced cursor-pointer"
                    >
                      <span className="text-sm">{item}</span>
                    </div>
                  )
                )}
              </StaggerList>
            </div>

            {/* RevealOnScroll */}
            <div>
              <p className="text-xs text-[var(--text-muted)] mb-3">RevealOnScroll — 各种效果</p>
              <div className="space-y-3">
                {(["fade-up", "slide-left", "scale", "rotate", "fade"] as const).map(
                  (effect, i) => (
                    <RevealOnScroll key={effect} effect={effect} delay={i * 80}>
                      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                        <span className="text-sm font-medium">{effect}</span>
                        <span className="text-xs text-[var(--text-muted)] ml-2">← 滚动到此揭示</span>
                      </div>
                    </RevealOnScroll>
                  )
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Section 6: NumberRoll ─────────────────────────── */}
        <Section
          title="数字滚动效果"
          description="NumberRoll: 旧值→新值平滑动画 · 支持小数和千分位"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <GlowPanel variant="subtle" glowColor="purple">
              <p className="text-xs text-[var(--text-muted)]">粉丝增长</p>
              <NumberRoll
                value={targetNumber}
                thousands
                decimals={0}
                prefix=""
                suffix=""
                className="text-2xl font-bold text-[var(--accent-purple)]"
              />
            </GlowPanel>
            <GlowPanel variant="subtle" glowColor="green">
              <p className="text-xs text-[var(--text-muted)]">互动率</p>
              <NumberRoll
                value={parseFloat((targetNumber / 420).toFixed(1))}
                thousands={false}
                decimals={1}
                suffix="%"
                className="text-2xl font-bold text-[var(--accent-green)]"
              />
            </GlowPanel>
            <GlowPanel variant="subtle" glowColor="amber">
              <p className="text-xs text-[var(--text-muted)]">转化收入</p>
              <NumberRoll
                value={targetNumber * 2.8}
                decimals={2}
                prefix="¥"
                thousands
                className="text-2xl font-bold text-[var(--accent-amber)]"
              />
            </GlowPanel>
          </div>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={cycleNumber} className="text-xs">
              刷新数字
            </Button>
          </div>
        </Section>

        {/* ─── Section 7: ShimmerOverlay ────────────────────── */}
        <Section
          title="光泽扫过效果"
          description="ShimmerOverlay: 加载占位 · 对角线渐变动画 · 平滑过渡"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ShimmerOverlay
              loading={shimmerLoading}
              rounded="lg"
              placeholderHeight="100px"
            >
              <div className="p-4">
                <p className="text-sm font-semibold">加载完成的内容</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  从光泽占位平滑过渡到实际内容
                </p>
              </div>
            </ShimmerOverlay>

            <ShimmerOverlay
              loading={shimmerLoading}
              rounded="lg"
              placeholderHeight="100px"
              shimmerColor="rgba(16, 185, 129, 0.08)"
            >
              <div className="p-4">
                <p className="text-sm font-semibold">绿色光泽</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  支持自定义光泽颜色
                </p>
              </div>
            </ShimmerOverlay>

            <ShimmerOverlay
              loading={shimmerLoading}
              rounded="lg"
              placeholderHeight="100px"
              shimmerColor="rgba(245, 158, 11, 0.08)"
            >
              <div className="p-4">
                <p className="text-sm font-semibold">琥珀光泽</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  多种配色方案可选
                </p>
              </div>
            </ShimmerOverlay>
          </div>
          <div className="mt-3">
            <Button variant="outline" size="sm" onClick={toggleShimmer} className="text-xs">
              {shimmerLoading ? "显示内容" : "重新加载"}
            </Button>
          </div>
        </Section>

        <Separator />

        {/* ─── Section 8: CSS Utility Showcase ────────────────── */}
        <Section
          title="CSS 工具类展示"
          description="hover-lift-sm/md/lg · animate-border-dance · animate-glow-pulse · transition-smooth"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2 hover-lift-sm press-scale-enhanced cursor-pointer">
              <p className="text-sm font-semibold">hover-lift-sm</p>
              <p className="text-xs text-[var(--text-muted)]">轻微上浮 2px</p>
            </div>
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2 hover-lift-md press-scale-enhanced cursor-pointer">
              <p className="text-sm font-semibold">hover-lift-md</p>
              <p className="text-xs text-[var(--text-muted)]">中等上浮 4px</p>
            </div>
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2 hover-lift-lg press-scale-enhanced cursor-pointer">
              <p className="text-sm font-semibold">hover-lift-lg</p>
              <p className="text-xs text-[var(--text-muted)]">大幅上浮 6px</p>
            </div>
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2 animate-border-dance cursor-pointer">
              <p className="text-sm font-semibold">animate-border-dance</p>
              <p className="text-xs text-[var(--text-muted)]">流光边框动画</p>
            </div>
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2 animate-glow-pulse cursor-pointer">
              <p className="text-sm font-semibold">animate-glow-pulse</p>
              <p className="text-xs text-[var(--text-muted)]">发光呼吸脉冲</p>
            </div>
            <div className="p-5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] space-y-2 animate-float-gentle cursor-pointer">
              <p className="text-sm font-semibold">animate-float-gentle</p>
              <p className="text-xs text-[var(--text-muted)]">温和浮动动画</p>
            </div>
          </div>
        </Section>

        {/* ─── Section 9: Stat Cards ─────────────────────────── */}
        <Section
          title="统计卡片组件"
          description="5种变体：default / minimal / glass / gradient / outline"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              variant="default" title="总粉丝数" value="12,847"
              change="+8.2%" changeType="increase" icon={Users}
              iconColor="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
              description="较上月增长"
              sparkline={{ values: [40, 55, 48, 62, 58, 72, 68, 85] }}
              delay={0}
            />
            <StatCard
              variant="glass" title="今日曝光" value="45.2K"
              change="+12.5%" changeType="increase" icon={Eye}
              iconColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              sparkline={{ values: [30, 38, 35, 42, 50, 45, 55, 60] }}
              delay={0.05}
            />
            <StatCard
              variant="gradient" title="互动率" value="6.8%"
              change="-0.3%" changeType="decrease" icon={Heart}
              iconColor="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
              description="本周略有下降"
              delay={0.1}
            />
            <StatCard
              variant="minimal" title="内容发布" value="128"
              change="+15" changeType="neutral" icon={Layers}
              iconColor="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              delay={0.15}
            />
            <StatCard
              variant="outline" title="AI生成次数" value="2,340"
              change="+23.1%" changeType="increase" icon={Zap}
              iconColor="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
              sparkline={{ values: [20, 35, 30, 50, 55, 65, 80, 95] }}
              delay={0.2}
            />
          </div>
        </Section>

        {/* ─── Section 10: Data Table ────────────────────────── */}
        <Section
          title="数据表格组件"
          description="支持排序、分页、空状态、行hover高亮、响应式滚动"
        >
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="outline" size="sm" onClick={() => setShowEmpty(!showEmpty)} className="text-xs"
            >
              {showEmpty ? "显示数据" : "显示空状态"}
            </Button>
            <span className="text-xs text-muted-foreground">点击表头可排序 · 支持分页切换</span>
          </div>
          <DataTable
            columns={columns}
            data={showEmpty ? [] : posts}
            pageSizeOptions={[5, 10, 20]}
            defaultPageSize={5}
            emptyMessage="暂无内容数据"
            emptyDescription="点击上方按钮切换数据展示"
            stickyHeader
          />
        </Section>

        {/* ─── Section 11: Tag Input ─────────────────────────── */}
        <Section
          title="标签输入组件"
          description="Enter/逗号添加 · Backspace删除 · 重复检测 · 最大限制"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-2">基础用法（最大5个）</p>
              <TagInput
                value={tags} onChange={setTags} maxTags={5}
                placeholder="输入标签后按 Enter 添加"
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-2">带验证（标签至少2个字符）</p>
              <TagInput
                defaultValue={["长标签示例", "内容创作"]}
                maxTags={8}
                validateTag={(tag) => tag.length >= 2 || "标签至少2个字符"}
                placeholder="输入至少2个字符的标签"
              />
            </div>
          </div>
        </Section>

        {/* ─── Section 12: Progress Indicators ───────────────── */}
        <Section
          title="进度指示器组件"
          description="CircularProgress · LinearProgress · StepProgress · ScoreGauge"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center gap-6 p-6 rounded-xl bg-card border border-border/60">
              <div className="flex items-center gap-8">
                <CircularProgress
                  value={progressValue} size={100} strokeWidth={8}
                  color="#8b5cf6" colorEnd="#ec4899"
                />
                <ScoreGauge
                  score={score} size={120}
                  description="内容质量评分"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={cycleProgress} className="text-xs">
                  切换进度 ({progressValue}%)
                </Button>
                <Button variant="outline" size="sm" onClick={cycleScore} className="text-xs">
                  切换评分 ({score})
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-6 p-6 rounded-xl bg-card border border-border/60">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">完成进度</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{progressValue}%</span>
                  </div>
                  <LinearProgress
                    value={progressValue} height={10}
                    color="#8b5cf6" colorEnd="#ec4899" showLabel={false}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">分段进度</span>
                    <span className="text-xs text-muted-foreground">任务完成度</span>
                  </div>
                  <LinearProgress
                    value={progressValue} height={12} segments={8}
                    color="#10b981" colorEnd="#14b8a6" rounded
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">细条进度</span>
                    <span className="text-xs text-muted-foreground">加载指示</span>
                  </div>
                  <LinearProgress value={progressValue} height={4} color="#f59e0b" showLabel />
                </div>
              </div>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium">发布流程</span>
                  <Button variant="ghost" size="sm" onClick={cycleStep} className="text-xs h-6">
                    下一步
                  </Button>
                </div>
                <StepProgress
                  currentStep={step} totalSteps={5}
                  labels={["选题", "撰写", "审校", "配图", "发布"]}
                  color="#8b5cf6" size="md"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Section 13: Inspiration Waterfall + Creative Assets ──────────── */}
        <Section
          title="内容灵感瀑布流 & 创意素材库"
          description="30+ 灵感卡片 · CSS Masonry 布局 · 分类筛选 · 收藏/AI改写 · 拖拽排序素材库"
        >
          <Tabs defaultValue="inspiration" className="w-full">
            <TabsList className="w-full h-9 bg-muted/50 p-0.5 mb-4">
              <TabsTrigger value="inspiration" className="flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm data-[state=active]:text-rose-600 dark:data-[state=active]:text-rose-400">
                <Lightbulb className="h-3.5 w-3.5" />
                灵感瀑布流
              </TabsTrigger>
              <TabsTrigger value="assets" className="flex-1 h-7 text-xs gap-1.5 data-[state=active]:bg-background shadow-sm data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400">
                <FolderOpen className="h-3.5 w-3.5" />
                创意素材库
              </TabsTrigger>
            </TabsList>

            <TabsContent value="inspiration" className="animate-fade-in-up">
              <div className="max-w-2xl mx-auto">
                <InspirationWaterfall />
              </div>
            </TabsContent>

            <TabsContent value="assets" className="animate-fade-in-up">
              <div className="max-w-2xl mx-auto">
                <CreativeAssetsLibrary />
              </div>
            </TabsContent>
          </Tabs>
        </Section>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground/50">
            Track A · Round 40 · 内容灵感瀑布流 + 创意素材库
          </p>
        </div>
      </div>
    </div>
  );
}
