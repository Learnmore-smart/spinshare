# SpinShare VS Code 扩展

在 AI 生成等待期间赚取收益。SpinShare 会在 VS Code、Cursor 和 Trae 的 AI 思考等待状态中，以不打扰的方式展示上下文相关广告。

## 功能

- **等待态变现** — AI 思考时，在右下角进度通知中展示广告。
- **浏览器登录** — 一次性设备授权流程，令牌安全存储在编辑器中。
- **点击跳转** — 可直接从通知打开广告主链接。
- **多编辑器兼容** — 基于稳定 VS Code API，支持 VS Code、Cursor、Trae。

## 快速开始

1. 安装扩展（本地 VSIX 或上架后从市场安装）。
2. 首次启动会提示 **登录** — 在浏览器中批准设备授权。
3. AI 生成进入等待态时，SpinShare 可能在右下角展示赞助消息。

### 命令

| 命令 | 说明 |
|------|------|
| `SpinShare: Sign In` | 启动浏览器设备授权 |
| `SpinShare: Sign Out` | 清除已保存的令牌 |
| `SpinShare: Start Generation (show ad)` | 手动触发广告（测试用） |
| `SpinShare: Complete Generation (dismiss ad)` | 关闭当前广告通知 |

## 配置

| 设置 | 默认值 | 说明 |
|------|--------|------|
| `spinshare.baseUrl` | `https://spinshare.dev` | SpinShare 网站根地址 |

## 隐私

使用设备码流程登录。仅在广告实际展示时上报展示。详见 [spinshare.dev/privacy](https://spinshare.dev/privacy)。

## 相关产品

SpinShare 还提供面向终端 AI 工具的 **CLI 封装**（`@spinshare/cli`）—— 独立产品，不包含在本扩展中。

## 支持

问题与反馈：[support@spinshare.dev](mailto:support@spinshare.dev)
