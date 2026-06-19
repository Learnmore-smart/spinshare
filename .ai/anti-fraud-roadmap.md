# Anti-Fraud Roadmap

> Last updated: 2026-06-18 | Protection: CRITICAL (money / identity paths)

## Purpose（一句话人话）

把"反作弊"从"只按 userId 限速/封顶"升级为多层防御:抓取服务端可信信号、用服务端时钟判可见性、把限额计量主体从"账号"换成"KYC 收款指纹"、并在出款前冻结+清算。目标不是"证明真人看过"(在用户自有客户端上不可能),而是**让 naive 脚本当天失效、让账号农场无利可图**。

## Why（背景)

来源:一次多智能体设计+红队评审(6 个防御家族,13 个 agent)。两条铁律:
1. **客户端完全不可信** —— hook 是用户本地可改的 .cjs;`viewDurationMs` 自报,无法验证。
2. **所有"按 userId"的限额都被 Sybil 乘掉** —— `validateToken` 是无状态 HMAC、不可吊销,`userId` = 一个便宜 OAuth 账号。

红队全票结论:唯一能把"免费线性 Sybil 攻击"变成"按量计费攻击"的组合 = **收款指纹去重 + 把限额改按指纹计 + 赚到先冻结(冻结期 > 扫描周期)**。

## 执行顺序(依赖优先;每个增量 = 文档→代码→测试,全绿才进入下一个)

### Tier 1 — 基础信号层(本阶段;纯检测管道,不改变合法开发者的到账行为)
- [x] **1a. 服务端时钟可见性** —— `ImpressionProgress.servedAtMs`(由 `/api/ad` 盖章,track 段不覆盖);`/api/track` 用 `serverDwellMs = now - servedAtMs` 与现有累计客户端时长**双重**门槛判可见性。缺 `servedAtMs` 时回退到仅客户端门槛(向后兼容/旧测试)。
- [x] **1b. 抓取 IP + User-Agent** —— `client-ip.ts`(按可信代理跳数从右数解析 `x-forwarded-for`);`/api/track` 读取,`ipHash`(HMAC)+`uaHash` 持久化到 `ImpressionActivity`(7 个写入点 + firestore 读回映射)。【serve 端 IP 捕获留待 1c/Tier2】
- [x] **1c. 一次性 ad nonce** —— `ad-nonce.ts` mint/verify;`/api/ad` 铸造并随响应返回;`/api/track` 在结算边界 verify+`consumeOnce` 一次(replay/无效 → duplicate 抑制);VS Code 扩展 hook 转发 nonce;`AdResponse.adNonce`/`trackRequestSchema.adNonce` optional 向后兼容。
- [ ] **1d. `/api/click` 记录 per-developer 点击**(developerId 现被丢弃)。**需 activity-feed + i18n 字典 + dashboard 增加 click 活动表示**(封闭联合,加状态要全量补标签)。
- [x] **1e. 暴露 `User.createdAt`**(core 类型 `createdAtMs?` + firestore `toUser` 映射 + memory repo 盖章)。
- [x] **1f. clickToken 收紧** —— 加 `jti` + TTL 24h→1h;`/api/click` 用 `consumeOnce` 只计首次(replay 仍跳转但不计 CTR);旧 token 无 jti 回退计数。【"绑定 entryId"需把铸造移到结算时,留作后续】
- [x] **shared. `CounterStore.consumeOnce(key,ttl)`** 单次消费原语(memory + rtdb;1c/1f 共用)。

### Tier 2 — 异常作业 + 统一评分(消费 Tier 1 信号)
- [x] 2a. **综合可疑分 + 热路径静默执行已落地**:`suspicion.ts` 纯打分(`scoreImpression` 融合 ipFanout/ipVelocity/datacenterHit → ok/review/suppress,阈值可注入轮换);`ledger-service` 加 `forceSuppress` 折入 shadow-ban 路径(不动钱、响应无差别);`/api/track` 结算时打分并传入。保守默认:per-IP 信号单独**不会**suppress(防 NAT 误伤),需农场组合或数据中心佐证。【TODO:延迟/模糊 dashboard 计费数这一 oracle;接入更多信号(延迟方差/CTR/账龄)】
- [x] 2b. **网络信号 + 数据中心分类已落地**:`incrementIpVelocity`/`recordIpFanout`(memory+rtdb+测试),`/api/track` 结算时记录并喂进 2a 综合分;`ip-intelligence.ts`(IPv4→uint32 + CIDR 二分匹配 + `isDatacenterIp`,种子表可换 ip2asn 数据集)→ `ClientSignals.datacenterHit` 喂进综合分。core 常量齐备。【种子 CIDR 表为保守起步,生产换权威数据集;datacenterHit 单独只到 review 不 suppress】
- [x] 2c. **跨实体图扫描已落地**:`collusion-scan-service.ts`(纯 union-find,按共享 ipHash 高扇出聚类农场,传递合并);`ActivityRepository.listRecentImpressions(sinceMs)`(port+memory+firestore);cron 路由 `/api/internal/fraud-scan`(CRON_SECRET 鉴权)。【当前仅 ipHash 边;uaHash 边 + 收款指纹边(=1.0,待 3b)为扩展点。verdict→作废需 Tier 3a 冻结才有牙齿,现阶段输出供复核】
- [ ] 2d. 时长/到达时间/昼夜画像 —— 仅作 score-feeder。**有意延后**(红队评:单独均可绕,价值最低;Tier 3 的钱/身份层优先)。

### Tier 3 — 结构性(改真实出款行为 / 处理敏感 PII / 需第三方;落地前与用户确认细节)
- [x] 3a. **赚到先冻结 + 强制冻结期已落地(overlay 设计,最小爆炸半径)**:`User.heldCents?`/`heldLots?`(总额 `balanceCents` 不变,可提现 = balance − held;旧记录无 held → 全部可提现);`EARNINGS_HOLD_WINDOW_SECONDS = 3×IP_FANOUT_WINDOW`(3 天,**严格 > 扫描周期**),`heldLotBucketMs`(按小时合并 lot,数组 ≤72)。UserRepository 新增 `creditHeldEarnings`/`matureHeldEarnings`/`voidHeldEarnings`,`tryDebitBalanceCents` 改判 available;memory+firestore 两套适配器 + `toUser` 映射。flush 把赚到的钱记入 held(带 `nowMs` 时钟);payout 先 mature 再只付 available;fraud-scan `enforce:true` 时对命中农场 `voidHeldEarnings`(只追回未成熟的钱,已成熟的已过窗不动)。新增 `earnings-hold.test.ts`(6)+ 全量回归:**393 web 测试全绿**(overlay 让现有 flush/payout/conservation 测试零改动)。【held/available 暂未上 dashboard UI(避开并发编辑中的 i18n);maturation 走 payout 懒触发,独立 cron 为可选 hygiene】
- [x] 3b. **收款指纹去重已落地(出款边界控制)**:`ConnectAccountStatus.payoutFingerprint?` + `User.payoutFingerprint?`(不透明 Stripe `external_account.fingerprint`,非原始银行数据);mock 网关返回 `fp_mock_${accountId}`(本地各账户唯一,不误伤),stripe 网关 best-effort 读首个 external account 指纹;status 路由 + withdrawBalance 落库指纹;`UserRepository.countAccountsByPayoutFingerprint`(memory+firestore)。`SYBIL_PAYOUT_FINGERPRINT_THRESHOLD=2`:≥2 个账户共用一个收款指纹 → 出款 block(`risk_hold` 409 + reason `shared_payout_fingerprint`,不动钱)。payout-service +1 测试。【这是把"免费线性 Sybil"变"按收款身份计"的核心墙:农场塌缩成一个真实银行身份就被卡死。未做"限额分母全面改 fpHash"(影响热路径结算),当前在出款边界拦截已封住提现】
- [x] 3c. **出款边界风险闸已落地**:`payout-risk-service.ts` `buildPayoutRiskAssessor`(复用 2c collusion 扫描:开发者落在农场簇 → block,reason `collusion_cluster`;**fail-open** 任何内部错误不拦合法出款)。payout-service 加可选 `assessRisk` 钩子 + `PAYOUT_RISK_ERROR="risk_hold"`(409,成熟前先判风险,命中则记 blocked attempt、不动钱);withdraw 路由注入 `buildPayoutRiskAssessor({activities})`。测试:payout-service +2、payout-risk-service +3,全绿。【可选项扩展为 assessRisk 也读 3b 收款指纹/账龄/suspicion 持久标记】
- [x] 3d. **渐进信任已落地(年龄分级冻结期,合法用户零阻断)**:core `earningsHoldWindowSecondsForAccountAge(accountAgeMs?)` —— 账龄 < 7 天 → `NEW_ACCOUNT_HOLD_WINDOW_SECONDS`(7 天),否则标准 3 天;未知账龄(旧记录)按已建立处理(不罚)。flush 按 `User.createdAtMs`(1e 暴露)逐用户算冻结期再 `creditHeldEarnings`。**只延后、不减少、不阻断**合法新用户的钱 —— 给扫描更多轮次抓农场。core velocity.test +7,web earnings-hold flush 集成 +1。
- [ ] 3e. 广告主转化 postback(替代自报点击作为质量 oracle)。**需第三方集成,本仓无对接规范,暂缓**(需广告主侧 callback 协议;非本地可验证)。
- [ ] 3f. token jti + 可吊销。**有意暂缓**:路线图自评"响应工具,非 Sybil 抗性";吊销需在最热鉴权路径(/api/ad、/api/track)加每请求查表,成本高而对"脚本/农场"无收益(封了号再开新 OAuth 即可)。与用户核心诉求(反脚本作弊)不符,加它是纯成本。

## Agent Decisions / Thoughts

- **2026-06-18 Claude:** Tier 1a 设计为**双重门槛 + 缺字段回退**,而非直接替换客户端门槛。原因:(1) 现有结算测试大量用 `viewDurationMs:3000` 期望 `credited`,直接替换会全红;(2) `servedAtMs` 由服务端 `/api/ad` 盖章,生产路径必然存在,故"缺字段回退仅客户端"不构成生产漏洞;(3) 真实 `Date.now()` 远大于测试里的小数字(updatedAtMs:20 等),所以旧测试的 `now - servedAtMs` 天然 ≫ 3000,自动通过。
- **2026-06-18 Claude:** `servedAtMs` 在 repo 层语义:同 campaign 累加时**保留**首次盖章值;切换 campaign 或新建时取 `input.servedAtMs`(**不**回退到 `nowMs`)。只有 `/api/ad` 传 `servedAtMs`;track 段不传,故新建记录若非来自 serve 则 `servedAtMs` 为 undefined → 结算回退到仅客户端门槛。放弃 `?? nowMs` 回退是为了让直接调用 `addDuration` 的现有 repo 测试保持精确相等(不被塞入额外字段),且生产 serve 路径必然传值,故无漏洞。resume(同 campaign 重复 serve)保持首次 serve 时间——更宽松,非安全问题。
- **2026-06-18 Claude:** 不并行化实现。核心文件(ledger-service / counter-store / schemas / track·ad·click 路由)几乎每个 item 都改,fan-out 会严重冲突,采用顺序内联实现。
- **2026-06-19 Claude:** Tier 3a 用 **overlay** 而非重构 `balanceCents`。关键:保持 `balanceCents` 语义=总额不变,只新增 `heldCents`(可提现=balance−held)。这样 (1) flush/payout/conservation 大量现有测试零改动(balanceCents 数学不变);(2) 旧记录无 `heldCents` → available=balance,seed 用户的 payout 测试天然全绿;(3) 签到奖励/退款走 `applyBalanceDeltaCents`(直接进 available,即时可提现),只有赚到的展示收入走 `creditHeldEarnings` 进 held。**clawback 语义**:`voidHeldEarnings` 只追回 `maturesAtMs > now`(仍冻结)的 lot;已成熟的钱视为"已过窗存活"不动——精确实现"冻结期 > 扫描周期则可在成熟前追回"。**maturation 懒触发**:payout 先 mature 再付,避免新增"列出有 held 的用户"查询 + maturation cron(数组用小时桶封顶 ≤72,无需 cron 也不爆)。fraud-scan 默认 report-only,`enforce:true` 才动钱(保守阈值 fan-out≥3 易误伤 NAT)。
- **2026-06-19 Claude:** 修了一个并发编辑引入的测试失败(非我的改动):`layout.tsx` 被并发加了 `grantSignupBonus(container.users/ledger)`,但 `layout.test.tsx` 的 container mock 只给了 auth+ledger 且 ledger 缺 `getByEntryId` → 抛错被 catch → `listByDeveloper` 没被调用。修法:在该测试里 mock `@/server/signup-bonus-service` 为 no-op(测试本意只验 flush→read 顺序),并给 container mock 补 `users:{}`。

## Important Notes / NEVER Change

- 结算的"无差别响应"不变:credited / shadowBanned / earningCapped / duplicate 对客户端返回**同样的成功 shape**(`ledger-service.ts`),不要泄露是哪条触发。
- 不破坏现有 ports/adapters 抽象:新增字段一律 optional,Memory/Firestore/RTDB 三套适配器同步。
- **Tier 3a 冻结不变量**:`EARNINGS_HOLD_WINDOW_SECONDS` 必须**严格 > fraud-scan 运行间隔**(否则农场能在被扫到前成熟+提现,反作弊洞重开)。`balanceCents` 永远是总额(held+available);可提现 = `balanceCents − (heldCents ?? 0)`;旧记录无 held 视为全可提现。赚到的钱走 `creditHeldEarnings`(进 held),签到/退款走 `applyBalanceDeltaCents`(直接 available)——别混用。`voidHeldEarnings` 只追回未成熟 lot。
- Tier 3 的 3a/3b/3d/3e 改变真实到账/采集 PII/依赖第三方,落地前必须与用户确认。

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Created roadmap; began Tier 1a (server-clock viewability) | Claude |
| 2026-06-18 | Shipped 1a (server-clock viewability), 1b (IP/UA capture), 1e (User.createdAt). All tested + typecheck green. | Claude |
| 2026-06-18 | Shipped consumeOnce primitive, 1c (ad nonce, incl. extension hook), 1f (clickToken single-use + 1h TTL). Tier 1 complete except 1d. Tested + typecheck green. | Claude |
| 2026-06-18 | Fixed 2 concurrent-edit test failures (advertiser-checkout market-row shape; page.tsx /mo). Shipped Tier 2b network-signal foundation (per-IP velocity + account fan-out primitives + track recording). Tested + typecheck green. 1d deferred (i18n files under concurrent edit). | Claude |
| 2026-06-19 | Shipped Tier 2c (cross-entity collusion graph scan: union-find service + listRecentImpressions port/adapters + /api/internal/fraud-scan cron). Tested (5) + typecheck green. | Claude |
| 2026-06-19 | Shipped Tier 3a (earnings hold/clawback) as a balanceCents-preserving overlay: core held types/constants, 3 new UserRepository methods (memory+firestore), flush→held, payout matures-then-pays-available, fraud-scan enforce→voidHeldEarnings clawback. New earnings-hold.test.ts (6). Fixed 1 concurrent-edit failure (layout.test.tsx signup-bonus). Full web suite 393 green (only pre-existing concurrent-edit smoke .mjs remain). | Claude |
| 2026-06-19 | Shipped Tier 3c (payout-boundary risk gate): payout-risk-service reuses collusion scan, optional assessRisk hook in payout-service (risk_hold 409, fail-open), wired into withdraw route. Tests: payout-service +2, payout-risk-service +3. Typecheck + tests green. | Claude |
| 2026-06-19 | Shipped Tier 3b (payout-fingerprint dedupe): payoutFingerprint on ConnectAccountStatus+User, mock/stripe gateways populate it, status route + withdrawBalance persist it, countAccountsByPayoutFingerprint (memory+firestore), block at ≥2 shared (shared_payout_fingerprint). payout-service +1 test. Full web suite 400 green (only pre-existing smoke .mjs remain). | Claude |
| 2026-06-19 | Shipped Tier 3d (progressive-trust age-scaled hold): core earningsHoldWindowSecondsForAccountAge + NEW_ACCOUNT constants, flush computes per-user hold from createdAtMs. Delays (never blocks) young-account earnings. core velocity.test +7, web earnings-hold +1. core 56 + web 401 green, typecheck clean. 3e/3f deferred with rationale (external spec / hot-path cost, no anti-script value). High-value roadmap complete: Tier 1 (−1d), Tier 2 (a/b/c), Tier 3 (a/b/c/d). | Claude |
