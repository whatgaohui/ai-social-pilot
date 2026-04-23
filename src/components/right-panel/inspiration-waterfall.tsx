"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Lightbulb,
  Copy,
  Heart,
  Sparkles,
  Loader2,
  Check,
  ChevronDown,
  TrendingUp,
  GraduationCap,
  Coffee,
  Briefcase,
  HeartHandshake,
  ShoppingBag,
  Search,
  X,
  MessageCirclePlus,
  Eye,
  Star,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type InspirationCategory =
  | "all"
  | "viral"
  | "tutorial"
  | "life"
  | "career"
  | "emotion"
  | "product";

interface InspirationItem {
  id: string;
  title: string;
  content: string;
  category: Exclude<InspirationCategory, "all">;
  categoryLabel: string;
  gradient: string;
  icon: typeof Lightbulb;
  tags: string[];
  likes: number;
  author: string;
}

// ─── Category Config ─────────────────────────────────────────────────────────

const CATEGORY_TABS: {
  value: InspirationCategory;
  label: string;
  icon: typeof Lightbulb;
}[] = [
  { value: "all", label: "全部", icon: Lightbulb },
  { value: "viral", label: "爆款", icon: TrendingUp },
  { value: "tutorial", label: "教程", icon: GraduationCap },
  { value: "life", label: "生活", icon: Coffee },
  { value: "career", label: "职场", icon: Briefcase },
  { value: "emotion", label: "情感", icon: HeartHandshake },
  { value: "product", label: "好物", icon: ShoppingBag },
];

const CATEGORY_BADGE_COLORS: Record<string, string> = {
  viral: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
  tutorial: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  life: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  career: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
  emotion: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  product: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
};

// ─── Inspiration Data (30+ items) ───────────────────────────────────────────

const INSPIRATION_DATA: InspirationItem[] = [
  // ── 爆款类 (5) ──
  {
    id: "v1",
    title: "3步搞定朋友圈文案",
    content:
      "第1步：找到一个引发共鸣的痛点\n第2步：给出一个让人意想不到的解决方案\n第3步：用一个简短有力的金句收尾\n\n示例：今天终于弄明白了，原来发朋友圈也是有公式的。先说问题，再说方法，最后来一句金句。按这个思路发的第3条，点赞直接破百！",
    category: "viral",
    categoryLabel: "爆款",
    gradient: "from-rose-500 to-pink-600",
    icon: TrendingUp,
    tags: ["文案技巧", "朋友圈运营", "涨粉"],
    likes: 2847,
    author: "运营老司机",
  },
  {
    id: "v2",
    title: "反转式开头：越反常越吸睛",
    content:
      "「我删掉了3000个好友，结果粉丝涨了10倍」\n\n核心技巧：用违背常识的表述制造悬念。读者看到标题的一瞬间就会产生「为什么？」的好奇心，从而点进来看完整内容。\n\n公式：反常识行为 + 意外结果 → 读者好奇 → 引导互动",
    category: "viral",
    categoryLabel: "爆款",
    gradient: "from-rose-400 to-orange-500",
    icon: TrendingUp,
    tags: ["标题技巧", "反转", "吸睛"],
    likes: 3651,
    author: "爆款制造机",
  },
  {
    id: "v3",
    title: "数字清单：清单体天然高打开率",
    content:
      "「做了3年自媒体，总结出这5个铁律」\n\n数字清单体为什么有效？\n1. 降低了读者的预期认知负担\n2. 给出了一种「干货满满」的暗示\n3. 容易拆分成多个小段，适合碎片化阅读\n\n实操建议：3个太少显得单薄，10个太多容易疲劳，5-7个最佳。",
    category: "viral",
    categoryLabel: "爆款",
    gradient: "from-orange-500 to-red-500",
    icon: TrendingUp,
    tags: ["清单体", "内容策略", "写作技巧"],
    likes: 4102,
    author: "内容策略师",
  },
  {
    id: "v4",
    title: "情感共鸣型标题公式",
    content:
      "「终于有人说出来了……」\n\n当你的标题替读者说出了他们心里想说但没说出来的话，他们一定会点进来。\n\n常用的情感触发词：\n· 终于有人……了\n· 每个XX都应该知道\n· 做了XX年之后才明白\n· 如果早知道……就好了\n\n关键：真正理解你的目标用户在焦虑什么、渴望什么。",
    category: "viral",
    categoryLabel: "爆款",
    gradient: "from-pink-500 to-rose-600",
    icon: TrendingUp,
    tags: ["情感共鸣", "标题公式", "用户心理"],
    likes: 3215,
    author: "心理学文案师",
  },
  {
    id: "v5",
    title: "对比冲击：从XX到XX的蜕变故事",
    content:
      "「从月薪3千到月入5万，我只做对了3件事」\n\n对比类内容的天然优势：\n- 截然不同的两种状态形成强烈视觉冲击\n- 读者会产生「我也可以」的代入感\n- 天然具备叙事张力\n\n写法建议：先展示「之前」的困境（让读者共情），再逐步揭示「之后」的方法（让读者想要收藏）。",
    category: "viral",
    categoryLabel: "爆款",
    gradient: "from-red-500 to-pink-500",
    icon: TrendingUp,
    tags: ["对比", "蜕变故事", "内容框架"],
    likes: 2967,
    author: "故事营销专家",
  },

  // ── 教程类 (5) ──
  {
    id: "t1",
    title: "零基础学会朋友圈排版",
    content:
      "朋友圈排版4大原则：\n\n1️⃣ 每段不超过3行\n太长的段落会在折叠后只显示前6行，影响完整阅读\n\n2️⃣ 合理使用Emoji作为段落分隔\n每个小点前加一个对应的Emoji，视觉层次分明\n\n3️⃣ 重要信息用【】或「」标注\n让核心内容一眼就能被看到\n\n4️⃣ 结尾留一个互动钩子\n如「你怎么看？评论区见~」",
    category: "tutorial",
    categoryLabel: "教程",
    gradient: "from-amber-500 to-yellow-600",
    icon: GraduationCap,
    tags: ["排版技巧", "朋友圈", "教程"],
    likes: 1890,
    author: "排版达人",
  },
  {
    id: "t2",
    title: "手把手教你做选题策划",
    content:
      "选题策划3步法：\n\nStep 1: 建立选题库\n- 每天收集5个灵感（关注热搜、同行动态、用户评论）\n- 按主题分类存储\n\nStep 2: 评估选题潜力\n- 目标用户关心吗？\n- 有足够的新鲜角度吗？\n- 适合我的账号定位吗？\n\nStep 3: 排期执行\n- 每周固定3-5个选题\n- 热点话题24小时内跟进\n- 常青内容提前储备",
    category: "tutorial",
    categoryLabel: "教程",
    gradient: "from-yellow-500 to-amber-600",
    icon: GraduationCap,
    tags: ["选题策划", "内容运营", "方法论"],
    likes: 2534,
    author: "内容运营官",
  },
  {
    id: "t3",
    title: "AI写作工具高效使用指南",
    content:
      "用好AI写作工具的5个技巧：\n\n1. 给AI一个「人设」：比如「你是一个在互联网公司工作了5年的产品经理」\n2. 明确指定「输出格式」：如「用3段话、每段不超过50字」\n3. 提供「参考示例」：把你觉得写得好的一段话喂给AI模仿\n4. 分步生成：先大纲→再扩写→最后精修\n5. 加上平台特征：如「这是发在小红书的笔记，标题要吸引眼球」",
    category: "tutorial",
    categoryLabel: "教程",
    gradient: "from-amber-400 to-orange-500",
    icon: GraduationCap,
    tags: ["AI写作", "工具使用", "效率提升"],
    likes: 3890,
    author: "AI效率专家",
  },
  {
    id: "t4",
    title: "如何拍出有质感的九宫格照片",
    content:
      "九宫格照片拍摄心法：\n\n📷 统一色调：选一个主色调贯穿9张图\n📷 讲一个故事：按时间线或情绪线排列\n📷 大小图混搭：中间放大图、四周放小图\n📷 留白艺术：不要每张图都塞满\n📷 文字点缀：1-2张图上加点手写文字\n\n推荐配色方案：\n· 日系：低饱和 + 留白\n· 复古：暖色调 + 胶片感\n· 极简：黑白 + 大面积留白",
    category: "tutorial",
    categoryLabel: "教程",
    gradient: "from-orange-400 to-amber-500",
    icon: GraduationCap,
    tags: ["摄影技巧", "九宫格", "视觉设计"],
    likes: 1542,
    author: "视觉设计师",
  },
  {
    id: "t5",
    title: "数据分析入门：看懂你的粉丝画像",
    content:
      "粉丝画像分析3个核心维度：\n\n1️⃣ 人口特征：年龄、性别、地域\n→ 决定你用什么语言风格、什么话题\n\n2️⃣ 行为特征：活跃时间、互动偏好、内容偏好\n→ 决定你的发布时间和内容类型\n\n3️⃣ 兴趣标签：他们还关注了什么？\n→ 决定你可以切入哪些跨界话题\n\n实操工具：微信自带的数据统计、第三方分析工具\n每周花30分钟看数据，调整下周内容策略。",
    category: "tutorial",
    categoryLabel: "教程",
    gradient: "from-yellow-400 to-amber-500",
    icon: GraduationCap,
    tags: ["数据分析", "粉丝运营", "方法论"],
    likes: 2103,
    author: "数据运营师",
  },

  // ── 生活类 (5) ──
  {
    id: "l1",
    title: "一个人的周末怎么过才有仪式感",
    content:
      "我的周末仪式感清单：\n\n☕ 9:00 自然醒，手冲一杯咖啡\n📖 10:00 翻开一本一直想读的书\n🧘 11:00 15分钟冥想/拉伸\n🍳 12:00 给自己做一顿精致的午餐\n🎨 14:00 学一个新技能（画画/烘焙/插花）\n🏃 16:00 出门散步或慢跑\n🌙 20:00 看一部好电影\n📝 22:00 写5分钟日记\n\n仪式感不在于花钱多少，在于给每一刻赋予意义。",
    category: "life",
    categoryLabel: "生活",
    gradient: "from-emerald-500 to-teal-600",
    icon: Coffee,
    tags: ["周末", "仪式感", "生活方式"],
    likes: 4230,
    author: "生活美学家",
  },
  {
    id: "l2",
    title: "断舍离后，我的生活变轻松了",
    content:
      "用3个月完成了家里80%的断舍离，分享几个感受：\n\n✅ 只留下真正让自己心动的东西\n✅ 每件物品都有固定位置\n✅ 衣服只保留「穿了会开心的」\n✅ 书只保留「想再读一遍的」\n✅ 手机App精简到2屏以内\n\n最大的变化不是空间的增大，而是内心的松弛感。\n\n推荐顺序：先断衣物→再断书籍→最后断数码。",
    category: "life",
    categoryLabel: "生活",
    gradient: "from-teal-500 to-emerald-600",
    icon: Coffee,
    tags: ["断舍离", "极简生活", "整理收纳"],
    likes: 5678,
    author: "极简生活家",
  },
  {
    id: "l3",
    title: "坚持早起100天的意外收获",
    content:
      "从冬天开始挑战早起，到现在刚好100天：\n\n🌅 最惊喜的变化：\n- 皮肤变好了（多睡的深度睡眠是真的有效）\n- 专注力提升（早上没人打扰的2小时效率最高）\n- 情绪更稳定（不再因为赶时间而焦虑）\n- 多了1.5小时属于自己的时间\n\n我的早起策略：\n1. 晚上11点前放下手机\n2. 闹钟放远一点，必须起身关\n3. 起床第一件事喝一杯温水",
    category: "life",
    categoryLabel: "生活",
    gradient: "from-emerald-400 to-green-500",
    icon: Coffee,
    tags: ["早起", "自律", "习惯养成"],
    likes: 3456,
    author: "自律达人",
  },
  {
    id: "l4",
    title: "城市漫步指南：发现身边的隐藏风景",
    content:
      "周末City Walk路线推荐：\n\n📍 路线1：老城区散步\n从老街出发，穿过菜市场，经过古树老院\n\n📍 路线2：河边骑行\n沿河绿道一路骑行，找个咖啡馆停下来\n\n📍 路线3：书店巡礼\n逛3家不同风格的书店，感受不同的阅读氛围\n\nCity Walk的心得：\n不用太远，不用太贵，用脚步丈量一座城市，你会发现很多开车时忽略的美好。",
    category: "life",
    categoryLabel: "生活",
    gradient: "from-green-500 to-emerald-500",
    icon: Coffee,
    tags: ["CityWalk", "周末出行", "探索发现"],
    likes: 2789,
    author: "城市探索者",
  },
  {
    id: "l5",
    title: "一人食也要好好吃饭",
    content:
      "一个人也要好好吃饭的理由：\n\n🍜 不是因为没有陪伴，而是因为值得\n\n分享我的独居食谱（快手版）：\n\n周一：番茄鸡蛋面（15分钟）\n周二：酱油炒饭配煎蛋（10分钟）\n周三：牛奶燕麦粥+水果（8分钟）\n周四：蔬菜沙拉+三明治（12分钟）\n周五：给自己点一份好的外卖犒劳一下\n\n记住：好好吃饭是对自己最基本的尊重。",
    category: "life",
    categoryLabel: "生活",
    gradient: "from-teal-400 to-cyan-500",
    icon: Coffee,
    tags: ["一人食", "独居生活", "料理"],
    likes: 4512,
    author: "美食博主",
  },

  // ── 职场类 (5) ──
  {
    id: "c1",
    title: "工作3年悟出的5个职场真相",
    content:
      "职场3年，跌跌撞撞后终于明白的5件事：\n\n1️⃣ 能力决定你能走多快，人品决定你能走多远\n\n2️⃣ 汇报不是邀功，是让领导知道你在做什么\n\n3️⃣ 学会说不，比学会说是更重要\n\n4️⃣ 别把同事当朋友，也别把职场当家\n\n5️⃣ 最快的晋升路径不是加班，是解决没人能解决的问题\n\n最后一条建议：永远保持学习的状态，你的不可替代性就是最大的安全感。",
    category: "career",
    categoryLabel: "职场",
    gradient: "from-sky-500 to-blue-600",
    icon: Briefcase,
    tags: ["职场经验", "工作感悟", "成长"],
    likes: 6234,
    author: "职场老鸟",
  },
  {
    id: "c2",
    title: "远程办公一年后的真实感受",
    content:
      "远程办公365天，说说心里话：\n\n✅ 优点：\n- 省下每天2小时通勤\n- 穿什么随意（但建议还是要换衣服）\n- 可以灵活安排时间\n\n❌ 挑战：\n- 工作和生活边界模糊\n- 缺少面对面交流\n- 自律要求极高\n\n我的应对策略：\n1. 固定工作时间（9:00-18:00）\n2. 设一个独立的工作区域\n3. 每天至少出门散步一次\n4. 定期和同事约线下见面",
    category: "career",
    categoryLabel: "职场",
    gradient: "from-blue-500 to-sky-600",
    icon: Briefcase,
    tags: ["远程办公", "工作效率", "自律"],
    likes: 3210,
    author: "自由职业者",
  },
  {
    id: "c3",
    title: "向上管理的艺术：如何和领导相处",
    content:
      "向上管理不是拍马屁，是高效协作：\n\n📌 了解领导的工作风格\n- 结果导向型？先给结论再给过程\n- 细节控型？数据和案例准备充分\n- 放权型？定期汇报进度即可\n\n📌 沟通三原则\n1. 带方案去，不带问题去\n2. 预判领导的3个追问\n3. 重要事项书面确认\n\n📌 向上管理的关键\n让领导放心 → 获得更多信任 → 获得更多资源和机会",
    category: "career",
    categoryLabel: "职场",
    gradient: "from-sky-400 to-cyan-600",
    icon: Briefcase,
    tags: ["向上管理", "领导相处", "职场技巧"],
    likes: 2876,
    author: "管理顾问",
  },
  {
    id: "c4",
    title: "从执行层到管理层，我经历了什么",
    content:
      "升职后的第一个月，我差点辞职：\n\n最大的转变：从「自己做」到「让别人做」\n\n曾经以为管理就是分配任务，后来才发现：\n- 要学会忍受「别人做得不如你好」\n- 要学会在「进度」和「质量」间平衡\n- 要学会处理团队冲突而不是逃避\n- 要学会培养人而不是替代人\n\n给新管理者的建议：\n第一个月：多听少说，了解团队每个人的特点\n第二个月：建立规则和流程\n第三个月：开始做有挑战的项目",
    category: "career",
    categoryLabel: "职场",
    gradient: "from-cyan-500 to-sky-600",
    icon: Briefcase,
    tags: ["管理", "职业发展", "团队管理"],
    likes: 1987,
    author: "新晋管理者",
  },
  {
    id: "c5",
    title: "面试官不会告诉你的事",
    content:
      "作为前面试官，分享几个真相：\n\n🎯 简历筛选阶段\n- 看一份简历只有10秒\n- 关键词比排版更重要\n- 数字化的成果描述最吸引眼球\n\n🎯 面试阶段\n- 「你有什么问题吗」是加分题不是送分题\n- 行为面试的本质是预测未来表现\n- 气场匹配有时比能力更重要\n\n🎯 谈薪阶段\n- 先了解市场行情，再谈期望薪资\n- 不要先亮底牌\n- 总包比基本工资更重要",
    category: "career",
    categoryLabel: "职场",
    gradient: "from-blue-400 to-indigo-500",
    icon: Briefcase,
    tags: ["面试技巧", "求职", "简历"],
    likes: 4567,
    author: "前HR面试官",
  },

  // ── 情感类 (5) ──
  {
    id: "e1",
    title: "成年人的崩溃，往往就在一瞬间",
    content:
      "今天的崩溃点：\n\n加班到10点回家\n发现快递柜满了\n按了半天密码门打不开\n一个人蹲在楼道里哭了5分钟\n\n然后擦干眼泪，开门，做饭，洗澡，睡觉\n\n第二天闹钟响了\n又是一条好汉\n\n不是因为坚强\n是因为知道，没有人替你崩溃\n\n成年人的世界，允许自己脆弱5分钟，然后继续前行。",
    category: "emotion",
    categoryLabel: "情感",
    gradient: "from-pink-500 to-rose-600",
    icon: HeartHandshake,
    tags: ["情感共鸣", "成年人心声", "治愈"],
    likes: 8923,
    author: "深夜博主",
  },
  {
    id: "e2",
    title: "慢慢来，比较快",
    content:
      "28岁才明白的道理：\n\n不要和别人比进度条\n\n有人22岁结婚，30岁离婚\n有人25岁毕业，但等了5年才找到好工作\n有人30岁才遇到真爱\n有人35岁才开始创业\n\n每个人都有自己的时区\n纽约比加州早3个小时\n但加州并没有变慢\n\n你不需要在什么年纪做什么事\n你需要的是，在做的事情里找到自己的节奏\n\n「慢慢来，比较快」——这6个字治愈了我所有的焦虑。",
    category: "emotion",
    categoryLabel: "情感",
    gradient: "from-rose-500 to-pink-600",
    icon: HeartHandshake,
    tags: ["人生感悟", "焦虑治愈", "成长"],
    likes: 12456,
    author: "慢生活倡导者",
  },
  {
    id: "e3",
    title: "给25岁的自己写一封信",
    content:
      "25岁的你，可能正在经历：\n\nDear 25岁的我：\n\n你现在一定很焦虑吧？\n工作不够好、工资不够高、未来不够清晰\n\n但是我想告诉你：\n\n别怕，25岁本来就是迷茫的季节\n你现在走的每一步弯路，都不会白费\n你现在吃的每一次亏，都是未来最好的教材\n\n请记得：\n· 多陪陪爸妈\n· 多读几本好书\n· 多爱自己一点\n· 不要为了合群而委屈自己\n\n30岁的我会让你骄傲的。",
    category: "emotion",
    categoryLabel: "情感",
    gradient: "from-pink-400 to-fuchsia-500",
    icon: HeartHandshake,
    tags: ["25岁", "成长感悟", "青春"],
    likes: 7890,
    author: "时光旅人",
  },
  {
    id: "e4",
    title: "那些被忽视的日常，才是真正的幸福",
    content:
      "幸福不是：\n❌ 买了新手机\n❌ 去了远方旅行\n❌ 吃了昂贵的餐厅\n\n幸福是：\n✅ 下班路上刚好赶上末班车\n✅ 打开冰箱发现有想吃的食材\n✅ 洗完澡后躺在床上的一刻\n✅ 下雨天窝在家里看电影\n✅ 和老朋友聊了一个下午\n\n幸福不是一个终点\n幸福藏在每一个被你忽略的日常里\n\n「你今天有没有什么开心的小事？」\n——这是我每天问自己的问题。",
    category: "emotion",
    categoryLabel: "情感",
    gradient: "from-fuchsia-500 to-pink-600",
    icon: HeartHandshake,
    tags: ["幸福感", "日常记录", "心态"],
    likes: 9876,
    author: "生活记录者",
  },
  {
    id: "e5",
    title: "成年人友谊的3个真相",
    content:
      "越长大越明白的3个友谊真相：\n\n1️⃣ 不联系不等于不关心\n成年人的友谊不需要每天说早安\n可能在对方生日那天一条消息\n就抵过365天的沉默\n\n2️⃣ 能说「不」的朋友才是真朋友\n真朋友不会因为你拒绝了就翻脸\n真朋友理解你的边界\n\n3️⃣ 有些朋友只能陪你走一段路\n人来人往，聚散离合\n感谢曾经一起走过的路\n不强求，不抱怨\n\n最好的友谊是：即使很久不联系\n再见面的那一刻，仿佛昨天才分开。",
    category: "emotion",
    categoryLabel: "情感",
    gradient: "from-rose-400 to-pink-500",
    icon: HeartHandshake,
    tags: ["友情", "成长感悟", "人际关系"],
    likes: 6543,
    author: "情感博主",
  },

  // ── 好物类 (5) ──
  {
    id: "p1",
    title: "提高幸福感的小物件合集",
    content:
      "用了半年真心推荐的10个小物件：\n\n1️⃣ 加湿器 —— 冬天不再干燥起皮\n2️⃣ 桌面收纳盒 —— 告别凌乱桌面\n3️⃣ 真丝枕套 —— 头发不再炸毛\n4️⃣ 按摩腰靠 —— 久坐族的救星\n5️⃣ 香薰蜡烛 —— 睡前仪式感拉满\n6️⃣ 降噪耳机 —— 专注力提升100%\n7️⃣ 便携水杯 —— 养成喝水好习惯\n8️⃣ 电子书阅读器 —— 随时随地看书\n9️⃣ 桌面小植物 —— 工作心情变好\n🔟 记事本 —— 好记性不如烂笔头\n\n每一件都不贵，但幸福感满满。",
    category: "product",
    categoryLabel: "好物",
    gradient: "from-violet-500 to-purple-600",
    icon: ShoppingBag,
    tags: ["好物推荐", "生活好物", "幸福感"],
    likes: 5432,
    author: "好物达人",
  },
  {
    id: "p2",
    title: "百元内提升品质感的护肤好物",
    content:
      "预算有限也能有好皮肤，百元内真心推荐：\n\n💧 氨基酸洗面奶（¥30-50）\n温和不刺激，敏感肌也适用\n\n💧 烟酰胺精华液（¥40-80）\n美白提亮，坚持使用有效\n\n💧 保湿面霜（¥50-90）\n锁水保湿，换季必备\n\n💡 护肤最大的误区：\n不是越贵越好，而是适合自己\n先了解自己的肤质，再针对性选择\n\n成分党的建议：看成分表前5位\n有功效成分的才是真有效。",
    category: "product",
    categoryLabel: "好物",
    gradient: "from-purple-500 to-violet-600",
    icon: ShoppingBag,
    tags: ["护肤", "平价好物", "成分分析"],
    likes: 3456,
    author: "成分党博主",
  },
  {
    id: "p3",
    title: "租房党必备的5个神器",
    content:
      "租房也要过精致生活：\n\n🏠 智能插座（¥30）\n手机远程控制，出门不怕忘关电器\n\n🏠 免打孔置物架（¥15-40）\n不伤墙面的收纳神器\n\n🏠 隔音耳塞（¥20）\n邻居装修也不怕\n\n🏠 小夜灯（¥10-25）\n起夜不摸黑，造型还好看\n\n🏠 便携加湿器（¥35）\n暖气房里也润润的\n\n租房不是将就\n几十块钱就能提升居住幸福感。",
    category: "product",
    categoryLabel: "好物",
    gradient: "from-violet-400 to-fuchsia-500",
    icon: ShoppingBag,
    tags: ["租房好物", "居家", "平价推荐"],
    likes: 4321,
    author: "租房达人",
  },
  {
    id: "p4",
    title: "改变我工作效率的3个App",
    content:
      "用了一年，真心推荐这3个效率App：\n\n📱 待办清单App\n- 支持标签分类\n- 每天清零的成就感\n- 免费版就够用\n\n📱 专注计时App\n- 番茄工作法计时\n- 统计专注时长\n- 白噪音可选\n\n📱 笔记App\n- 支持Markdown\n- 多端同步\n- 随时记录灵感\n\n效率的核心不是工具有多好\n而是你有意识地去使用它。",
    category: "product",
    categoryLabel: "好物",
    gradient: "from-fuchsia-500 to-violet-600",
    icon: ShoppingBag,
    tags: ["效率工具", "App推荐", "时间管理"],
    likes: 2789,
    author: "效率极客",
  },
  {
    id: "p5",
    title: "今年回购了3次的好物清单",
    content:
      "回购3次以上的才是真爱：\n\n✅ 黑芝麻丸（¥40/盒）\n回购3次 · 坚持吃头发真的有变化\n\n✅ 蒸汽眼罩（¥30/盒）\n回购5次 · 午休和睡前都离不开\n\n✅ 挂耳咖啡（¥50/盒）\n回购4次 · 办公室手冲平替\n\n✅ 电热毯（¥80）\n回购1次 · 每年冬天必备\n\n回购 = 用完还想买 = 真的解决了需求\n\n种草的原则：\n不要因为别人推荐就买\n要问问自己「我真的需要吗？」",
    category: "product",
    categoryLabel: "好物",
    gradient: "from-purple-400 to-violet-500",
    icon: ShoppingBag,
    tags: ["回购清单", "种草", "消费观"],
    likes: 3654,
    author: "理性消费者",
  },
];

// ─── Animation ──────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export function InspirationWaterfall() {
  const [activeCategory, setActiveCategory] =
    useState<InspirationCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const [selectedItem, setSelectedItem] = useState<InspirationItem | null>(null);
  const [isRewriting, setIsRewriting] = useState<string | null>(null);
  const [rewriteResult, setRewriteResult] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [rewriteInput, setRewriteInput] = useState("");

  const { copied, copy } = useCopyToClipboard();

  // Load favorites from localStorage using lazy initialization
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("inspiration-favorites");
      if (saved) return new Set<string>(JSON.parse(saved));
    } catch { /* ignore */ }
    return new Set<string>();
  });

  // Save favorites to localStorage
  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem("inspiration-favorites", JSON.stringify([...next]));
      return next;
    });
  }, []);

  // Filter items
  const filteredItems = useMemo(() => {
    let items = INSPIRATION_DATA;
    if (activeCategory !== "all") {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    return items;
  }, [activeCategory, searchQuery]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  // Handle use (copy content)
  const handleUse = useCallback(
    (item: InspirationItem) => {
      copy(item.content);
      toast.success("灵感内容已复制到剪贴板");
    },
    [copy],
  );

  // Handle AI rewrite
  const handleAIRewrite = useCallback(async (item: InspirationItem) => {
    setIsRewriting(item.id);
    setRewriteResult("");
    setSelectedItem(item);
    setIsDetailOpen(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "inspiration",
          persona: "内容创作者",
          knowledgeItems: [],
          topic: `基于以下灵感内容，改写一篇适合社交媒体发布的文案，保持核心观点但使用不同的表达方式：\n\n标题：${item.title}\n内容：${item.content.substring(0, 200)}`,
          platform: "wechat",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRewriteResult(data.content);
        toast.success("AI改写完成");
      } else {
        toast.error("AI生成失败");
      }
    } catch {
      toast.error("AI生成失败，请重试");
    } finally {
      setIsRewriting(null);
    }
  }, []);

  // Empty state
  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-200 dark:shadow-amber-900/30">
            <Lightbulb className="h-8 w-8 text-white" />
          </div>
        </motion.div>
        <p className="text-sm font-medium text-muted-foreground mt-2">
          发现更多创作灵感
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          试试其他分类或搜索关键词
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ── Search Bar ──────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="搜索灵感关键词…"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setVisibleCount(8);
          }}
          className="h-8 text-xs pl-8 pr-8"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery("");
              setVisibleCount(8);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* ── Category Tabs ───────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const count =
            tab.value === "all"
              ? INSPIRATION_DATA.length
              : INSPIRATION_DATA.filter((i) => i.category === tab.value).length;
          return (
            <motion.button
              key={tab.value}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActiveCategory(tab.value);
                setVisibleCount(8);
              }}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap transition-all duration-200 shrink-0 ${
                activeCategory === tab.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {tab.label}
              <span
                className={`text-[9px] px-1 py-0 rounded-full ${
                  activeCategory === tab.value
                    ? "bg-primary-foreground/20"
                    : "bg-muted"
                }`}
              >
                {count}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* ── Masonry Grid ────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        key={`cat-${activeCategory}-${searchQuery}`}
        className="columns-2 gap-2.5"
      >
        <AnimatePresence mode="popLayout">
          {visibleItems.map((item, idx) => {
            const Icon = item.icon;
            const isFav = favorites.has(item.id);
            return (
              <motion.div
                key={item.id}
                variants={itemVariants}
                layout
                className="break-inside-avoid mb-2.5"
              >
                <div className="group/card relative rounded-xl overflow-hidden border border-border/50 bg-card hover:shadow-md transition-all duration-300">
                  {/* Gradient header */}
                  <div
                    className={`relative h-16 bg-gradient-to-br ${item.gradient} p-3 flex flex-col justify-end`}
                  >
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-1.5 py-0 bg-white/20 text-white border-0 backdrop-blur-sm`}
                      >
                        {item.categoryLabel}
                      </Badge>
                    </div>
                    <Icon className="h-4 w-4 text-white/60 absolute top-2.5 left-3" />
                    <h3 className="text-xs font-semibold text-white leading-tight pr-12 line-clamp-2">
                      {item.title}
                    </h3>
                  </div>

                  {/* Content preview */}
                  <div className="p-2.5">
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                      {item.content}
                    </p>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/30">
                      <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Eye className="h-2.5 w-2.5" />
                          {item.likes.toLocaleString()}
                        </span>
                        <span>{item.author}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-0.5">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => toggleFavorite(item.id)}
                          className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          <Heart
                            className={`h-3 w-3 transition-colors ${
                              isFav
                                ? "fill-rose-500 text-rose-500"
                                : "text-muted-foreground"
                            }`}
                          />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => handleUse(item)}
                          className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          {copied ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          )}
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() => {
                            setSelectedItem(item);
                            setRewriteResult("");
                            setRewriteInput("");
                            setIsDetailOpen(true);
                          }}
                          className="h-6 w-6 rounded-md flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                          <MessageCirclePlus className="h-3 w-3 text-muted-foreground" />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* ── Load More ───────────────────────────────────── */}
      {hasMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center pt-2"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount((c) => c + 6)}
            className="text-xs gap-1.5 h-8"
          >
            <ChevronDown className="h-3.5 w-3.5" />
            加载更多
            <span className="text-muted-foreground">
              （还有 {filteredItems.length - visibleCount} 条）
            </span>
          </Button>
        </motion.div>
      )}

      {/* ── Detail Dialog ───────────────────────────────── */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <div
                  className={`flex items-center gap-2 mb-2 rounded-lg bg-gradient-to-r ${selectedItem.gradient} p-3 -mx-6 -mt-6`}
                >
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <Star className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-sm font-semibold text-white">
                      {selectedItem.title}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-white/70">
                      {selectedItem.categoryLabel} · {selectedItem.author} ·{" "}
                      {selectedItem.likes.toLocaleString()} 人收藏
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Full content */}
              <div className="mt-2">
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {selectedItem.content}
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {selectedItem.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-2 py-0.5"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>

              <Separator className="my-3" />

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 text-xs h-8"
                  onClick={() => handleUse(selectedItem)}
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制内容
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={`flex-1 gap-1.5 text-xs h-8 ${
                    favorites.has(selectedItem.id)
                      ? "text-rose-600 border-rose-200 dark:border-rose-800"
                      : ""
                  }`}
                  onClick={() => toggleFavorite(selectedItem.id)}
                >
                  <Heart
                    className={`h-3.5 w-3.5 ${
                      favorites.has(selectedItem.id)
                        ? "fill-rose-500 text-rose-500"
                        : ""
                    }`}
                  />
                  {favorites.has(selectedItem.id) ? "已收藏" : "收藏"}
                </Button>
              </div>

              {/* AI Rewrite Section */}
              <Separator className="my-2" />
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-semibold">AI改写</span>
                </div>
                <Textarea
                  placeholder="输入改写要求，如「改成小红书风格」「更幽默一些」「控制在100字以内」…"
                  value={rewriteInput}
                  onChange={(e) => setRewriteInput(e.target.value)}
                  className="text-xs min-h-[60px] resize-none"
                />
                <Button
                  size="sm"
                  className="w-full gap-1.5 text-xs h-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
                  onClick={() => handleAIRewrite(selectedItem)}
                  disabled={isRewriting === selectedItem.id}
                >
                  {isRewriting === selectedItem.id ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      AI正在改写…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      AI改写
                    </>
                  )}
                </Button>

                {rewriteResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg bg-muted/50 border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        ✨ AI改写结果
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] gap-1"
                        onClick={() => copy(rewriteResult)}
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        复制
                      </Button>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap">
                      {rewriteResult}
                    </p>
                  </motion.div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
