# Tasks

- [x] Task 1: 创建 HeroDashboardCard 组件
  - [x] SubTask 1.1: 在 `web/src/components/HeroDashboardCard.tsx` 创建组件
  - [x] SubTask 1.2: 组件使用 `liquid-glass` 样式卡片
  - [x] SubTask 1.3: 组件内包含：状态标签、收益金额（3D渐变字）、描述文字、微型面积图、底部统计行
  - [x] SubTask 1.4: 微型面积图使用 recharts AreaChart，绿色渐变，无坐标轴，仅视觉展示

- [x] Task 2: 重构 Hero 布局为左右双栏
  - [x] SubTask 2.1: 修改 `page.tsx` Hero section，将文案和 CTA 保留在左侧
  - [x] SubTask 2.2: 在右侧引入 `<HeroDashboardCard />`
  - [x] SubTask 2.3: 修改 `home.css` 中 `.spinshare-hero-layout` 的 grid 规则，实现桌面双栏/移动堆叠

- [x] Task 3: 下移现有 process-panel 至新 section
  - [x] SubTask 3.1: 将现有 `spinshare-process-panel`（Claude 状态 + 广告展示）从 Hero 内移出
  - [x] SubTask 3.2: 在 Hero 下方新建 section，标题 "等待过程，如何变现"
  - [x] SubTask 3.3: 将 process-panel 放入该 section，保持原有功能和样式

- [x] Task 4: 验证构建与视觉
  - [x] SubTask 4.1: 运行 `npm run build 2>&1` 检查无编译错误
  - [x] SubTask 4.2: 在浏览器中检查 Hero 双栏布局、仪表盘卡片、下移后的 process-panel
