# Hero 仪表盘与布局重构 Spec

## Why
当前首页 Hero 区域只有左侧文案，缺少参考设计中的右侧收益仪表盘卡片，整体视觉重心偏左、留有空洞。需要模仿目标设计，在 Hero 添加右侧仪表盘组件，并将现有流程面板、CTA 等元素按新布局重新排布。

## What Changes
- 在 Hero 区域新增右侧 `HeroDashboardCard` 组件（显示实时收益、微型图表、状态标签）
- 将 Hero 布局改为左右两栏（左文案 + 右仪表盘），移动端垂直堆叠
- 将现有的 `spinshare-process-panel`（Claude 状态 ↔ 广告展示双栏）下移至 Hero 下方，作为"等待过程，如何变现"的视觉展示
- 将主 CTA 按钮组保留在 Hero 左侧文案下方
- 保持 `theme.css` 所有颜色/变量不变，仅使用现有 token

## Impact
- 受影响文件：
  - `web/src/app/page.tsx`
  - `web/src/app/home.css`
- 新增文件：
  - `web/src/components/HeroDashboardCard.tsx`

## ADDED Requirements

### Requirement: Hero 右侧仪表盘卡片
The system SHALL 在 Hero 区域右侧渲染一个 `HeroDashboardCard` 组件。

#### Scenario: 桌面端
- **WHEN** 视口宽度 >= 1024px
- **THEN** Hero 区域为两栏网格：左侧文案占约 55%，右侧仪表盘卡片占约 45%，垂直居中对齐

#### Scenario: 移动端
- **WHEN** 视口宽度 < 1024px
- **THEN** 仪表盘卡片在文案下方垂直堆叠，宽度 100%

#### Scenario: 仪表盘内容
- **WHEN** 组件渲染
- **THEN** 卡片内显示：
  1. 顶部状态标签（如 "实时收益" + 绿色脉冲点）
  2. 大字号收益金额（如 `+$3,012`），使用 `spinshare-hero-highlight-3d` 渐变文字样式
  3. 一句话描述（如 "本月预估收益"）
  4. 一个微型面积图（使用 recharts，高 80px，绿色渐变填充）
  5. 底部一行小统计（如 "今日 +$128"、"广告数 4"）

#### Scenario: 主题一致性
- **WHEN** 渲染仪表盘卡片
- **THEN** 使用现有 `liquid-glass` 或 `liquid-glass-light-green` 样式，不引入新颜色

## MODIFIED Requirements

### Requirement: Hero 布局
The system SHALL 将现有 Hero 区域从单栏改为双栏布局。

#### Scenario: 桌面端
- **WHEN** 渲染首页 Hero
- **THEN** `spinshare-hero-layout` 使用 `grid-template-columns: minmax(0, 1fr) minmax(0, 0.9fr)`，两栏间距 2rem
- **AND** 左侧包含：标题、副标题、主/次 CTA 按钮
- **AND** 右侧包含：HeroDashboardCard

#### Scenario: 流程面板位置
- **WHEN** 渲染首页
- **THEN** 现有的 `spinshare-process-panel`（Claude 状态与广告展示双栏）下移至 Hero 下方的新独立 section 中
- **AND** 该 section 标题为 "等待过程，如何变现"

## REMOVED Requirements
- 无移除需求，仅移动/重组现有元素
