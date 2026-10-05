# 性能剖析

在浏览器自动化期间捕获 Chrome DevTools 性能剖析数据，用于性能分析。

**相关**：[commands.md](commands.md) 查看完整命令参考，[SKILL.md](../SKILL.md) 查看快速开始。

## 目录

- [基本性能剖析](#基本性能剖析)
- [Profiler 命令](#profiler-命令)
- [类别](#类别)
- [使用场景](#使用场景)
- [输出格式](#输出格式)
- [查看剖析结果](#查看剖析结果)
- [限制](#限制)

## 基本性能剖析

```bash
# 开始剖析
agent-browser profiler start

# 执行操作
agent-browser navigate https://example.com
agent-browser click "#button"
agent-browser wait 1000

# 停止并保存
agent-browser profiler stop ./trace.json
```

## Profiler 命令

```bash
# 使用默认类别开始剖析
agent-browser profiler start

# 使用自定义 trace 类别开始
agent-browser profiler start --categories "devtools.timeline,v8.execute,blink.user_timing"

# 停止剖析并保存到文件
agent-browser profiler stop ./trace.json
```

## 类别

`--categories` 标志接受逗号分隔的 Chrome trace 类别列表。默认类别包括：

- `devtools.timeline` -- 标准 DevTools 性能 trace
- `v8.execute` -- 运行 JavaScript 所花的时间
- `blink` -- 渲染器事件
- `blink.user_timing` -- `performance.mark()` / `performance.measure()` 调用
- `latencyInfo` -- 输入到延迟的跟踪
- `renderer.scheduler` -- 任务调度与执行
- `toplevel` -- 广谱基础事件

还包含若干 `disabled-by-default-*` 类别，用于获取详细的时间线、调用栈和 V8 CPU 剖析数据。

## 使用场景

### 诊断页面加载缓慢

```bash
agent-browser profiler start
agent-browser navigate https://app.example.com
agent-browser wait --load networkidle
agent-browser profiler stop ./page-load-profile.json
```

### 剖析用户交互

```bash
agent-browser navigate https://app.example.com
agent-browser profiler start
agent-browser click "#submit"
agent-browser wait 2000
agent-browser profiler stop ./interaction-profile.json
```

### CI 性能回归检查

```bash
#!/bin/bash
agent-browser profiler start
agent-browser navigate https://app.example.com
agent-browser wait --load networkidle
agent-browser profiler stop "./profiles/build-${BUILD_ID}.json"
```

## 输出格式

输出是 Chrome Trace Event 格式的 JSON 文件：

```json
{
  "traceEvents": [
    { "cat": "devtools.timeline", "name": "RunTask", "ph": "X", "ts": 12345, "dur": 100, ... },
    ...
  ],
  "metadata": {
    "clock-domain": "LINUX_CLOCK_MONOTONIC"
  }
}
```

`metadata.clock-domain` 字段根据宿主平台（Linux 或 macOS）设置。在 Windows 上会省略。

## 查看剖析结果

在以下任一工具中加载输出的 JSON 文件：

- **Chrome DevTools**：Performance 面板 > Load profile（Ctrl+Shift+I > Performance）
- **Perfetto UI**：https://ui.perfetto.dev/ -- 拖放 JSON 文件
- **Trace Viewer**：任意 Chromium 浏览器中的 `chrome://tracing`

## 限制

- 仅适用于基于 Chromium 的浏览器（Chrome、Edge）。不支持 Firefox 或 WebKit。
- 剖析期间 trace 数据会累积在内存中（上限为 500 万个事件）。关注区域结束后应尽快停止剖析。
- 停止时的数据收集有 30 秒超时。如果浏览器无响应，stop 命令可能失败。
