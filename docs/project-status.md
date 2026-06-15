# SpinShare 项目状态报告

> 生成于 2026-06-15。本文是单一事实来源，整合了架构说明、后端诊断、问题清单和改进方向。
> 所有结论基于代码事实，关键处附文件/行号。

---

## 目录
1. [产品是什么](#1-产品是什么)
2. [架构与各部件职责](#2-架构与各部件职责)
3. [当前问题全景](#3-当前问题全景)
4. [错误/不可用的功能](#4-错误不可用的功能)
5. [需要改进的地方](#5-需要改进的地方)
6. [行动优先级](#6-行动优先级)

---

## 1. 产品是什么

**SpinShare** 是一个开发者优先的广告交易平台，核心点：**在 AI 编程工具的「等待状态」（加载旋转图标 spinner）期间投放广告来变现**。

- 标语：*"Your AI is thinking. You should be earning."*（你的 AI 在思考，你该在赚钱。）
- 商业模型对标 Kickbacks.ai：开发者得 **60%** / 平台留 **40%**（对手 50/50），**无收入上限**。
- 平台覆盖：终端 CLI（Claude/Codex）+ GUI IDE（VSCode/Cursor/Trae/Kiro）。
- **核心交付物就是两个客户端**：VSCode 扩展 + npm CLI 包。web 是它们的后端。

### 理想流程（你要的样子）
1. 用户下载 extension 或 npm CLI；
2. 去主页登录，账号自动 sync 到客户端；
3. 后端 telemetry 记录用户、防机器人；
4. 用户用任何 CLI，广告**覆盖** loading；按时间计费；
5. 单条广告**累计**显示满 3 秒 → 给用户钱、扣广告商费；
6. 没满 3 秒（比如只显示 1 秒）→ 不扣费、不给钱，**下次继续显示同一条**，直到累计满 3 秒才双向记账；
7. 记账后继续竞价，出价高的继续显示，循环。

---

## 2. 架构与各部件职责

Monorepo（pnpm workspace）：**1 个基础库 + 3 个交付包**。

```
                 ┌─────────────────────────────────┐
                 │   @spinshare/core (纯函数)        │
                 │   资金 / 竞价 / 反欺诈 / 类型      │
                 └───────────────┬─────────────────┘
                                 │ 三方共同依赖（保证算钱永远一致）
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        web (后端+前端)     cli-wrapper        vscode-extension
        GET /api/ad         spawn 子进程       withProgress 通知
        POST /api/track     拦截 spinner       展示广告
        Stripe/账本         注入广告           3秒后上报
```

### 2.1 `packages/core` (`@spinshare/core`) — 纯函数基础库 ✅ 稳定
资金计算（整数分/微分，绝不浮点）、竞价选择、反欺诈 velocity 逻辑——所有包的**单一真源**。大量属性测试（fast-check）覆盖。**这是全项目质量最高的部分。**

### 2.2 `web/` (`@spinshare/web`) — Next.js 单体（后端+前端）✅ 基本可用
- **API**：`GET /api/ad`（竞价）、`POST /api/track`（账本结算）、`/api/advertiser-checkout`（公开充值）、`/api/webhooks/stripe`、`/api/auth/*`（设备授权）、`/api/campaigns`、`/api/payouts`。
- **存储**：Firestore（`users`/`campaigns`/`ledgerEntries`，持久）+ Firebase RTDB（热路径计数器，批量刷回 Firestore 省写入成本）。
- **认证**：NextAuth（Google/GitHub）做网页登录；CLI/扩展用设备授权流程（device flow）。
- **仪表盘**：开发者仪表盘（收益）、广告商仪表盘（建广告、充值）。

### 2.3 `cli-wrapper/` (`@spinshare/cli`) — 终端 CLI 包装器 ⚠️ 早期
装完提供 `spinshare` 命令，**必须包在别的 CLI 前面**：`spinshare node claude "..."`。
它 spawn 目标 CLI 当子进程 → 拦截 stdout → 逐帧判断是不是 spinner 字符（`|/-\`、`thinking/loading/...`）→ 是则吞掉、改显示广告 → 连续 ≥3 秒上报一次曝光 → 子进程退出返回退出码。

### 2.4 `vscode-extension/` — VSCode 扩展（兼容 Cursor/Trae）❌ 不可用
两条投广告路径：
- **路径 A（生成钩子）**：注册命令 `spinshare.startGeneration`/`completeGeneration`，等宿主编辑器在 AI 生成时调用。
- **路径 B（终端自动包装）**：给终端里的 claude/codex 装 shim，实际跑 `spinshare ... claude`，复用 CLI 的 spinner 拦截。

### 2.5 三大核心引擎（都在 web）
1. **竞价引擎** `GET /api/ad`：所有 `budget>0` 的活跃广告里，**最高 CPM 获胜**（平手按创建时间→id）。确定性、与输入顺序无关。
2. **账本引擎** `POST /api/track`：按曝光结算。例 $30 CPM = $0.03/次，开发者得 $0.018（60%）。原子地加余额、扣预算、写账本。
3. **反欺诈**：>30 印象/分钟 → **影子封禁**（照样投放不记费，对开发者不可区分）；收益上限 $20/小时、$300/天；shadow-ban 60 分钟自动解。

---

## 3. 当前问题全景

按严重程度从高到低。**最关键的事实：后端代码质量很高，大部分「坏」是配置矛盾、死代码、和一个产品级缺口，不是逻辑 bug。**

### 🔴 问题 1：广告「触发链路」断裂（产品级，最致命）

**这是「Claude 在 baking 却看不到广告」「插件这么难弄」的根本原因。**

extension 两条路径都不通：
- **路径 A 悬空**：`vscode-extension/src/extension.ts:162` 注册的 `spinshare.startGeneration` 命令，设计上要等 Cursor/Trae/Claude 在生成时调用。但**这些编辑器根本不会调用这个命令**——没有任何宿主集成契约。钩子永远不触发 → 永远不拉广告。
- **路径 B 脆弱**：终端 shim 思路对，但 Windows 下 PTY + spinner 拦截 + ANSI/OSC8 组合很脆弱。

CLI 能工作但**要求用户改变习惯**（每次打 `spinshare ...`），体验存疑。

**根因**：难不在广告业务（竞价/分成/反欺诈都很标准），难在**「怎么知道 AI 正在转圈」这个触发问题**。代码花了海量篇幅在「绕」这个本不该由我们解决的问题上：

| 尝试的手段 | 代码 | 问题 |
|-----------|------|------|
| 猜 spinner 字符（`|/-\`、单词） | `cli-wrapper/src/renderer.ts:25-42` | 各家 spinner 格式不同，猜不全，误判多 |
| 装 PTY 假终端 | `cli-wrapper/src/wrap.ts:216` | Windows 下脆弱，原生模块编译坑 |
| Windows 命令引号转义 | `cli-wrapper/src/wrap.ts:173` | 极易出错，调试痛苦 |
| 盼宿主编辑器调钩子 | `vscode-extension/src/extension.ts:162` | Cursor/Trae 不调，契约不存在 |
| 终端装 shim | `vscode-extension/src/terminal-auto-wrap.ts` | 脆弱，污染用户环境 |

### 🔴 问题 2：`.env` 模式自相矛盾（大概率是「感觉都坏了」的主因）

你的 `.env`：
```
SPINSHARE_MODE=local      ← 本地模式
AUTH_MODE=oauth           ← 生产认证
STRIPE_MODE=test          ← 生产支付（真 Stripe）
SPINSHARE_COUNTER=rtdb    ← 生产计数器（真 RTDB）
```

这是「**本地壳 + 生产内脏**」的矛盾组合。关键证据 `web/src/server/container.ts:158` 的 `useFirestoreInLocal()`：
- `SPINSHARE_MODE=local` 且没设 `SPINSHARE_USE_FIRESTORE=1`、没设 `FIRESTORE_EMULATOR_HOST` → **返回 false** → 走**内存 repo**。
- `container.ts:217`：本地模式 + dev → `seedLocalTestData()` 往内存**灌假数据**。

**后果**：你本地跑 web 时，充值/曝光/账户**根本没进云端 Firestore**，全在进程内存里，进程一重启全没。但你 `.env` 又配着真 Firebase 私钥、真 Stripe key、真 RTDB——让你**误以为**在操作生产数据，实际操作的是内存假数据。**这就是「东西都坏了」的错觉来源。**

### 🔴 问题 3：Stripe test 付款后排行榜不上榜（最新诊断）

你说的「我跑了 Stripe test，付费后排行榜不显示」在当前代码里最可能不是 Stripe 收款失败，而是**付款完成后的 budget 入账没有发生，或入账写到的存储和排行榜读取的存储不是同一个**。

完整链路是：
1. 主页表单 `web/src/app/advertiser-checkout-form.tsx:162` 调 `POST /api/advertiser-checkout`；
2. `web/src/app/api/advertiser-checkout/route.ts:50` 先创建一个 `budgetCents=0` 的 campaign；
3. `route.ts:62` 创建 Stripe Checkout session；
4. 只有 `checkout.settled === true` 时，`route.ts:71-73` 才会当场加预算。这个只会在 `STRIPE_MODE=mock` 发生；
5. `STRIPE_MODE=test/live` 下 `StripeGateway.createCheckoutSession()` 返回 `{ url, sessionId }`，没有 `settled`（`web/src/server/adapters/stripe/stripe-gateway.ts:108`）；
6. 因此真实 Stripe test 付款后，必须等 Stripe webhook 打到 `POST /api/webhooks/stripe`；
7. webhook 在 `web/src/app/api/webhooks/stripe/route.ts:59-69` 验证 `checkout.session.completed` 后，才会 `applyBudgetDeltaCents()`；
8. 主页排行榜每 15 秒请求 `/api/market`（`web/src/app/page.tsx:377-409`）；
9. `/api/market` 只读取 `campaigns.listBiddable()`（`web/src/app/api/market/route.ts:87`），而 Firestore repo 的 `listBiddable()` 只查 `budgetCents > 0`（`web/src/server/adapters/firestore/campaign-repo.ts:45-53`）。

所以结论很明确：**Stripe test 付款成功后，如果本地没有用 `stripe listen` 把 webhook 转发到 `http://localhost:3000/api/webhooks/stripe`，或 `STRIPE_WEBHOOK_SECRET` 不是 Stripe CLI 给的本地 signing secret，campaign 会一直保持 `budgetCents=0`，排行榜必然不显示。**

另外还有两个相关问题：
- 当前 `.env` 是 `SPINSHARE_MODE=local` + `STRIPE_MODE=test`。如果没有 `SPINSHARE_USE_FIRESTORE=1` 或 `FIRESTORE_EMULATOR_HOST`，campaign 创建和 webhook 入账都在同一个进程的内存 repo 里；服务重启后会丢。
- Firestore 集合名目前硬编码为顶层 `users/campaigns/ledgerEntries/paymentEvents`（`web/src/server/adapters/firestore/collections.ts:18-24`）。也就是说，localhost 若启用真实 Firestore，会直接写真实集合，没有 `test/...` namespace。你提出的「localhost 写 test folder，不要改 actual Firestore」是正确的，需要单独实现。

验证过的测试：`corepack pnpm@9.12.0 --filter @spinshare/web test -- src/app/api/advertiser-checkout/route.test.ts src/app/api/market/route.test.ts src/app/api/webhooks/stripe/route.test.ts`，9 个相关单元测试通过。这说明 mock 付款、market 排行榜、webhook 幂等入账的单元逻辑是好的；坏点更可能在本地 Stripe webhook/环境隔离，而不是纯业务函数。

### 🟡 问题 4：计费逻辑与你期望的不符（待改造）

你要的是**累计型**，现有代码是**连续型**：

| 维度 | 你要的（累计型） | 现有代码（连续型） | 代码位置 |
|------|----------------|------------------|---------|
| 3 秒判定 | **累计**满 3 秒（可跨多次显示） | 必须**连续**一次满 3 秒 | `cli-wrapper/src/wrap.ts:48` `WaitStateTracker` |
| 未满 3 秒 | **记住这个广告**，下次继续同一个 | **丢弃**，下次重新竞价拿新的 | `wrap.ts:63` 非-spinner 帧 `reset()` |
| 记账时机 | 累计满 3 秒那一刻，双向记账 | 连续满 3 秒才记；不满则不记 | `web/src/server/ledger-service.ts` 每次即结算 |

**改造影响面**（独立工作项，本轮不做）：core 要新增「广告进度」状态模型；存储层要持久化进度（用户重启后续上）；竞价层在有未完成广告时优先返回它；账本层只在进度首次达 3 秒时结算。

### 🟡 问题 5：广告商付款入口分叉，`/api/funds/checkout` 不是死代码但不完整

之前判断 `/api/funds/checkout` 是死代码，这一点被当前代码推翻：`web/src/app/dashboard/advertiser/campaign-list.tsx:100-110` 的 Add Funds 确实会调用它，并且会带 `Device_Auth_Token`。

但它仍然有问题：项目现在有两条付款入口，行为不一致。

| 入口 | 调用方 | 做什么 | 风险 |
|------|--------|--------|------|
| `/api/advertiser-checkout` | 主页公开表单 | 创建 campaign + 创建 Stripe session；mock 模式当场加预算 | test/live 必须依赖 webhook，否则不上榜 |
| `/api/funds/checkout` | 广告商仪表盘 Add Funds | 给已有 campaign 创建 Stripe session | 没传 `successUrl/cancelUrl`；没有测试覆盖；不校验 campaign 是否属于当前 advertiser |

具体证据：
- `web/src/app/api/funds/checkout/route.ts:97-100` 调 `payments.createCheckoutSession()` 时只传了 `campaignId/amountCents`，没有传 success/cancel URL；
- `StripeGateway` 只有在输入里有 `successUrl/cancelUrl` 时才会传给 Stripe（`web/src/server/adapters/stripe/stripe-gateway.ts:101-102`）；
- `web/src/app/api/funds` 下没有 route test；
- `funds/checkout` 只验证 token 有效（`route.ts:63-68`），没有读取 campaign 并确认 `campaign.advertiserId === advertiserId`。

所以这里不是「死代码」，而是**仪表盘充值路径没有达到和主页公开 checkout 一样的完整度**。

### 🟡 问题 6：LearnX mock data 会干扰本地判断

`web/src/server/dev/seed-local-data.ts:102-113` 在 `SPINSHARE_MODE=local` + `NODE_ENV=development` + 内存 repo 时自动塞入 LearnX campaign：

- `id: "cmp-local-demo"`
- `adText: "LearnX · Know exactly what to study"`
- `brandName: "LearnX"`
- `budgetCents: 5000`
- `cpmCents: 3000`

这能让空项目本地启动后看起来有数据，但现在它会干扰真实调试：你付费后看排行榜，很难分清看到的是 seed 的 LearnX，还是自己刚付款的 campaign。你说「先删除 LearnX 那个 mock data」是合理的，建议下一步最小改法是默认不 seed campaign，或者只在显式 `SPINSHARE_SEED_LOCAL_DATA=1` 时 seed。

### 🟢 问题 7：本地连云端的数据一致性风险（承接问题 2 和 3）

即使你想本地连云端，`SPINSHARE_MODE=local` 默认也不连 Firestore。但你配了真私钥——这让**认证（OAuth）连真 Firebase，业务数据走内存**。账户能登进去但看不到自己的真实数据。

反过来，如果你设置 `SPINSHARE_USE_FIRESTORE=1`，当前代码也没有 test namespace，会直接写真实顶层 Firestore 集合。正确方向应该是：localhost 的 Firestore repo 自动写到 `test/users`、`test/campaigns`、`test/ledgerEntries`、`test/paymentEvents`，或至少支持 `SPINSHARE_FIRESTORE_NAMESPACE=test`。

---

## 4. 错误/不可用的功能

| 功能 | 状态 | 原因 | 证据 |
|------|------|------|------|
| Extension 路径 A（生成钩子显示广告） | ❌ 完全不可用 | 宿主编辑器不调钩子，契约不存在 | `extension.ts:162` |
| Extension 路径 B（终端自动包装） | ⚠️ 早期/不稳 | Windows PTY+shim 脆弱 | `terminal-auto-wrap.ts` |
| 「AI 等待→看到广告」端到端 | ❌ 未打通 | 触发链路断裂（问题 1） | — |
| Stripe test 付款后排行榜上榜 | ⚠️ 本地易失败 | test/live 不会当场加预算，必须依赖 webhook；localhost 常没转发 webhook | 问题 3 |
| `/api/funds/checkout` | ⚠️ 可调用但不完整 | 仪表盘 Add Funds 在用，但缺 success/cancel URL、缺 ownership 校验、缺测试 | 问题 5 |
| Firestore localhost 隔离 | ❌ 未实现 | 集合名硬编码为真实顶层集合，没有 test namespace | `collections.ts:18-24` |
| LearnX mock data | ⚠️ 干扰诊断 | local dev 内存 repo 自动 seed LearnX funded campaign | `seed-local-data.ts:102-113` |
| 本地端到端跑通 | ⚠️ 配置矛盾 | env 模式冲突，数据进内存不进云端 | 问题 2 |

### ✅ 这些功能是好的（别误判）
- `@spinshare/core` 资金/竞价/反欺诈（属性测试覆盖，逻辑严谨）
- 竞价引擎 `GET /api/ad`
- 账本引擎 `POST /api/track`（含影子封禁、收益上限）
- **Stripe 公开充值** `/api/advertiser-checkout`（不要求登录，主页表单调用；mock 模式会当场入账）
- Stripe webhook 的单元逻辑（签名验证 + 幂等 claim + budget 增量）是好的；本地真实 Stripe test 需要正确 webhook 转发
- 设备授权登录 device flow（`cli-wrapper/src/login.ts`）
- 开发者/广告商仪表盘 UI

---

## 5. 需要改进的地方

### 5.1 产品级（最重要）

**P0 — 定触发模型，放弃「猜 spinner」**
这是产品能否做出来的前提。建议方向：放弃猜 spinner，改成**「命令开始 → 显示广告 → 命令结束 → 按运行时长结算」**：
- CLI 侧：用户敲 `spinshare claude ...`，立即显示一条广告，整个命令运行期间都算展示中，命令结束按运行时长结算。不猜 spinner、不吞字节、不需要 PTY。可靠性提升一个数量级。
- Extension 侧：主推路径 B 改良版，或同样用「命令开始/结束」模型。
- 代价：广告和「等待」脱钩，变成「命令运行期间展示」。但**这是当前唯一能稳定落地的路**。

**P0 — 统一 `.env` 模式**
二选一，别混：
- 全生产：`SPINSHARE_MODE=production` + 全套 creds（`NEXTAUTH_URL`、`AUTH_VERIFICATION_URI`、`FIREBASE_*`、`STRIPE_*`、`AUTH_MODE=oauth`、`SPINSHARE_COUNTER=rtdb`）。
- 全本地：`STRIPE_MODE=mock`、`AUTH_MODE=mock`、`SPINSHARE_COUNTER=memory`，别配真私钥。
- 本地连真实服务测试：必须显式定义隔离策略。当前代码没有 Firestore test namespace，所以不建议直接 `SPINSHARE_USE_FIRESTORE=1` 连真实项目。

**P0 — 建立 localhost 的 Stripe/Firebase 测试闭环**
如果要用 Stripe test 而不是 mock，就必须把这条链路固定下来：
- 本地启动 web；
- `stripe listen --forward-to localhost:3000/api/webhooks/stripe`；
- `.env` 使用 Stripe CLI 输出的本地 `STRIPE_WEBHOOK_SECRET`；
- checkout 完成后确认 webhook 返回 200；
- 确认同一个存储里的 campaign `budgetCents > 0`；
- 再看 `/api/market`。

同时需要把 Firestore 本地写入隔离到 test namespace，避免 localhost 写真实顶层集合。

### 5.2 工程级

**P1 — 修正广告商仪表盘付款路径**
`/api/funds/checkout` 不是死代码。最小修正方向是：补 `successUrl/cancelUrl`，给 route 加测试，并在创建 checkout 前确认 campaign 属于当前 advertiser。

**P1 — 删除或显式开关 LearnX seed**
本地 seed 的 LearnX campaign 现在会污染判断。建议默认不 seed funded campaign；需要 demo 数据时用 `SPINSHARE_SEED_LOCAL_DATA=1` 显式开启。

**P1 — 砍掉 spinner 猜测相关的脆弱代码**
若采纳 5.1 的触发模型，`renderer.ts` 的 spinner 字符猜测、`wrap.ts` 的 PTY 加载、`quoteWindowsArg` 的 Windows 转义都可以大幅简化或删除。这能消除项目里一半的复杂度和 bug 面。

**P2 — 累计型计费改造**
按问题 4 的影响面：core 新增进度状态模型 + 存储持久化 + 竞价优先返回未完成广告 + 账本只在达 3 秒时结算。待触发模型定了再做。

**P2 — telemetry 强化**
你提到「后台 telemetry 记录用户确保不是机器人」。现有反欺诈（velocity、影子封禁、收益上限）已覆盖**计费侧**防刷，但**用户行为侧**的 telemetry（登录设备指纹、异常登录、多账号关联）目前没有。可作为独立工作项。

---

## 6. 行动优先级

| 优先级 | 动作 | 解决的问题 | 说明 |
|--------|------|-----------|------|
| **P0** | 统一 `.env` 模式 | 问题 2、7 | 让你能真正跑通端到端，区分真假数据 |
| **P0** | 打通 Stripe test webhook + Firestore test namespace | 问题 3、7 | 解决「付款后不上榜」和 localhost 污染真实数据 |
| **P0** | 定触发模型（建议放弃猜 spinner） | 问题 1 | 产品能否做出来的前提 |
| P1 | 修正 `/api/funds/checkout` 仪表盘充值路径 | 问题 5 | 补 redirect URL、ownership 校验、route tests |
| P1 | 删除或开关 LearnX mock data | 问题 6 | 避免本地调试被 seed 广告干扰 |
| P1 | 简化/砍掉 spinner 猜测代码 | 问题 1 的代码面 | 依赖 P0 触发模型决策 |
| P2 | 累计型计费改造 | 问题 4 | 待触发模型定 |
| P2 | 用户行为 telemetry | 新增 | 反机器人强化 |

---

## 附：诊断时验证过的关键事实
- `.env` 实际值：`SPINSHARE_MODE=local` / `AUTH_MODE=oauth` / `STRIPE_MODE=test` / `SPINSHARE_COUNTER=rtdb`（矛盾组合）。
- `container.ts:158` `useFirestoreInLocal()` 在当前配置下返回 false → 本地走内存 repo。
- `container.ts:217` 本地 + dev → `seedLocalTestData()` 灌假数据。
- `seed-local-data.ts:102-113` 会 seed LearnX funded campaign，容易干扰本地排行榜判断。
- `collections.ts:18-24` 集合名固定为 `users/campaigns/ledgerEntries/paymentEvents`，当前没有 Firestore test namespace。
- 主页公开付款走 `/api/advertiser-checkout`（`advertiser-checkout-form.tsx`、`page.tsx`），真实 Stripe test/live 需要 webhook 才会把 budget 加到 campaign。
- 广告商仪表盘 Add Funds 走 `/api/funds/checkout`（`campaign-list.tsx:100-110`），这条不是死代码，但目前不完整。
- 相关测试已通过：`advertiser-checkout/route.test.ts`、`market/route.test.ts`、`webhooks/stripe/route.test.ts` 共 9 个测试。
- `WaitStateTracker`（`wrap.ts:48`）连续型逻辑，与你要的累计型不符。
- 代码无 TODO/FIXME/HACK 标记——不是半成品堆砌，是设计决策导致的问题。

## 附：关键文件索引
| 想看什么 | 去哪里 |
|----------|--------|
| 资金分成算法 | `packages/core/src/money.ts` → `computeSplit` |
| 竞价选择 | `packages/core/src/bidding.ts` → `selectWinner` |
| 反欺诈/速度窗口 | `packages/core/src/velocity.ts` |
| 领域类型与 API 契约 | `packages/core/src/types.ts` |
| 账本引擎（服务端） | `web/src/server/ledger-service.ts` |
| 容器/适配器选择（env 矛盾点） | `web/src/server/container.ts` |
| 竞价路由 | `web/src/app/api/ad/route.ts` |
| 上报路由 | `web/src/app/api/track/route.ts` |
| 主页公开充值 | `web/src/app/api/advertiser-checkout/route.ts` |
| 仪表盘 Add Funds 充值 | `web/src/app/api/funds/checkout/route.ts` |
| Stripe webhook 入账 | `web/src/app/api/webhooks/stripe/route.ts` |
| 主页排行榜 API | `web/src/app/api/market/route.ts` |
| Firestore collection 命名 | `web/src/server/adapters/firestore/collections.ts` |
| LearnX 本地 seed | `web/src/server/dev/seed-local-data.ts` |
| CLI spinner 拦截 | `cli-wrapper/src/renderer.ts` |
| CLI 子进程包装 | `cli-wrapper/src/wrap.ts` |
| CLI 登录流程 | `cli-wrapper/src/login.ts` |
| 扩展入口 | `vscode-extension/src/extension.ts` |
| 扩展广告控制器 | `vscode-extension/src/ad-controller.ts` |
| 扩展终端自动包装 | `vscode-extension/src/terminal-auto-wrap.ts` |
| 原始产品规格 | `docs/project_architecture.md` |
| 生产自测指南 | `docs/production-test-guide.md` |
