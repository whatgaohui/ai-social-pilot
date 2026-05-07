# PRD-003: AI 建议 → 可执行方案（多场景完善版）

> **优先级**: P2  
> **日期**: 2026-05-07  
> **状态**: 待确认  

---

## 一、问题描述

当前账号中心的"AI建议"只是文本提示（如"建议多发美食类内容"、"建议增加互动"），用户看到后不知道具体怎么做。建议无法直接转化为行动。

## 二、AI建议场景分类

根据建议类型，分为以下 5 种场景：

| 场景 | 示例建议 | 可执行动作 |
|------|----------|-----------|
| **A. 内容创作** | "建议多发美食类内容" | 生成笔记草稿（标题+内容+标签+建议时间） |
| **B. 发布时间** | "建议在晚上18-20点发布" | 调整排期计划，推荐最佳时间槽 |
| **C. 互动优化** | "建议增加评论互动" | 生成评论回复模板 + 互动话术卡片 |
| **D. 人设调整** | "建议强化美食博主人设" | 生成 Persona 修改方案（标签/描述/风格） |
| **E. 运营计划** | "建议本周发3篇笔记" | 生成周运营计划（时间线+内容主题+目标） |

### 2.1 场景A：内容创作 → 生成笔记草稿

**交互流程**：
```
AI建议卡片 → 点击"生成方案" → AI 生成完整笔记草稿
→ 预览弹窗（标题+内容+标签+建议时间+参考风格）
→ 用户编辑/确认/取消 → 保存到草稿箱
```

**预览弹窗**：
```
┌─────────────────────────────────────────┐
│ 🤖 AI 内容方案                           │
│─────────────────────────────────────────│
│ 基于建议: "建议多发美食类内容"            │
│                                         │
│ 📝 标题: 这家藏在巷子里的面馆...          │
│ 📄 内容: (预览前200字)                    │
│ 🏷️ 标签: #美食探店 #成都美食 #面馆       │
│ 📅 建议发布: 明天 18:00                  │
│ 📷 参考风格: 该账号历史高赞笔记            │
│                                         │
│ [ 编辑草稿 ]    [ 确认保存 ]    [ 取消 ]  │
└─────────────────────────────────────────┘
```

### 2.2 场景B：发布时间 → 调整排期

**交互流程**：
```
AI建议卡片 → 点击"应用" → 显示推荐时间槽列表
→ 用户选择时间槽 → 自动调整待发布笔记的排期
→ 确认保存
```

**预览弹窗**：
```
┌─────────────────────────────────────────┐
│ 📅 AI 时间推荐                           │
│─────────────────────────────────────────│
│ 基于建议: "建议在晚上18-20点发布"         │
│ 分析: 你的粉丝活跃高峰在 18:00-20:00      │
│                                         │
│ 推荐时间槽:                              │
│  ● 今天 18:30  (粉丝活跃: 高)             │
│  ● 明天 19:00  (粉丝活跃: 高)             │
│  ● 后天 18:00  (粉丝活跃: 中)             │
│                                         │
│ 待调整笔记: [笔记A] [笔记B]               │
│                                         │
│ [ 批量调整 ]    [ 单独设置 ]    [ 取消 ]  │
└─────────────────────────────────────────┘
```

### 2.3 场景C：互动优化 → 评论话术

**交互流程**：
```
AI建议卡片 → 点击"查看话术" → 展示互动话术卡片
→ 可复制/收藏话术 → 应用到实际评论
```

**预览弹窗**：
```
┌─────────────────────────────────────────┐
│ 💬 AI 互动话术                           │
│─────────────────────────────────────────│
│ 基于建议: "建议增加评论互动"              │
│                                         │
│ 场景1: 粉丝夸赞你的笔记                   │
│  💡 "谢谢喜欢！下期带你去更好吃的～"      │
│                                         │
│ 场景2: 粉丝问具体位置                    │
│  💡 "在XX路XX号，地铁2号线出来走5分钟"   │
│                                         │
│ 场景3: 引导粉丝互动                      │
│  💡 "你们最想看哪家店？评论区告诉我！"    │
│                                         │
│ [ 复制话术 ]    [ 生成更多 ]    [ 关闭 ]  │
└─────────────────────────────────────────┘
```

### 2.4 场景D：人设调整 → Persona 修改方案

**交互流程**：
```
AI建议卡片 → 点击"修改人设" → 展示当前 vs 建议人设对比
→ 用户确认/微调 → 更新 Persona 记录
```

**预览弹窗**：
```
┌─────────────────────────────────────────┐
│ 🎭 AI 人设建议                           │
│─────────────────────────────────────────│
│ 基于建议: "建议强化美食博主人设"          │
│                                         │
│ 当前人设        →    建议人设             │
│ ────────────         ────────────        │
│ 标签: 生活/美食   →   标签: 美食探店      │
│ 描述: 分享日常    →   描述: 成都美食...   │
│ 风格: 随意      →     风格: 专业探店      │
│                                         │
│ [ 应用修改 ]    [ 手动调整 ]    [ 取消 ]  │
└─────────────────────────────────────────┘
```

### 2.5 场景E：运营计划 → 周计划生成

**交互流程**：
```
AI建议卡片 → 点击"生成计划" → 展示周运营时间线
→ 用户调整每日安排 → 确认保存 → 自动创建草稿/排期
```

**预览弹窗**：
```
┌─────────────────────────────────────────┐
│ 📊 AI 周运营计划                         │
│─────────────────────────────────────────│
│ 基于建议: "建议本周发3篇笔记"             │
│ 目标: 提升粉丝互动率 15%                 │
│                                         │
│ 周一 (5/12)  18:30  🍜 美食探店草稿       │
│ 周三 (5/14)  19:00  📸 穿搭分享草稿       │
│ 周五 (5/16)  18:00  🎬 视频笔记草稿       │
│                                         │
│ [ 一键创建 ]    [ 手动调整 ]    [ 取消 ]  │
└─────────────────────────────────────────┘
```

## 三、统一方案引擎

### 3.1 设计思路

所有场景共用一个方案生成引擎，根据建议类型分发到不同处理器：

```
AI建议(type, text, data)
  │
  ├── type="content"    → ContentPlanHandler → 生成笔记草稿
  ├── type="timing"     → TimingPlanHandler  → 推荐时间槽
  ├── type="engagement" → EngagementHandler  → 互动话术
  ├── type="persona"    → PersonaHandler     → 人设修改方案
  └── type="strategy"   → StrategyHandler    → 周运营计划
```

### 3.2 方案数据结构

```typescript
interface ActionPlan {
  id: string;
  suggestionId: string;       // 来源建议
  type: "content" | "timing" | "engagement" | "persona" | "strategy";
  status: "pending" | "applied" | "rejected";
  
  // 通用字段
  title: string;              // 方案标题
  description: string;        // 方案描述
  
  // 场景特定数据 (JSON)
  content?: {                 // type="content"
    title: string;
    contentBody: string;
    tags: string[];
    mediaType: "image" | "video";
    suggestedTime: string;
  };
  timing?: {                  // type="timing"
    slots: { time: string; activity: "high" | "medium" | "low" }[];
    affectedNoteIds: string[];
  };
  engagement?: {              // type="engagement"
    scenarios: { scenario: string; template: string }[];
  };
  persona?: {                 // type="persona"
    currentTags: string[];
    suggestedTags: string[];
    currentDesc: string;
    suggestedDesc: string;
  };
  strategy?: {                // type="strategy"
    weekStart: string;
    goals: string[];
    dailyPlans: { date: string; time: string; topic: string; type: string }[];
  };
  
  createdAt: string;
}
```

## 四、草稿箱（与PRD-005共用）

新增"草稿箱"概念（可使用 `ScheduledNote` 模型，状态字段区分）：

| 状态 | 说明 |
|------|------|
| `draft` | 草稿，未排期 |
| `scheduled` | 已排期，等待发布 |
| `published` | 已发布 |
| `rejected` | 用户拒绝的方案 |

草稿箱入口：账号中心新增"草稿箱"tab

## 五、API 设计

```
POST /api/accounts/[id]/generate-plan
Body: { suggestionId: string, suggestionText: string, suggestionType: string }
Response: { plan: ActionPlan }

POST /api/accounts/[id]/apply-plan
Body: { planId: string, modifications?: object }
Response: { success: boolean, result: object }

GET /api/accounts/[id]/plans
Response: { plans: ActionPlan[] }

// 草稿相关（与PRD-005共用）
POST /api/accounts/[id]/drafts
GET /api/accounts/[id]/drafts
PATCH /api/accounts/[id]/drafts/[draftId]
DELETE /api/accounts/[id]/drafts/[draftId]
```

## 六、影响范围

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/components/account/ai-suggestions-panel.tsx` | 修改 | 根据建议类型显示不同操作按钮 |
| `src/components/account/plan-preview-dialog.tsx` | 新建 | 统一方案预览弹窗（5种场景） |
| `src/components/account/draft-box.tsx` | 新建 | 草稿箱列表（与PRD-005共用） |
| `src/app/api/accounts/[id]/generate-plan/route.ts` | 新建 | AI方案生成API（5种handler） |
| `src/app/api/accounts/[id]/apply-plan/route.ts` | 新建 | 方案应用API |
| `src/app/api/accounts/[id]/drafts/route.ts` | 新建 | 草稿CRUD API |
| `prisma/schema.prisma` | 评估 | 可能需要 ActionPlan 表或扩展 ScheduledNote |

## 七、验收标准

- [ ] 5种建议类型各有独立的操作按钮和预览界面
- [ ] 内容创作方案可生成草稿并保存
- [ ] 发布时间方案可调整排期
- [ ] 互动话术可复制
- [ ] 人设方案可一键应用
- [ ] 运营计划可一键创建多个草稿
- [ ] 草稿箱统一管理所有来源的草稿
- [ ] TypeScript 编译通过，0 errors

## 八、风险

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| 5种场景开发量大 | 高 | 中 | 先做A(content)+B(timing)，C/D/E后续迭代 |
| AI生成质量不稳定 | 高 | 中 | 用户可编辑确认后再应用 |
| Schema设计不当 | 中 | 中 | ActionPlan 先存为 JSON，不建独立表 |
