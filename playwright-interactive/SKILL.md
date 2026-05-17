---
name: playwright-interactive
description: 通过 `js_repl` 实现持久化浏览器和 Electron 交互，用于快速迭代式 UI 调试。
---

# Playwright 交互

使用持久的 `js_repl` Playwright 会话来调试本地 Web 或 Electron 应用，跨迭代保持相同的句柄活跃，并在不重启整个工具链的情况下运行功能和视觉 QA，除非进程所有权发生了变化。

## 前置条件

- 此技能必须启用 `js_repl`。
- 如果 `js_repl` 缺失，在 `~/.codex/config.toml` 中启用它：

```toml
[features]
js_repl = true
```

- 您也可以用 `--enable js_repl`（等同于 `-c features.js_repl=true`）启动新会话。
- 启用 `js_repl` 后，启动新的 Codex 会话以刷新工具列表。
- 目前，使用禁用沙箱的方式运行此工作流程：用 `--sandbox danger-full-access` 启动 Codex（或 `sandbox_mode=danger-full-access` 的等效配置）。这是临时要求，因为 `js_repl` + Playwright 在沙箱内的支持仍在完成中。
- 从您需要调试的同一项目目录运行设置。
- 将 `js_repl_reset` 视为恢复工具，而不是常规清理。重置内核会销毁您的 Playwright 句柄。

## 一次性设置

```bash
test -f package.json || npm init -y
npm install playwright
# Playwright 交互
# Playwright 交互
# Playwright 交互
# Playwright 交互
node -e "import('playwright').then(() => console.log('playwright import ok')).catch((error) => { console.error(error); process.exit(1); })"
```

如果以后切换到不同的工作区，请在该处重复设置。

## 核心工作流程

1. 在测试之前编写简短的 QA 清单：
   - 从三个来源构建清单：用户请求的需求、您实际实现的用户可见功能或行为，以及您期望在最终响应中提出的声明。
   - 出现在任何这三个来源中的任何内容必须在签收前映射到至少一个 QA 检查。
   - 列出您打算签收的用户可见声明。
   - 列出每个有意义的用户面向控件、模式切换或已实现的交互行为。
   - 列出每个控件或已实现行为可以导致的状态更改或视图更改。
   - 使用这作为功能和视觉 QA 的共同覆盖列表。
   - 对于每个声明或控件-状态对，记下预期的功能检查、必须进行视觉检查的特定状态，以及您期望捕获的证据。
   - 如果需求在视觉上很重要但很主观，请将其转换为可观察的 QA 检查，而不是留作隐含的。
   - 添加至少 2 个探索性或非快乐路径场景，它们可能会暴露脆弱行为。
2. 运行引导单元一次。
3. 在持久性 TTY 会话中启动或确认任何所需的开发服务器。
4. 启动正确的运行时并继续重用相同的 Playwright 句柄。
5. 每次代码更改后，对于仅渲染器更改则重新加载，对于主进程/启动更改则重新启动。
6. 使用正常用户输入运行功能 QA。
7. 运行单独的视觉 QA 通道。
8. 验证视口适配并捕获支持您声明所需的截图。
9. 仅在实际完成任务时清理 Playwright 会话。

## 引导（运行一次）

```javascript
var chromium;
var electronLauncher;
var browser;
var context;
var page;
var mobileContext;
var mobilePage;
var electronApp;
var appWindow;

try {
  ({ chromium, _electron: electronLauncher } = await import("playwright"));
  console.log("Playwright loaded");
} catch (error) {
  throw new Error(
    `Could not load playwright from the current js_repl cwd. Run the setup commands from this workspace first. Original error: ${error}`
  );
}
```

绑定规则：

- 使用 `var` 来共享顶级 Playwright 句柄，因为后续的 `js_repl` 单元会重用它们。
- 下面的设置单元故意使用简短的快乐路径。如果某个句柄看起来失效了，将该绑定设置为 `undefined` 并重新运行单元，而不是到处添加恢复逻辑。
- 每个您关心的表面优先使用一个命名句柄（`page`、`mobilePage`、`appWindow`），而不是从上下文重复发现页面。

共享 Web 帮助函数：

```javascript
var resetWebHandles = function () {
  context = undefined;
  page = undefined;
  mobileContext = undefined;
  mobilePage = undefined;
};

var ensureWebBrowser = async function () {
  if (browser && !browser.isConnected()) {
    browser = undefined;
    resetWebHandles();
  }

  browser ??= await chromium.launch({ headless: false });
  return browser;
};

var reloadWebContexts = async function () {
  for (const currentContext of [context, mobileContext]) {
    if (!currentContext) continue;
    for (const p of currentContext.pages()) {
      await p.reload({ waitUntil: "domcontentloaded" });
    }
  }
  console.log("Reloaded existing web tabs");
};
```

## 选择会话模式

对于 Web 应用，默认使用显式视口，并将本机窗口模式作为单独的验证通道。

- 将显式视口用于常规迭代、断点检查、可重现截图、快照差异和模型辅助本地化。这是默认设置，因为它在机器间是稳定的并避免主机窗口管理器的可变性。
- 当您需要确定性的高 DPI 行为时，保持显式视口并添加 `deviceScaleFactor`，而不是直接切换到本机窗口模式。
- 在需要验证启动窗口大小、操作系统级 DPI 行为、浏览器 chrome 交互或可能依赖于主机显示配置的 bug 时，使用本机窗口模式（`viewport: null`）进行单独的有头通道。
- 对于 Electron，始终假设本机窗口行为。Electron 通过 Playwright 以 `noDefaultViewport` 启动，因此将其视为真实的桌面窗口，并在调整任何尺寸之前检查启动后的大小和布局。
- 当签收同时取决于布局断点和真实桌面行为时，两个通道都做：先用显式视口进行确定性 QA，然后用本机窗口验证进行最终环境特定检查。
- 将切换模式视为上下文重置。不要将视口模拟的 `context` 重用于本机窗口通道，反之亦然；关闭旧的 `page` 和 `context`，然后为新模式创建一个新的。

## 启动或重用 Web 会话

桌面和移动 Web 会话共享相同的 `browser`、帮助函数和 QA 流程。主要区别在于您创建哪个上下文和页面对。

### 桌面 Web 上下文

将 `TARGET_URL` 设置为您正在调试的应用。对于本地服务器，优先使用 `127.0.0.1` 而不是 `localhost`。

```javascript
var TARGET_URL = "http://127.0.0.1:3000";

if (page?.isClosed()) page = undefined;

await ensureWebBrowser();
context ??= await browser.newContext({
  viewport: { width: 1600, height: 900 },
});
page ??= await context.newPage();

await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
console.log("Loaded:", await page.title());
```

如果 `context` 或 `page` 失效了，设置 `context = page = undefined` 并重新运行单元。

### 移动 Web 上下文

当 `TARGET_URL` 已存在时重用它；否则直接设置移动目标。

```javascript
var MOBILE_TARGET_URL = typeof TARGET_URL === "string"
  ? TARGET_URL
  : "http://127.0.0.1:3000";

if (mobilePage?.isClosed()) mobilePage = undefined;

await ensureWebBrowser();
mobileContext ??= await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
mobilePage ??= await mobileContext.newPage();

await mobilePage.goto(MOBILE_TARGET_URL, { waitUntil: "domcontentloaded" });
console.log("Loaded mobile:", await mobilePage.title());
```

如果 `mobileContext` 或 `mobilePage` 失效了，设置 `mobileContext = mobilePage = undefined` 并重新运行单元。

### 本机窗口 Web 通道

```javascript
var TARGET_URL = "http://127.0.0.1:3000";

await ensureWebBrowser();

await page?.close().catch(() => {});
await context?.close().catch(() => {});
page = undefined;
context = undefined;

browser ??= await chromium.launch({ headless: false });
context = await browser.newContext({ viewport: null });
page = await context.newPage();

await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
console.log("Loaded native window:", await page.title());
```

## 启动或重用 Electron 会话

当当前工作区是 Electron 应用且 `package.json` 的 `main` 指向正确的入口文件时，将 `ELECTRON_ENTRY` 设置为 `.`。如果您需要直接针对特定的主进程文件，请使用诸如下面的路径 `./main.js`。

```javascript
var ELECTRON_ENTRY = ".";

if (appWindow?.isClosed()) appWindow = undefined;

if (!appWindow && electronApp) {
  await electronApp.close().catch(() => {});
  electronApp = undefined;
}

electronApp ??= await electronLauncher.launch({
  args: [ELECTRON_ENTRY],
});

appWindow ??= await electronApp.firstWindow();

console.log("Loaded Electron window:", await appWindow.title());
```

如果 `js_repl` 还没有从 Electron 应用工作区运行，launch 时显式传递 `cwd`。

如果应用进程看起来失效了，设置 `electronApp = appWindow = undefined` 并重新运行单元。

如果您已经有一个 Electron 会话，但在主进程、preload 或启动更改后需要一个新的进程，请使用下一节的 restart 单元而不是重新运行这个。

## 迭代期间重用会话

尽可能保持同一会话活跃。

Web 渲染器重新加载：

```javascript
await reloadWebContexts();
```

Electron 渲染器仅重新加载：

```javascript
await appWindow.reload({ waitUntil: "domcontentloaded" });
console.log("Reloaded Electron window");
```

主进程、preload 或启动更改后的 Electron 重启：

```javascript
await electronApp.close().catch(() => {});
electronApp = undefined;
appWindow = undefined;

electronApp = await electronLauncher.launch({
  args: [ELECTRON_ENTRY],
});

appWindow = await electronApp.firstWindow();
console.log("Relaunched Electron window:", await appWindow.title());
```

如果您的启动需要显式 `cwd`，请在此处包含相同的 `cwd`。

默认姿态：

- 保持每个 `js_repl` 单元简短，专注于一次交互突发。
- 重用现有的顶级绑定（`browser`、`context`、`page`、`electronApp`、`appWindow`）而不是重新声明它们。
- 如果您需要隔离，在同一浏览器内创建一个新页面或新上下文。
- 对于 Electron，仅将 `electronApp.evaluate(...)` 用于主进程检查或专用诊断。
- 在原地修复帮助函数错误；除非内核真的坏了，否则不要重置 REPL。

## 检查清单

### 会话循环

- 引导 `js_repl` 一次，然后在迭代之间保持相同的 Playwright 句柄活跃。
- 从当前工作区启动目标运行时。
- 进行代码更改。
- 使用对该更改正确的路径重新加载或重新启动。
- 如果探索揭示了额外的控件、状态或可见声明，请更新共享 QA 清单。
- 重新运行功能 QA。
- 重新运行视觉 QA。
- 仅在当前状态是您正在评估的状态后才捕获最终产物。

### 重新加载决策

- 仅渲染器更改：重新加载现有页面或 Electron 窗口。
- 主进程、preload 或启动更改：重新启动 Electron。
- 对进程所有权或启动代码的新不确定性：重新启动而不是猜测。

### 功能 QA

- 使用真实的用户控件进行签收：键盘、鼠标、点击、触摸或等效的 Playwright 输入 API。
- 验证至少一个端到端关键流程。
- 确认该流程的可见结果，而不仅仅是内部状态。
- 对于实时或动画密集型应用，在实际交互计时下验证行为。
- 通过共享 QA 清单而不是临时抽查来工作。
- 在签收前至少一次覆盖每个显而易见的可见控件，而不仅仅是主要的快乐路径。
- 对于清单中的可逆控件或状态切换，测试完整周期：初始状态、更改状态，然后返回初始状态。
- 脚本检查通过后，进行简短的探索性通道，使用正常输入 30-90 秒，而不是仅遵循预期路径。
- 如果探索性通道揭示了新状态、控件或声明，请将其添加到共享 QA 清单并在签收前覆盖它。
- `page.evaluate(...)` 和 `electronApp.evaluate(...)` 可以检查或暂存状态，但它们不计入签收输入。

### 视觉 QA

- 将视觉 QA 视为与功能 QA 分开。
- 使用在测试前定义的共享 QA 清单并在 QA 期间更新；不要从不同的隐含列表开始视觉覆盖。
- 重申用户可见的声明并明确验证每一个；不要假设功能通道证明视觉声明。
- 用户可见的声明在它被感知到的特定状态下经过检查之前不能签收。
- 在滚动之前检查初始视口。
- 确认初始视图明显支持界面的主要声明；如果核心承诺元素在那里不明显可感知，将其视为 bug。
- 检查所有需要的可见区域，而不仅仅是主要的交互表面。
- 检查共享 QA 清单中已列举的状态和模式，包括至少一个有意义的交互后状态（当任务是交互式的时）。
- 如果运动或过渡是体验的一部分，除了已解决的端点外，还要检查至少一个过渡中状态。
- 如果标签、叠加、注释、指南或高亮应该跟踪变化的内容，请在相关状态更改后验证该关系。
- 对于动态或交互依赖的视觉效果，检查足够长的时间以判断稳定性、层叠和可读性；不要依赖单个截图进行签收。
- 对于可以在加载或交互后变得更密集的界面，检查您在 QA 期间可以到达的最密集的真实状态，而不仅仅是空、加载或折叠状态。
- 如果产品有定义的最小支持视口或窗口大小，请在那里运行单独的视觉 QA 通道；否则，选择一个更小但仍然现实的尺寸并明确检查它。
- 区分存在和实现：如果预期的功能确实存在但由于对比度弱、遮挡、裁剪或不稳定而不太明显可感知，将其视为视觉失败。
- 如果任何需要的可见区域在您评估的状态中被裁剪、切断、遮挡或推到视口外，将其视为 bug，即使页面级滚动指标看起来可以接受。
- 寻找裁剪、溢出、扭曲、布局不平衡、不一致间距、对齐问题、难以辨认的文本、弱对比度、破损的层叠和尴尬的运动状态。
- 同时判断美学质量和正确性。UI 应该为任务感觉是有意的、连贯的且视觉上令人愉悦的。
- 优先使用视口截图进行签收。仅将全页捕获作为辅助调试产物使用，并在区域需要更近距离检查时捕获聚焦截图。
- 如果运动使截图模糊，请短暂等待 UI 稳定，然后捕获您实际评估的图像。
- 在签收前明确问：我还没有密切检查过这个界面的哪些可见部分？
- 在签收前明确问：如果用户仔细看，什么可见缺陷最有可能让这个结果尴尬？

### 签收

- 功能路径通过正常用户输入通过。
- 覆盖率是针对共享 QA 清单明确的：记下哪些需求、实现的功能、控件、状态和声明被执行，并指出任何有意的排除。
- 视觉 QA 通道覆盖了整个相关界面。
- 每个用户可见的声明都有匹配的视觉检查和来自该声明重要的状态和视口或窗口大小的审查截图产物。
- 视口适配检查对于预期的初始视图和任何要求的最小支持视口或窗口大小都通过了。
- 如果产品在窗口中启动，在任何手动调整大小或重新定位之前检查了启动后的大小、位置和初始布局。
- UI 不仅仅是功能性的；它在视觉上是连贯的，对于任务来说不是美学上弱的。
- 功能正确性、视口适配和视觉质量必须各自独立通过；一个不暗示其他。
- 简短探索性通道已完成（对于交互式产品），并且响应提到了该通道覆盖了什么。
- 如果截图审查和数字检查在任何时候不同意，在签收前调查差异；截图中的可见裁剪是无法解决的失败，而不是指标可以否决的。
- 包括对您检查过但没有发现的主要缺陷类的简要负面确认。
- 执行了清理，或者您有意保持会话活跃以进行进一步工作。

## 截图示例

如果您计划通过 `codex.emitImage(...)` 发出截图，请默认使用下一节中的 CSS 规范化路径。这些是将被模型解释或用于基于坐标的跟进操作的截图的规范示例。将原始捕获保留为仅对保真度敏感的调试的异常；原始异常示例出现在规范化指导之后。

### 模型绑定截图（默认）

如果您将使用 `codex.emitImage(...)` 发出截图供模型解释，请在发出之前将其规范化为捕获的确切区域的 CSS 像素。这保持返回的坐标与 Playwright CSS 像素对齐（如果回复后来用于点击），同时也减少了图像有效载荷大小和模型 token 成本。

默认不要发出原始本机窗口截图。仅在您明确需要设备像素保真度时才跳过规范化，例如 Retina 或 DPI 伪影调试、像素精确渲染检查或其他保真度敏感的情况（原始像素比有效载荷大小更重要）。对于不会发送到模型的本地检查，原始捕获是可以的。

不要假设 `page.screenshot({ scale: "css" })` 在本机窗口模式（`viewport: null`）中就足够了。在 macOS Retina 显示器上的 Chromium 中，有头本机窗口截图即使请求了 `scale: "css"`，仍可能以设备像素大小返回。相同的警告适用于通过 Playwright 启动的 Electron 窗口，因为 Electron 以 `noDefaultViewport` 运行，而 `appWindow.screenshot({ scale: "css" })` 可能仍返回设备像素输出。

为 Web 页面和 Electron 窗口使用单独的规范化路径：

- Web：直接优先使用 `page.screenshot({ scale: "css" })`。如果本机窗口 Chromium 仍然返回设备像素输出，在当前页面内使用 canvas 调整大小；不需要临时页面。
- Electron：不要使用 `appWindow.context().newPage()` 或 `electronApp.context().newPage()` 作为临时页面。Electron 上下文不支持该路径可靠。使用 `BrowserWindow.capturePage(...)` 在主进程中捕获，调整大小与 `nativeImage.resize(...)`，并直接发出这些字节。

共享帮助函数和约定：

```javascript
var emitJpeg = async function (bytes) {
  await codex.emitImage({
    bytes,
    mimeType: "image/jpeg",
    detail: "original",
  });
};

var emitWebJpeg = async function (surface, options = {}) {
  await emitJpeg(await surface.screenshot({
    type: "jpeg",
    quality: 85,
    scale: "css",
    ...options,
  }));
};

var clickCssPoint = async function ({ surface, x, y, clip }) {
  await surface.mouse.click(
    clip ? clip.x + x : x,
    clip ? clip.y + y : y
  );
};

var tapCssPoint = async function ({ page, x, y, clip }) {
  await page.touchscreen.tap(
    clip ? clip.x + x : x,
    clip ? clip.y + y : y
  );
};
```

- 对于 Web 使用 `page` 或 `mobilePage`，对于 Electron 使用 `appWindow` 作为 `surface`。
- 将 `clip` 视为渲染器中 `getBoundingClientRect()` 的 CSS 像素。
- 除非明确需要无损保真度，否则优先使用 `quality: 85` 的 JPEG。
- 对于全图捕获，直接使用返回的 `{ x, y }`。
- 对于裁剪捕获，点击时添加裁剪原点。

### Web CSS 规范化

对于显式视口上下文的优选 Web 路径，通常也适用于 Web：

```javascript
await emitWebJpeg(page);
```

移动 Web 使用相同路径；将 `page` 替换为 `mobilePage`：

```javascript
await emitWebJpeg(mobilePage);
```

如果模型返回 `{ x, y }`，直接点击它：

```javascript
await clickCssPoint({ surface: page, x, y });
```

移动 Web 点击路径：

```javascript
await tapCssPoint({ page: mobilePage, x, y });
```

对于此正常路径中的 Web `clip` 截图或元素截图，`scale: "css"` 通常直接工作。点击时添加区域原点。

- `await emitWebJpeg(page, { clip })`
- `await emitWebJpeg(mobilePage, { clip })`
- `await clickCssPoint({ surface: page, clip, x, y })`
- `await tapCssPoint({ page: mobilePage, clip, x, y })`
- `await clickCssPoint({ surface: page, clip: box, x, y })` after `const box = await locator.boundingBox()`

当 `scale: "css"` 仍然以设备像素大小返回时，Web 本机窗口回退：

```javascript
var emitWebScreenshotCssScaled = async function ({ page, clip, quality = 0.85 } = {}) {
  var NodeBuffer = (await import("node:buffer")).Buffer;
  const target = clip
    ? { width: clip.width, height: clip.height }
    : await page.evaluate(() => ({
        width: window.innerWidth,
        height: window.innerHeight,
      }));

  const screenshotBuffer = await page.screenshot({
    type: "png",
    ...(clip ? { clip } : {}),
  });

  const bytes = await page.evaluate(
    async ({ imageBase64, targetWidth, targetHeight, quality }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${imageBase64}`;
      await image.decode();

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality)
      );

      return new Uint8Array(await blob.arrayBuffer());
    },
    {
      imageBase64: NodeBuffer.from(screenshotBuffer).toString("base64"),
      targetWidth: target.width,
      targetHeight: target.height,
      quality,
    }
  );

  await emitJpeg(bytes);
};
```

对于全视口回退捕获，将返回的 `{ x, y }` 视为直接 CSS 坐标：

```javascript
await emitWebScreenshotCssScaled({ page });
await clickCssPoint({ surface: page, x, y });
```

对于裁剪回退捕获，添加裁剪原点：

```javascript
await emitWebScreenshotCssScaled({ page, clip });
await clickCssPoint({ surface: page, clip, x, y });
```

### Electron CSS 规范化

对于 Electron，在主进程中规范化，而不是打开临时 Playwright 页面。下面的帮助函数返回全内容区域或裁剪 CSS 像素区域的 CSS 缩放字节。将 `clip` 视为内容区域 CSS 像素，例如从渲染器中 `getBoundingClientRect()` 获取的值。

```javascript
var emitElectronScreenshotCssScaled = async function ({ electronApp, clip, quality = 85 } = {}) {
  const bytes = await electronApp.evaluate(async ({ BrowserWindow }, { clip, quality }) => {
    const win = BrowserWindow.getAllWindows()[0];
    const image = clip ? await win.capturePage(clip) : await win.capturePage();

    const target = clip
      ? { width: clip.width, height: clip.height }
      : (() => {
          const [width, height] = win.getContentSize();
          return { width, height };
        })();

    const resized = image.resize({
      width: target.width,
      height: target.height,
      quality: "best",
    });

    return resized.toJPEG(quality);
  }, { clip, quality });

  await emitJpeg(bytes);
};
```

全 Electron 窗口：

```javascript
await emitElectronScreenshotCssScaled({ electronApp });
await clickCssPoint({ surface: appWindow, x, y });
```

使用来自渲染器的 CSS 像素裁剪 Electron 区域：

```javascript
var clip = await appWindow.evaluate(() => {
  const rect = document.getElementById("board").getBoundingClientRect();
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
});

await emitElectronScreenshotCssScaled({ electronApp, clip });
await clickCssPoint({ surface: appWindow, clip, x, y });
```

### 原始截图异常示例

仅在原始像素比 CSS 坐标对齐更重要时使用这些，例如 Retina 或 DPI 伪影调试、像素精确渲染检查或其他保真度敏感审查。

Web 桌面原始发出：

```javascript
await codex.emitImage({
  bytes: await page.screenshot({ type: "jpeg", quality: 85 }),
  mimeType: "image/jpeg",
  detail: "original",
});
```

Electron 原始发出：

```javascript
await codex.emitImage({
  bytes: await appWindow.screenshot({ type: "jpeg", quality: 85 }),
  mimeType: "image/jpeg",
  detail: "original",
});
```

移动 Web 原始发出（在移动 Web 上下文已运行后）：

```javascript
await codex.emitImage({
  bytes: await mobilePage.screenshot({ type: "jpeg", quality: 85 }),
  mimeType: "image/jpeg",
  detail: "original",
});
```

## 视口适配检查（必需）

不要仅仅因为主小组件可见就假设截图可以接受。在签收前，明确验证预期的初始视图与产品要求匹配，使用截图审查和数字检查。

- 在签收前定义预期的初始视图。对于可滚动页面，这是折叠线以上的体验。对于类似外壳的应用、游戏、编辑器、仪表板或工具，这是完整的交互表面加上使用它所需的控件和状态。
- 使用截图作为适配的主要证据。数字检查支持截图；它们不能否决可见的裁剪。
- 如果预期的初始视图中有任何需要的可见区域被裁剪、切断、遮挡或推到视口外，签收失败，即使页面级滚动指标看起来可以接受。
- 当产品被设计为可滚动且初始视图仍然传达核心体验并暴露主要行动号召或所需起始上下文时，滚动是可以接受的。
- 对于固定外壳界面，如果需要滚动才能到达主交互表面或基本控件的某部分，滚动不是可接受的解决方法。
- 不要仅依赖文档滚动指标。固定高度外壳、内部窗格和隐藏溢出容器可能会裁剪所需的 UI，而页面级滚动检查看起来仍然是干净的。
- 检查区域边界，而不仅仅是文档边界。验证每个需要的可见区域在启动状态下适合视口内。
- 对于 Electron 或桌面应用，在任何手动调整大小或重新定位之前，验证启动窗口大小和位置以及渲染器的初始可见布局。
- 通过视口适配检查仅证明预期的初始视图可见且没有意外的裁剪或滚动。它不能证明 UI 在视觉上正确或美学上成功。

Web 或渲染器检查：

```javascript
console.log(await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  clientWidth: document.documentElement.clientWidth,
  clientHeight: document.documentElement.clientHeight,
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
  canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  canScrollY: document.documentElement.scrollHeight > document.documentElement.clientHeight,
})));
```

Electron 检查：

```javascript
console.log(await appWindow.evaluate(() => ({
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight,
  clientWidth: document.documentElement.clientWidth,
  clientHeight: document.documentElement.clientHeight,
  scrollWidth: document.documentElement.scrollWidth,
  scrollHeight: document.documentElement.scrollHeight,
  canScrollX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  canScrollY: document.documentElement.scrollHeight > document.documentElement.clientHeight,
})));
```

当裁剪是现实的失败模式时，使用 `getBoundingClientRect()` 检查来增强数字检查，以获取特定 UI 中需要的可见区域；文档级指标对于固定外壳来说单独是不够的。

## 开发服务器

对于本地 Web 调试，在持久性 TTY 会话中保持应用运行。不要依赖来自短命 shell 的一次性后台命令。

使用项目的正常启动命令，例如：

```bash
npm start
```

在 `page.goto(...)` 之前，验证所选端口正在监听且应用有响应。

对于 Electron 调试，通过 `_electron.launch(...)` 从 `js_repl` 启动应用，以便同一会话拥有进程。如果 Electron 渲染器依赖于单独的开发服务器（例如 Vite 或 Next），请在该服务器在持久性 TTY 会话中保持运行，然后从 `js_repl` 重新启动或重新加载 Electron 应用。

## 清理

仅在实际完成任务时运行清理：

- 此清理是手动的。退出 Codex、关闭终端或丢失 `js_repl` 会话不会隐式运行 `electronApp.close()`、`context.close()` 或 `browser.close()`。
- 对于 Electron，特别假设如果您在不首先执行清理单元的情况下离开会话，应用可能会继续运行。

```javascript
if (electronApp) {
  await electronApp.close().catch(() => {});
}

if (mobileContext) {
  await mobileContext.close().catch(() => {});
}

if (context) {
  await context.close().catch(() => {});
}

if (browser) {
  await browser.close().catch(() => {});
}

browser = undefined;
context = undefined;
page = undefined;
mobileContext = undefined;
mobilePage = undefined;
electronApp = undefined;
appWindow = undefined;

console.log("Playwright session closed");
```

如果您计划在调试后立即退出 Codex，请先运行清理单元并在退出前等待 `"Playwright session closed"` 日志。

## 常见失败模式

- `Cannot find module 'playwright'`：在当前工作区运行一次性设置并验证导入，然后再使用 `js_repl`。
- Playwright 包已安装但浏览器可执行文件缺失：运行 `npx playwright install chromium`。
- `page.goto: net::ERR_CONNECTION_REFUSED`：确保开发服务器仍在持久性 TTY 会话中运行，重新检查端口，并优先使用 `http://127.0.0.1:<port>`。
- `electron.launch` 挂起、超时或立即退出：验证本地 `electron` 依赖项，确认 `args` 目标，并确保任何渲染器开发服务器在启动前已运行。
- `Identifier has already been declared`：重用现有顶级绑定，选择新名称，或将代码包装在 `{ ... }` 中。仅在内核真正卡住时使用 `js_repl_reset`。
- 在使用 Electron 时 `browserContext.newPage: Protocol error (Target.createTarget): Not supported`：不要使用 `appWindow.context().newPage()` 或 `electronApp.context().newPage()` 作为临时页面；使用模型绑定截图部分中的 Electron 特定截图规范化流程。
- `js_repl` 超时或重置：重新运行引导单元并用更短、更集中的单元重新创建会话。
- 浏览器启动或网络操作立即失败：确认会话是用 `--sandbox danger-full-access` 启动的，如需要请以此方式重启。
