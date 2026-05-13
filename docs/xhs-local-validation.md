# 小红书账号采集：本地在线验证指南

> 目标：输入一个小红书账号 URL 后，验证「账号创建 → 采集同步 → 笔记入库 → 按账号隔离查询」链路。

## 1. 启动依赖

```bash
# 终端1：主应用
npm install
npm run db:push
npm run dev

# 终端2：scraper 子服务
cd mini-services/scraper-service
npm install
# 建议显式对齐主库路径
export DATABASE_URL="file:../../db/custom.db"
npm run dev || npx tsx index.ts
```

## 2. 一键验证脚本

仓库已提供脚本：`scripts/validate-xhs-local.sh`

```bash
# 可选：带 cookie（提升抓取成功率）
COOKIE='你的xhs cookie' \
BASE_URL='http://127.0.0.1:3000' \
./scripts/validate-xhs-local.sh 'https://www.xiaohongshu.com/user/profile/xxxx'
```

## 3. 脚本会做什么

1. 调 `POST /api/tracked-accounts` 创建待采集账号。
2. 调 `POST /api/tracked-accounts/:id/sync` 启动同步任务。
3. 轮询 `GET /api/tracked-accounts/:id` 直到 `success/error`。
4. 调 `GET /api/tracked-accounts/:id/notes` 校验每条 `sourceAccountId === account.id`。
5. 抽样检查前几条笔记的 comments/interactions 接口返回量。
6. 打印账号最终快照（followers/postsCount/totalCollected/lastError）。

## 4. 常见失败定位

- `采集服务未启动`：确认 scraper 服务在 `3003`，且主服务可访问（`SCRAPER_URL`）。
- `403/风控`：通常是 cookie 失效或 IP 风控，换新 cookie 或更稳定网络出口。
- `notes total = 0` 但状态 success：说明主页信息抓到但笔记详情受前端渲染限制，可先验证账号信息落库与状态流转是否正确。

## 5. 手动 API 验证（可选）

```bash
# 创建账号
curl -X POST http://127.0.0.1:3000/api/tracked-accounts \
  -H 'Content-Type: application/json' \
  -d '{"platform":"xiaohongshu","collectMethod":"link","homeUrl":"https://www.xiaohongshu.com/user/profile/xxxx","isOwn":false}'

# 触发同步
curl -X POST http://127.0.0.1:3000/api/tracked-accounts/<ACCOUNT_ID>/sync

# 查状态
curl http://127.0.0.1:3000/api/tracked-accounts/<ACCOUNT_ID>

# 查该账号采集结果（必须按 sourceAccountId 隔离）
curl 'http://127.0.0.1:3000/api/tracked-accounts/<ACCOUNT_ID>/notes?page=1&limit=20'
```
