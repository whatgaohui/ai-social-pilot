"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Users, Eye, Heart, TrendingUp, Zap, Clock,
  BarChart3, Layers, Star, DollarSign, Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  {
    key: "id",
    title: "#",
    width: "50px",
    align: "center",
    sortable: true,
  },
  {
    key: "title",
    title: "标题",
    sortable: true,
    width: "200px",
    render: (_, row) => (
      <span className="font-medium text-foreground max-w-[180px] truncate block">
        {row.title}
      </span>
    ),
  },
  {
    key: "platform",
    title: "平台",
    sortable: true,
    width: "90px",
    render: (_, row) => {
      const colors: Record<string, string> = {
        "朋友圈": "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        "小红书": "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
        "微博": "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
        "抖音": "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
      };
      return (
        <Badge variant="secondary" className={colors[row.platform] || ""}>
          {row.platform}
        </Badge>
      );
    },
  },
  {
    key: "likes",
    title: "点赞",
    sortable: true,
    width: "80px",
    align: "right",
    render: (val) => (
      <span className="tabular-nums">{Number(val).toLocaleString()}</span>
    ),
  },
  {
    key: "comments",
    title: "评论",
    sortable: true,
    width: "80px",
    align: "right",
    render: (val) => (
      <span className="tabular-nums">{Number(val).toLocaleString()}</span>
    ),
  },
  {
    key: "status",
    title: "状态",
    width: "100px",
    render: (_, row) => {
      const statusConfig: Record<string, { label: string; className: string }> = {
        "已发布": { label: "已发布", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
        "草稿": { label: "草稿", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
        "审核中": { label: "审核中", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
        "定时发布": { label: "定时", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
      };
      const config = statusConfig[row.status] || statusConfig["草稿"];
      return (
        <Badge variant="secondary" className={config.className}>
          {config.label}
        </Badge>
      );
    },
  },
  {
    key: "date",
    title: "日期",
    width: "100px",
    align: "right",
  },
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
      <div className="mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
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

  // Empty data toggle for data table
  const [showEmpty, setShowEmpty] = useState(false);

  const cycleStep = useCallback(() => {
    setStep((s) => (s >= 5 ? 1 : s + 1));
  }, []);

  const cycleProgress = useCallback(() => {
    setProgressValue((v) => (v >= 100 ? 10 : v + 15));
  }, []);

  const cycleScore = useCallback(() => {
    setScore((s) => {
      const next = s + 18;
      return next > 100 ? next - 118 : next;
    });
  }, []);

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
            Round 39 — Track D
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold">
            <span className="text-gradient-purple-pink">通用组件库</span>
            <span className="text-muted-foreground font-normal ml-2">扩展展示</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            数据表格 · 标签输入 · 统计卡片 · 进度指示器 · CSS样式打磨
          </p>
        </motion.div>

        <Separator />

        {/* ─── Section 1: Stat Cards ──────────────────────────── */}
        <Section
          title="统计卡片组件"
          description="5种变体：default / minimal / glass / gradient / outline"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              variant="default"
              title="总粉丝数"
              value="12,847"
              change="+8.2%"
              changeType="increase"
              icon={Users}
              iconColor="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
              description="较上月增长"
              sparkline={{ values: [40, 55, 48, 62, 58, 72, 68, 85] }}
              delay={0}
            />
            <StatCard
              variant="glass"
              title="今日曝光"
              value="45.2K"
              change="+12.5%"
              changeType="increase"
              icon={Eye}
              iconColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              sparkline={{ values: [30, 38, 35, 42, 50, 45, 55, 60] }}
              delay={0.05}
            />
            <StatCard
              variant="gradient"
              title="互动率"
              value="6.8%"
              change="-0.3%"
              changeType="decrease"
              icon={Heart}
              iconColor="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
              description="本周略有下降"
              delay={0.1}
            />
            <StatCard
              variant="minimal"
              title="内容发布"
              value="128"
              change="+15"
              changeType="neutral"
              icon={Layers}
              iconColor="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              delay={0.15}
            />
            <StatCard
              variant="outline"
              title="AI生成次数"
              value="2,340"
              change="+23.1%"
              changeType="increase"
              icon={Zap}
              iconColor="bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400"
              sparkline={{ values: [20, 35, 30, 50, 55, 65, 80, 95] }}
              delay={0.2}
            />
          </div>
        </Section>

        {/* ─── Section 2: Data Table ───────────────────────────── */}
        <Section
          title="数据表格组件"
          description="支持排序、分页、空状态、行hover高亮、响应式滚动"
        >
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmpty(!showEmpty)}
              className="text-xs"
            >
              {showEmpty ? "显示数据" : "显示空状态"}
            </Button>
            <span className="text-xs text-muted-foreground">
              点击表头可排序 · 支持分页切换
            </span>
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

        {/* ─── Section 3: Tag Input ────────────────────────────── */}
        <Section
          title="标签输入组件"
          description="Enter/逗号添加 · Backspace删除 · 重复检测 · 最大限制 · 动画"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-2">基础用法（最大5个）</p>
              <TagInput
                value={tags}
                onChange={setTags}
                maxTags={5}
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

        {/* ─── Section 4: Progress Indicators ──────────────────── */}
        <Section
          title="进度指示器组件"
          description="CircularProgress · LinearProgress · StepProgress · ScoreGauge"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Circular + Score */}
            <div className="flex flex-col items-center gap-6 p-6 rounded-xl bg-card border border-border/60">
              <div className="flex items-center gap-8">
                <CircularProgress
                  value={progressValue}
                  size={100}
                  strokeWidth={8}
                  color="#8b5cf6"
                  colorEnd="#ec4899"
                />
                <ScoreGauge
                  score={score}
                  size={120}
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

            {/* Linear + Step */}
            <div className="flex flex-col gap-6 p-6 rounded-xl bg-card border border-border/60">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">完成进度</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{progressValue}%</span>
                  </div>
                  <LinearProgress
                    value={progressValue}
                    height={10}
                    color="#8b5cf6"
                    colorEnd="#ec4899"
                    showLabel={false}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">分段进度</span>
                    <span className="text-xs text-muted-foreground">任务完成度</span>
                  </div>
                  <LinearProgress
                    value={progressValue}
                    height={12}
                    segments={8}
                    color="#10b981"
                    colorEnd="#14b8a6"
                    rounded
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">细条进度</span>
                    <span className="text-xs text-muted-foreground">加载指示</span>
                  </div>
                  <LinearProgress
                    value={progressValue}
                    height={4}
                    color="#f59e0b"
                    showLabel
                  />
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
                  currentStep={step}
                  totalSteps={5}
                  labels={["选题", "撰写", "审校", "配图", "发布"]}
                  color="#8b5cf6"
                  size="md"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* ─── Section 5: CSS Polish Showcase ──────────────────── */}
        <Section
          title="CSS样式打磨"
          description="新增 tooltip-enhanced · badge-glow · text-gradient · btn-morph · 3D卡片 等工具类"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 3D Card */}
            <div className="card-3d">
              <div className="card-3d-inner p-5 rounded-xl bg-card border border-border/60">
                <p className="text-sm font-semibold mb-1">3D 倾斜卡片</p>
                <p className="text-xs text-muted-foreground">悬停查看 perspective 3D 效果</p>
              </div>
            </div>

            {/* Badge Glow */}
            <div className="p-5 rounded-xl bg-card border border-border/60 space-y-3">
              <p className="text-sm font-semibold">徽章发光效果</p>
              <div className="flex flex-wrap gap-2">
                <Badge className="badge-glow badge-glow-violet">Violet</Badge>
                <Badge className="badge-glow badge-glow-emerald">Emerald</Badge>
                <Badge className="badge-glow badge-glow-amber">Amber</Badge>
                <Badge className="badge-glow badge-glow-rose">Rose</Badge>
              </div>
            </div>

            {/* Text Gradient */}
            <div className="p-5 rounded-xl bg-card border border-border/60 space-y-2">
              <p className="text-sm font-semibold">文字渐变预设</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold">
                <span className="text-gradient-purple-pink">紫粉</span>
                <span className="text-gradient-green-teal">绿青</span>
                <span className="text-gradient-amber-orange">琥珀橙</span>
                <span className="text-gradient-rose-red">玫红</span>
                <span className="text-gradient-sky-cyan">天青</span>
              </div>
            </div>

            {/* Tooltip Enhanced */}
            <div className="p-5 rounded-xl bg-card border border-border/60 space-y-3">
              <p className="text-sm font-semibold">增强 Tooltip</p>
              <div className="flex gap-3">
                <span className="tooltip-enhanced text-xs px-2 py-1 bg-muted rounded" data-tip="悬停查看提示">
                  悬停我
                </span>
                <span className="tooltip-enhanced text-xs px-2 py-1 bg-muted rounded" data-tip="带箭头动画">
                  也是我
                </span>
              </div>
            </div>

            {/* Button Morph */}
            <div className="p-5 rounded-xl bg-card border border-border/60 space-y-3">
              <p className="text-sm font-semibold">按钮变形动画</p>
              <div className="flex gap-3">
                <Button size="sm" className="btn-morph text-xs">
                  悬停变圆
                </Button>
                <Button size="sm" variant="outline" className="btn-morph-square text-xs">
                  悬停变方
                </Button>
              </div>
            </div>

            {/* Skeleton Shimmer */}
            <div className="p-5 rounded-xl bg-card border border-border/60 space-y-3">
              <p className="text-sm font-semibold">增强骨架屏</p>
              <div className="space-y-2">
                <div className="skeleton-shimmer-enhanced h-4 w-full" />
                <div className="skeleton-shimmer-enhanced h-4 w-3/4" />
                <div className="skeleton-shimmer-enhanced h-4 w-1/2" />
              </div>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground/50">
            Track D · Round 39 · 4 新组件 + CSS 样式打磨
          </p>
        </div>
      </div>
    </div>
  );
}
