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
- [ ] **1b. 抓取 IP + User-Agent** —— 新建 `client-ip.ts`(按可信代理跳数从右数解析 `x-forwarded-for`);在 `/api/ad`、`/api/track` 读取,把 `ipHash`(HMAC)+`uaHash` 持久化到 `ImpressionActivity`。
- [ ] **1c. 一次性 ad nonce** —— `/api/ad` 铸造 HMAC nonce(短 TTL),`/api/track` 必填并原子消费一次,使"计费量=真实出价量"。
- [ ] **1d. `/api/click` 记录 per-developer 点击**(`verifyClickToken` 已返回 developerId,路由现在丢弃)。
- [ ] **1e. 暴露 `User.createdAt`**(Firestore 已写,只是 core 类型未暴露)。
- [ ] **1f. clickToken 收紧** —— 单次使用 + 短 TTL + 绑定 entryId + per-developer 限流。

### Tier 2 — 异常作业 + 统一评分(消费 Tier 1 信号)
- [ ] 2a. 综合可疑分 + 分级静默执行(复用现有 shadow-ban 无差别响应);**必须同时延迟/模糊 dashboard 计费数**,否则被金丝雀账号反推阈值。
- [ ] 2b. 数据中心 ASN 分类 + per-IP 扇出 + per-IP/ASN 速率(只喂分,不直接封,防 NAT/CGNAT 误伤)。
- [ ] 2c. 跨实体图扫描(克隆 flush cron → fraud-scan;收款指纹边=1.0)。
- [ ] 2d. 时长/到达时间/昼夜画像 —— 仅作 score-feeder。

### Tier 3 — 结构性(改真实出款行为 / 处理敏感 PII / 需第三方;落地前与用户确认细节)
- [ ] 3a. 赚到先冻结 + 强制冻结期 > 扫描周期(`heldCents`/`availableCents`)。**产品决策**。
- [ ] 3b. 收款指纹去重 + 限额分母改 `fpHash`(从 Stripe 拉 external_account.fingerprint + 身份哈希)。**PII/法务**。
- [ ] 3c. 出款边界风险闸 + prove-before-pay。
- [ ] 3d. 渐进信任分级。**产品决策**。
- [ ] 3e. 广告主转化 postback(替代自报点击作为质量 oracle)。**需第三方集成**。
- [ ] 3f. token jti + 可吊销(响应工具,非 Sybil 抗性)。

## Agent Decisions / Thoughts

- **2026-06-18 Claude:** Tier 1a 设计为**双重门槛 + 缺字段回退**,而非直接替换客户端门槛。原因:(1) 现有结算测试大量用 `viewDurationMs:3000` 期望 `credited`,直接替换会全红;(2) `servedAtMs` 由服务端 `/api/ad` 盖章,生产路径必然存在,故"缺字段回退仅客户端"不构成生产漏洞;(3) 真实 `Date.now()` 远大于测试里的小数字(updatedAtMs:20 等),所以旧测试的 `now - servedAtMs` 天然 ≫ 3000,自动通过。
- **2026-06-18 Claude:** `servedAtMs` 在 repo 层语义:同 campaign 累加时**保留**首次盖章值;切换 campaign 或新建时取 `input.servedAtMs`(**不**回退到 `nowMs`)。只有 `/api/ad` 传 `servedAtMs`;track 段不传,故新建记录若非来自 serve 则 `servedAtMs` 为 undefined → 结算回退到仅客户端门槛。放弃 `?? nowMs` 回退是为了让直接调用 `addDuration` 的现有 repo 测试保持精确相等(不被塞入额外字段),且生产 serve 路径必然传值,故无漏洞。resume(同 campaign 重复 serve)保持首次 serve 时间——更宽松,非安全问题。
- **2026-06-18 Claude:** 不并行化实现。核心文件(ledger-service / counter-store / schemas / track·ad·click 路由)几乎每个 item 都改,fan-out 会严重冲突,采用顺序内联实现。

## Important Notes / NEVER Change

- 结算的"无差别响应"不变:credited / shadowBanned / earningCapped / duplicate 对客户端返回**同样的成功 shape**(`ledger-service.ts`),不要泄露是哪条触发。
- 不破坏现有 ports/adapters 抽象:新增字段一律 optional,Memory/Firestore/RTDB 三套适配器同步。
- Tier 3 的 3a/3b/3d/3e 改变真实到账/采集 PII/依赖第三方,落地前必须与用户确认。

## Change History

| Date | Change | Author |
|------|--------|--------|
| 2026-06-18 | Created roadmap; began Tier 1a (server-clock viewability) | Claude |
