---
name: agent-browser
description: 面向 AI 代理的浏览器自动化 CLI。用于网站导航、表单填写、按钮点击、截图、数据提取、Web 应用测试等浏览器任务。
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)
hidden: true
---

# 浏览器自动化

面向 AI 代理的快速浏览器自动化 CLI。通过 CDP 连接 Chrome/Chromium，提供无障碍树快照和紧凑的 `@eN` 元素引用。

安装：`npm i -g agent-browser && agent-browser install`

##从这里开始

本文件是发现存根，而非使用指南。在运行任何 `agent-browser` 命令之前，请从 CLI 加载实际的工作流内容：

```bash
agent-browser skills get core             # 从这里开始 — 工作流、常见模式、故障排除
agent-browser skills get core --full      # 包含完整的命令参考和模板
```

CLI 提供的技能内容始终与已安装版本匹配，因此说明永不过期。本存根中的内容在不同版本之间保持不变，这就是为什么它只是指向 `skills get core`。

## 专业化技能

当任务超出浏览器网页范围时，加载专业化技能：

```bash
agent-browser skills get electron          # Electron 桌面应用（VS Code、Slack、Discord、Figma 等）
agent-browser skills get slack             # Slack 工作区自动化
agent-browser skills get dogfood           # 探索性测试 / QA / Bug 排查
agent-browser skills get vercel-sandbox    # Vercel Sandbox 微虚拟机中的 agent-browser
agent-browser skills get agentcore         # AWS Bedrock AgentCore 云浏览器
```

运行 `agent-browser skills list` 查看已安装版本的所有可用内容。

## 为什么选择 agent-browser

- 快速的原生 Rust CLI，而非 Node.js 封装
- 兼容任意 AI 代理（Cursor、Claude Code、Codex、Continue、Windsurf 等）
- 通过 CDP 连接 Chrome/Chromium，无须 Playwright 或 Puppeteer 依赖
- 带元素引用的无障碍树快照，实现可靠交互
- 会话管理、认证保险库、状态持久化、视频录制
- 专业化技能支持 Electron 应用、Slack、探索性测试、云服务商

## 可观测性仪表板

仪表板独立于浏览器会话运行在 4848 端口，也可通过代理或转发 URL 访问，如 `https://dashboard.agent-browser.localhost`。代理应保持在仪表板源站：会话标签页、状态和流量通过内部代理，因此无需暴露会话端口。
