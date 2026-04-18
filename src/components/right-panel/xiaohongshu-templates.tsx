"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Star,
  BookOpen,
  Lightbulb,
  Camera,
  Sun,
  Gift,
  ListChecks,
  Loader2,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: typeof Sparkles;
  gradient: string;
  prompt: string;
  contentExample: string;
}

const TEMPLATES: Template[] = [
  {
    id: "seeding",
    title: "种草安利",
    description: "推荐好物，种草必备",
    category: "种草",
    icon: Sparkles,
    gradient: "from-pink-500 to-rose-500",
    prompt: "seeding",
    contentExample:
      "姐妹们！！这个东西我真的会反复回购100次😭💕\n\n最近挖到的宝藏好物，用了一次就彻底爱上！\n\n✨ 质感绝了，拿在手里就有高级感\n✨ 效果肉眼可见，不是智商税\n✨ 性价比超高，学生党也能冲\n\n真心建议大家试试，不好用你来找我！\n\n#好物推荐 #种草安利 #回购100次 #宝藏好物 #小红书爆款",
  },
  {
    id: "review",
    title: "好物测评",
    description: "真实体验，深度测评",
    category: "测评",
    icon: Star,
    gradient: "from-amber-500 to-orange-500",
    prompt: "review",
    contentExample:
      "用了30天，说说真实感受📝\n\n🔥 测评产品：XXX\n💰 价格：XX元\n⏰ 使用周期：30天\n\n✅ 优点：\n1. 设计简洁好看，颜值在线\n2. 使用体验流畅，没有卡顿\n3. 续航持久，一天一充没问题\n\n❌ 缺点：\n1. 散热一般，重度使用会发热\n2. 适配性还需优化\n\n⭐ 综合评分：4.2/5\n适合人群：追求性价比的用户\n\n#真实测评 #好物测评 #深度测评 #使用心得 #避坑指南",
  },
  {
    id: "tutorial",
    title: "教程攻略",
    description: "手把手教你，保姆级教程",
    category: "教程",
    icon: BookOpen,
    gradient: "from-sky-500 to-blue-500",
    prompt: "tutorial",
    contentExample:
      "保姆级教程来啦！小白也能轻松上手👩‍💻\n\nStep 1️⃣ 准备工作\n先下载好需要的工具，注册账号（都是免费的）\n\nStep 2️⃣ 基础设置\n跟着图片一步步来，不用着急\n⚠️ 注意：这一步很容易忽略，一定要看仔细\n\nStep 3️⃣ 进阶技巧\n掌握这3个小技巧，效率直接翻倍：\n· 快捷键组合\n· 批量处理方法\n· 自动化流程\n\nStep 4️⃣ 常见问题\nQ: 遇到报错怎么办？\nA: 检查XX设置是否开启...\n\n建议收藏！随时翻出来看📖\n\n#保姆级教程 #手把手教 #新手教程 #学习攻略 #干货分享",
  },
  {
    id: "knowledge",
    title: "干货知识",
    description: "价值输出，收藏向内容",
    category: "干货",
    icon: Lightbulb,
    gradient: "from-violet-500 to-purple-500",
    prompt: "knowledge",
    contentExample:
      "建议收藏！这些道理越早知道越好💡\n\n今天整理了5个改变我思维方式的认知：\n\n1️⃣ 复利效应\n每天进步1%，一年后你将强大37倍\n关键：找到可以持续积累的方向\n\n2️⃣ 二八法则\n80%的成果来自20%的努力\n关键：识别并聚焦高价值的事\n\n3️⃣ 沉没成本\n已经付出的不要影响未来的决策\n关键：学会及时止损\n\n4️⃣ 费曼学习法\n能简单讲清楚才是真正理解\n关键：用输出倒逼输入\n\n5️⃣ 延迟满足\n短期痛苦换来长期回报\n关键：建立正向反馈机制\n\n觉得有用记得⭐收藏，慢慢消化～\n\n#干货分享 #认知提升 #个人成长 #自我提升 #思维模型",
  },
  {
    id: "vlog",
    title: "生活Vlog",
    description: "记录生活，分享美好",
    category: "生活",
    icon: Camera,
    gradient: "from-teal-500 to-emerald-500",
    prompt: "vlog",
    contentExample:
      "周末的一天·治愈系vlog🎬\n\n🌸 9:00 自然醒\n拉开窗帘，阳光洒进房间，美好的一天开始啦\n\n☕ 10:00 手冲咖啡时间\n今天选了耶加雪菲，果香浓郁，配上刚烤的可颂，幸福感拉满\n\n📚 14:00 书店打卡\n发现了好几本想看的书，在这个角落待了一整个下午\n\n🥘 18:00 自己做晚饭\n试了新菜谱：番茄牛腩，居然一次就成功了！开心～\n\n🌙 21:00 睡前护肤+日记\n记录今天的三个小确幸，然后和世界说晚安💤\n\n平凡的日子里，藏着最真实的快乐💛\n\n#生活vlog #治愈日常 #周末日常 #独居生活 #慢生活",
  },
  {
    id: "daily",
    title: "日常分享",
    description: "日常碎片，真实记录",
    category: "生活",
    icon: Sun,
    gradient: "from-orange-500 to-amber-500",
    prompt: "daily",
    contentExample:
      "今日碎片🎞 记录一些小美好\n\n早安咖啡☕\n今天的拿铁拉花居然成功了！虽然不太完美，但已经很满足了～\n\n下班后的散步🚶‍♀️\n路过一家花店，买了一束向日葵🌻 放在桌上整个房间都亮了\n\n晚餐尝试🍱\n第一次做日式便当，虽然摆盘还需练习，但味道真的不错！\n\n睡前感悟💭\n越来越觉得，生活的美好不在远方，就在这些细碎的日常里。\n认真过好每一天，就是对生活最好的回应。\n\n#日常碎片 #真实记录 #生活日常 #小确幸 #记录生活",
  },
  {
    id: "recommend",
    title: "好物推荐",
    description: "精选好物，省钱必备",
    category: "推荐",
    icon: Gift,
    gradient: "from-rose-500 to-red-500",
    prompt: "recommend",
    contentExample:
      "月薪3K也能拥有的快乐！省钱好物合集💰\n\n整理了最近买到的超值好物，件件都在百元内！\n\n🎁 No.1 | XX收纳盒 — ¥29.9\n拯救桌面混乱，使用后效率直线上升\n\n🎁 No.2 | XX水杯 — ¥49.9\n颜值超高，每天喝水都有动力了\n\n🎁 No.3 | XX台灯 — ¥79\n护眼+氛围感，夜晚办公的完美搭档\n\n🎁 No.4 | XX香薰 — ¥35\n点燃后整个房间都是淡淡清香，太治愈了\n\n🎁 No.5 | XX笔记本 — ¥19.9\n纸质超棒，写字手感一流\n\n全部自用推荐，不踩雷！快冲🏃‍♀️\n\n#好物推荐 #平价好物 #省钱攻略 #百元好物 #必买清单",
  },
  {
    id: "collection",
    title: "合集清单",
    description: "精选合集，一键收藏",
    category: "合集",
    icon: ListChecks,
    gradient: "from-indigo-500 to-violet-500",
    prompt: "collection",
    contentExample:
      "熬夜整理！XX精选合集（建议收藏）📋\n\n花了一周时间整理，都是亲测好用的！\n\n📱 实用APP篇\n· XX — 效率神器，日程管理超方便\n· XX — 学英语必备，碎片时间利用起来\n· XX — 记账小帮手，消费一目了然\n\n📖 书单推荐篇\n· 《XXX》— 改变思维方式的一本书\n· 《XXX》— 职场新人必读\n· 《XXX》— 了解人性的经典之作\n\n🎬 影视推荐篇\n· 《XXX》— 看完久久不能平静\n· 《XXX》— 治愈系天花板\n· 《XXX》— 笑到停不下来\n\n先码住！后续会持续更新～\n\n#合集推荐 #精选合集 #收藏夹 #实用清单 #推荐合集",
  },
];

const CATEGORIES = [
  "全部",
  "种草",
  "测评",
  "教程",
  "干货",
  "生活",
  "推荐",
  "合集",
];

export function XiaohongshuTemplates() {
  const { persona, knowledgeItems } = useAppStore();
  const [generating, setGenerating] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>("全部");

  const filtered =
    activeCategory === "全部"
      ? TEMPLATES
      : TEMPLATES.filter((t) => t.category === activeCategory);

  const handleGenerate = async (template: Template) => {
    setGenerating(template.id);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "auto",
          persona,
          knowledgeItems,
          topic: `按照小红书「${template.title}」风格创作`,
          platform: "xiaohongshu",
          tone: persona?.tone || "professional",
          style: persona?.style || "balanced",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults((prev) => ({ ...prev, [template.id]: data.content }));
        toast.success("小红书文案已生成");
      }
    } catch {
      toast.error("生成失败");
    } finally {
      setGenerating(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("已复制到剪贴板");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Usage Guide */}
      <div className="rounded-lg bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800 p-3">
        <p className="text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1 mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          小红书模板使用指南
        </p>
        <ul className="text-[11px] text-rose-600 dark:text-rose-400 space-y-0.5 ml-4 list-disc">
          <li>选择模板 → 点击「AI生成」→ 基于人设和知识库自动生成内容</li>
          <li>生成的内容可直接复制，或用于日历发布计划</li>
          <li>AI 会根据您的人设风格自动匹配小红书文案格式（标题+正文+话题标签）</li>
        </ul>
      </div>

      {/* Category filter */}
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Templates */}
      <ScrollArea className="h-[420px]">
        <div className="space-y-2 pr-3">
          {filtered.map((template) => {
            const Icon = template.icon;
            const result = results[template.id];
            const isGenerating = generating === template.id;

            return (
              <Card
                key={template.id}
                className="border-0 shadow-sm hover:shadow-md transition-all duration-200 group"
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl bg-gradient-to-br ${template.gradient} flex items-center justify-center shrink-0 shadow-sm`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="text-sm font-medium">{template.title}</h4>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {template.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {template.description}
                      </p>

                      {!result && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs mt-2 text-pink-600 dark:text-pink-400 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-pink-950/30"
                          onClick={() => handleGenerate(template)}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              生成中...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI生成
                            </>
                          )}
                        </Button>
                      )}

                      {result && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2"
                        >
                          <div className="rounded-lg bg-muted/50 p-2.5 relative group/result">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover/result:opacity-100 transition-opacity"
                              onClick={() => handleCopy(result)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <p className="text-xs leading-relaxed whitespace-pre-wrap pr-6">
                              {result}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] mt-1 text-muted-foreground"
                            onClick={() => handleGenerate(template)}
                            disabled={isGenerating}
                          >
                            {isGenerating ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3 mr-1" />
                            )}
                            重新生成
                          </Button>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
