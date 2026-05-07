# ADR-001: 合并巡检与 E2E 测试为统一 Playwright 套件

## 状态: 已采纳
## 日期: 2026-05-07
## 背景: 项目同时运行两套自动化检查系统 — inspection-runner.ts (14项检查) 和 full-visual-qa.spec.ts (7项E2E测试)。两者功能重叠（都检查页面加载、元素存在），但各有优势。

## 决策: 以 E2E 测试框架为主体，注入巡检的独有检查（控制台错误检测、破损图片检测），合并为统一的 9 项 Playwright 测试套件。取消 inspection-runner.ts 独立执行。

## 后果:
- **好处**: 单一维护、并行执行 (9 worker)、Playwright 视频录制、统一调度
- **代价**: 失去了 inspection-runner 的数据库持久化能力（InspectionRun/InspectionIssue 表）。但保留了 API 端点，可在需要时恢复
