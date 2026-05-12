---
name: UI-UX专家
description: "UI/UX design intelligence for web and mobile. Includes 50+ styles, 161 color palettes, 57 font pairings, 161 product types, 99 UX guidelines, and 25 chart types across 10 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui, and HTML/CSS). Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance, refactor, and check UI/UX code. Projects: website, landing page, dashboard, admin panel, e-commerce, SaaS, portfolio, blog, and mobile app. Elements: button, modal, navbar, sidebar, card, table, form, and chart. Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, responsive, skeuomorphism, and flat design. Topics: color systems, accessibility, animation, layout, typography, font pairing, spacing, interaction states, shadow, and gradient. Integrations: shadcn/ui MCP for component search and examples."
---

# UI/UX Pro Max - 设计智能

Web 和移动应用综合设计指南。包含 50+ 样式、161 个配色方案、57 种字体搭配、161 种产品类型及其推理规则、99 条 UX 指南，以及横跨 10 个技术栈的 25 种图表类型。可搜索的数据库，带有基于优先级的推荐。

## 适用场景

当任务涉及 **UI 结构、视觉设计决策、交互模式或用户体验质量控制** 时，应使用此技能。

### 必须使用

以下情况必须调用此技能：

- 设计新页面（着陆页、仪表盘、管理后台、SaaS、移动端应用）
- 创建或重构 UI 组件（按钮、模态框、表单、表格、图表等）
- 选择配色方案、排版系统、间距标准或布局系统
- 审查 UI 代码的用户体验、无障碍性或视觉一致性
- 实现导航结构、动画或响应式行为
- 做出产品级设计决策（风格、信息层次、品牌表达）
- 提升界面的感知质量、清晰度或可用性

### 推荐使用

以下情况推荐使用此技能：

- UI 看起来"不够专业"但原因不明
- 收到关于可用性或体验的反馈
- 发布前的 UI 质量优化
- 跨平台设计对齐（Web / iOS / Android）
- 构建设计系统或可复用组件库

### 跳过

以下情况不需要此技能：

- 纯后端逻辑开发
- 仅涉及 API 或数据库设计
- 与界面无关的性能优化
- 基础设施或 DevOps 工作
- 非视觉脚本或自动化任务

**决策标准**：如果任务会改变功能的**外观、感受、动态或交互方式**，则应使用此技能。

## 按优先级分类的规则

*供人类/AI 参考：按优先级 1→10 决定首先关注哪个规则类别；需要时使用 `--domain <Domain>` 查询详情。脚本不读取此表。*

| 优先级 | 类别 | 影响级别 | 领域 | 关键检查项（必须有）| 反模式（避免）|
|----------|----------|--------|--------|------------------------|------------------------|
| 1 | 无障碍 | 关键 | `ux` | 对比度 4.5:1、Alt 文本、键盘导航、aria-label | 移除焦点环、无标签的图标按钮 |
| 2 | 触控与交互 | 关键 | `ux` | 最小尺寸 44×44px、间距 8px+、加载反馈 | 仅依赖悬停、即时状态变化（0ms） |
| 3 | 性能 | 高 | `ux` | WebP/AVIF、懒加载、预留空间（CLS < 0.1）| 布局抖动、累积布局偏移 |
| 4 | 风格选择 | 高 | `style`, `product` | 匹配产品类型、一致性、SVG 图标（不用 emoji）| 随机混用平面和拟物风格、用 emoji 做图标 |
| 5 | 布局与响应式 | 高 | `ux` | 移动端优先断点、viewport meta、无横向滚动 | 横向滚动、固定 px 容器宽度、禁用缩放 |
| 6 | 排版与颜色 | 中 | `typography`, `color` | 基础 16px、行高 1.5、语义颜色令牌 | 正文字号 < 12px、灰度叠加、组件中使用原始 hex |
| 7 | 动画 | 中 | `ux` | 时长 150–300ms、动效传达含义、空间连续性 | 纯装饰动画、动画化 width/height、无 reduced-motion |
| 8 | 表单与反馈 | 中 | `ux` | 可见标签、错误靠近字段、辅助文本、渐进披露 | 仅占位符标签、仅顶部错误、一次性堆砌 |
| 9 | 导航模式 | 高 | `ux` | 可预测的返回、底部导航 ≤5、深链接 | 导航过载、返回行为中断、无深链接 |
| 10 | 图表与数据 | 低 | `chart` | 图例、工具提示、无障碍颜色 | 仅依赖颜色传达含义 |

## 快速参考

### 1. 无障碍（关键）

- `color-contrast` - 正常文本最低对比度 4.5:1（大文本 3:1）；Material Design
- `focus-states` - 交互元素的可见焦点环（2–4px；Apple HIG、MD）
- `alt-text` - 有意义图片的描述性 alt 文本
- `aria-labels` - 仅图标按钮的 aria-label；原生环境中的 accessibilityLabel（Apple HIG）
- `keyboard-nav` - Tab 顺序匹配视觉顺序；完整的键盘支持（Apple HIG）
- `form-labels` - 使用带 for 属性的 label
- `skip-links` - 键盘用户可跳转至主内容
- `heading-hierarchy` - 顺序的 h1→h6，不跳级
- `color-not-only` - 不要仅用颜色传达信息（添加图标/文字）
- `dynamic-type` - 支持系统文字缩放；避免文字增长时截断（Apple Dynamic Type、MD）
- `reduced-motion` - 尊重 prefers-reduced-motion；请求时减少/禁用动画（Apple Reduced Motion API、MD）
- `voiceover-sr` - 有意义的 accessibilityLabel/accessibilityHint；VoiceOver/屏幕阅读器的逻辑阅读顺序（Apple HIG、MD）
- `escape-routes` - 模态框和多步骤流程中提供取消/返回（Apple HIG）
- `keyboard-shortcuts` - 保留系统和无障碍快捷键；为拖放提供键盘替代方案（Apple HIG）

### 2. 触控与交互（关键）

- `touch-target-size` - 最小 44×44pt（Apple）/ 48×48dp（Material）；需要时将点击区域扩展到视觉边界之外
- `touch-spacing` - 点击目标之间最小 8px/8dp 间距（Apple HIG、MD）
- `hover-vs-tap` - 主要交互使用点击/tap；不要仅依赖悬停
- `loading-buttons` - 异步操作期间禁用按钮；显示加载动画或进度
- `error-feedback` - 在问题附近显示清晰的错误信息
- `cursor-pointer` - 为可点击元素添加 cursor-pointer（Web）
- `gesture-conflicts` - 避免在主内容上水平滑动；优先垂直滚动
- `tap-delay` - 使用 touch-action: manipulation 减少 300ms 延迟（Web）
- `standard-gestures` - 一致地使用平台标准手势；不要重新定义（例如 swipe-back、pinch-zoom）（Apple HIG）
- `system-gestures` - 不要阻止系统手势（控制中心、返回滑动等）（Apple HIG）
- `press-feedback` - 按下时有视觉反馈（涟漪/高亮；MD 状态层）
- `haptic-feedback` - 确认和重要操作使用触觉反馈；避免过度使用（Apple HIG）
- `gesture-alternative` - 不要依赖仅手势的交互；为关键操作始终提供可见控件
- `safe-area-awareness` - 将主要点击目标保持在刘海、灵动岛、手势条和屏幕边缘之外
- `no-precision-required` - 避免在小图标或细边缘上要求像素级精确点击
- `swipe-clarity` - 滑动操作必须显示清晰的提示或暗示（chevron、标签、教程）
- `drag-threshold` - 开始拖动前使用移动阈值，避免意外拖动

### 3. 性能（高）

- `image-optimization` - 使用 WebP/AVIF、响应式图片（srcset/sizes）、懒加载非关键资源
- `image-dimension` - 声明 width/height 或使用 aspect-ratio 防止布局偏移（Core Web Vitals: CLS）
- `font-loading` - 使用 font-display: swap/optional 避免文本不可见（FOIT）；预留空间减少布局偏移（MD）
- `font-preload` - 仅预加载关键字体；避免过度使用 preload 加载每个变体
- `critical-css` - 优先处理首屏 CSS（内联关键 CSS 或早期加载的样式表）
- `lazy-loading` - 通过动态导入/路由级拆分懒加载非首屏组件
- `bundle-splitting` - 按路由/功能拆分代码（React Suspense / Next.js dynamic）以减少初始加载和 TTI
- `third-party-scripts` - 异步/延迟加载第三方脚本；审核并移除不必要的脚本（MD）
- `reduce-reflows` - 避免频繁的布局读写；先批量读取 DOM 再写入
- `content-jumping` - 为异步内容预留空间避免布局跳动（Core Web Vitals: CLS）
- `lazy-load-below-fold` - 对首屏以下的图片和重型媒体使用 loading="lazy"
- `virtualize-lists` - 对 50+ 项的列表使用虚拟化以提高内存效率和滚动性能
- `main-thread-budget` - 保持每帧工作在 ~16ms 以内实现 60fps；将重型任务移出主线程（HIG、MD）
- `progressive-loading` - 对于 >1s 的操作使用骨架屏/闪烁效果而非长时间阻塞的加载动画（Apple HIG）
- `input-latency` - 保持点击/滚动的输入延迟在 ~100ms 以内（Material 响应性标准）
- `tap-feedback-speed` - 在点击后 100ms 内提供视觉反馈（Apple HIG）
- `debounce-throttle` - 对高频事件（滚动、调整大小、输入）使用防抖/节流
- `offline-support` - 提供离线状态消息和基本回退（PWA / 移动端）
- `network-fallback` - 为慢速网络提供降级模式（低分辨率图片、减少动画）

### 4. 风格选择（高）

- `style-match` - 风格匹配产品类型（使用 `--design-system` 获取推荐）
- `consistency` - 在所有页面使用相同风格
- `no-emoji-icons` - 使用 SVG 图标（Heroicons、Lucide），不用 emoji
- `color-palette-from-product` - 从产品/行业选择配色（搜索 `--domain color`）
- `effects-match-style` - 阴影、模糊、圆角与所选风格对齐（glass / flat / clay 等）
- `platform-adaptive` - 尊重平台惯例（iOS HIG vs Material）：导航、控件、排版、动效
- `state-clarity` - 使悬停/按下/禁用状态在视觉上可区分，同时保持风格一致（Material 状态层）
- `elevation-consistent` - 为卡片、sheet、模态框使用一致的 Elevation/阴影比例；避免随机的阴影值
- `dark-mode-pairing` - 同时设计浅色/深色变体以保持品牌、对比度和风格一致
- `icon-style-consistent` - 在整个产品中使用统一的图标集/视觉语言（描边宽度、圆角）
- `system-controls` - 优先使用原生/系统控件而非完全自定义的控件；仅在品牌需要时才定制（Apple HIG）
- `blur-purpose` - 使用模糊表示背景关闭（模态框、sheet），而非装饰（Apple HIG）
- `primary-action` - 每个屏幕应只有一个主要 CTA；次要操作在视觉上从属（Apple HIG）

### 5. 布局与响应式（高）

- `viewport-meta` - width=device-width initial-scale=1（永不禁用缩放）
- `mobile-first` - 先设计移动端，再扩展到平板和桌面
- `breakpoint-consistency` - 使用系统化的断点（例如 375 / 768 / 1024 / 1440）
- `readable-font-size` - 移动端正文最小 16px（避免 iOS 自动放大）
- `line-length-control` - 移动端每行 35–60 字符；桌面端 60–75 字符
- `horizontal-scroll` - 移动端无横向滚动；确保内容适应视口宽度
- `spacing-scale` - 使用 4pt/8dp 增量间距系统（Material Design）
- `touch-density` - 保持组件间距适合触控：不太拥挤、不会导致误点击
- `container-width` - 桌面端统一的最大宽度（max-w-6xl / 7xl）
- `z-index-management` - 定义分层的 z-index 比例（例如 0 / 10 / 20 / 40 / 100 / 1000）
- `fixed-element-offset` - 固定导航栏/底部栏必须为底层内容预留安全内边距
- `scroll-behavior` - 避免干扰主滚动体验的嵌套滚动区域
- `viewport-units` - 移动端优先使用 min-h-dvh 而非 100vh
- `orientation-support` - 保持布局在横屏模式下可读且可操作
- `content-priority` - 移动端首先显示核心内容；折叠或隐藏次要内容
- `visual-hierarchy` - 通过尺寸、间距、对比度建立层次——不仅仅依赖颜色

### 6. 排版与颜色（中）

- `line-height` - 正文使用 1.5-1.75
- `line-length` - 每行限制 65-75 字符
- `font-pairing` - 标题/正文字体个性匹配
- `font-scale` - 统一的类型比例（例如 12 14 16 18 24 32）
- `contrast-readability` - 浅色背景上使用深色文本（例如 white 上的 slate-900）
- `text-styles-system` - 使用平台类型系统：iOS 11 Dynamic Type 样式 / Material 5 类型角色（display、headline、title、body、label）（HIG、MD）
- `weight-hierarchy` - 使用 font-weight 强化层次：粗体标题（600–700）、常规正文（400）、中等标签（500）（MD）
- `color-semantic` - 定义语义颜色令牌（primary、secondary、error、surface、on-surface）而非组件中的原始 hex（Material 颜色系统）
- `color-dark-mode` - 深色模式使用去饱和/较浅的色调变体，而非反转颜色；分别测试对比度（HIG、MD）
- `color-accessible-pairs` - 前景/背景配对必须达到 4.5:1（AA）或 7:1（AAA）；使用工具验证（WCAG、MD）
- `color-not-decorative-only` - 功能颜色（错误红、成功绿）必须包含图标/文字；避免仅用颜色表示含义（HIG、MD）
- `truncation-strategy` - 优先换行而非截断；截断时使用省略号并通过 tooltip/展开提供完整文本（Apple HIG）
- `letter-spacing` - 尊重平台默认字间距；避免正文字间距过紧（HIG、MD）
- `number-tabular` - 数据列、价格、计时器使用等宽/表格数字以防止布局偏移
- `whitespace-balance` - 有意识地使用空白将相关项目分组并分隔章节；避免视觉混乱（Apple HIG）

### 7. 动画（中）

- `duration-timing` - 微交互使用 150–300ms；复杂转场 ≤400ms；避免 >500ms（MD）
- `transform-performance` - 仅使用 transform/opacity；避免动画化 width/height/top/left
- `loading-states` - 加载超过 300ms 时显示骨架屏或进度指示器
- `excessive-motion` - 每个视图最多动画化 1-2 个关键元素
- `easing` - 进入使用 ease-out，退出使用 ease-in；避免 UI 转场使用 linear
- `motion-meaning` - 每个动画必须表达因果关系，而不仅仅是装饰（Apple HIG）
- `state-transition` - 状态变化（悬停 / 按下 / 展开 / 折叠 / 模态）应该平滑动画，而非瞬时切换
- `continuity` - 页面/屏幕转场应保持空间连续性（共享元素、方向滑动）（Apple HIG）
- `parallax-subtle` - 谨慎使用视差；必须尊重 reduced-motion 且不会导致迷失方向（Apple HIG）
- `spring-physics` - 优先使用 spring/基于物理的曲线而非 linear 或 cubic-bezier 以获得自然感觉（Apple HIG 流畅动画）
- `exit-faster-than-enter` - 退出动画短于进入动画（约 60–70% 的进入时长）以显得响应迅速（MD motion）
- `stagger-sequence` - 列表/网格项目入场按每项 30–50ms 交错；避免一次性或过慢的揭示（MD）
- `shared-element-transition` - 使用共享元素/英雄转场以保持屏幕间的视觉连续性（MD、HIG）
- `interruptible` - 动画必须可中断；用户点击/手势应立即取消进行中的动画（Apple HIG）
- `no-blocking-animation` - 切勿在动画期间阻止用户输入；UI 必须保持可交互（Apple HIG）
- `fade-crossfade` - 同一容器内的内容替换使用交叉淡入淡出（MD）
- `scale-feedback` - 可点击卡片/按钮按下时微缩（0.95–1.05）；释放时恢复（HIG、MD）
- `gesture-feedback` - 拖动、滑动、捏合必须提供实时视觉响应跟踪手指（MD Motion）
- `hierarchy-motion` - 使用 translate/scale 方向表达层次：下方进入 = 更深，向上退出 = 返回（MD）
- `motion-consistency` - 在全局统一 duration/easing 令牌；所有动画共享相同的节奏和感觉
- `opacity-threshold` - 淡出的元素不应停留在透明度 0.2 以下；要么完全淡出要么保持可见
- `modal-motion` - 模态框/sheet 应从触发源动画化（scale+fade 或 slide-in）以获得空间上下文（HIG、MD）
- `navigation-direction` - 前进导航向左/上动画；后退向右/下动画——保持方向逻辑一致（HIG）
- `layout-shift-avoid` - 动画不得导致布局回流或 CLS；使用 transform 进行位置变化

### 8. 表单与反馈（中）

- `input-labels` - 每个输入有可见标签（不只是占位符）
- `error-placement` - 在相关字段下方显示错误
- `submit-feedback` - 提交后显示加载然后成功/错误状态
- `required-indicators` - 标记必填字段（例如星号）
- `empty-states` - 无内容时显示有用的消息和操作
- `toast-dismiss` - 3-5 秒自动关闭 toast
- `confirmation-dialogs` - 破坏性操作前确认
- `input-helper-text` - 为复杂输入提供持久的辅助文本，而非仅占位符（Material Design）
- `disabled-states` - 禁用元素使用降低的不透明度（0.38–0.5）+ 光标变化 + 语义属性（MD）
- `progressive-disclosure` - 渐进披露复杂选项；不要一开始就给用户造成压力（Apple HIG）
- `inline-validation` - 在 blur 时验证（非按键时）；仅在用户完成输入后显示错误（MD）
- `input-type-keyboard` - 使用语义输入类型（email、tel、number）以触发正确的移动端键盘（HIG、MD）
- `password-toggle` - 为密码字段提供显示/隐藏切换（MD）
- `autofill-support` - 使用 autocomplete / textContentType 属性以便系统自动填充（HIG、MD）
- `undo-support` - 允许对破坏性或批量操作进行撤销（例如"撤销删除"toast）（Apple HIG）
- `success-feedback` - 用简要视觉反馈（勾选、toast、颜色闪烁）确认已完成的操作（MD）
- `error-recovery` - 错误消息必须包含清晰的恢复路径（重试、编辑、帮助链接）（HIG、MD）
- `multi-step-progress` - 多步骤流程显示步骤指示器或进度条；允许返回导航（MD）
- `form-autosave` - 长表单应自动保存草稿以防止意外关闭时丢失数据（Apple HIG）
- `sheet-dismiss-confirm` - 在关闭有未保存更改的 sheet/模态框前确认（Apple HIG）
- `error-clarity` - 错误消息必须说明原因和如何修复（不仅仅是"输入无效"）（HIG、MD）
- `field-grouping` - 逻辑上分组相关字段（fieldset/legend 或视觉分组）（MD）
- `read-only-distinction` - 只读状态应在视觉和语义上与禁用状态不同（MD）
- `focus-management` - 提交错误后，自动聚焦第一个无效字段（WCAG、MD）
- `error-summary` - 对于多个错误，在顶部显示摘要并链接到每个字段（WCAG）
- `touch-friendly-input` - 移动端输入高度 ≥44px 以满足点击目标要求（Apple HIG）
- `destructive-emphasis` - 破坏性操作使用语义危险色（红色）并与主要操作在视觉上分离（HIG、MD）
- `toast-accessibility` - Toast 不得窃取焦点；使用 aria-live="polite" 进行屏幕阅读器通知（WCAG）
- `aria-live-errors` - 表单错误使用 aria-live 区域或 role="alert" 通知屏幕阅读器（WCAG）
- `contrast-feedback` - 错误和成功状态颜色必须达到 4.5:1 对比度（WCAG、MD）
- `timeout-feedback` - 请求超时必须显示清晰的反馈和重试选项（MD）

### 9. 导航模式（高）

- `bottom-nav-limit` - 底部导航最多 5 项；使用带图标和标签（Material Design）
- `drawer-usage` - 使用 drawer/sidebar 进行次要导航，而非主要操作（Material Design）
- `back-behavior` - 返回导航必须可预测且一致；保留滚动/状态（Apple HIG、MD）
- `deep-linking` - 所有关键屏幕必须可通过深链接/URL 访问以进行分享和通知（Apple HIG、MD）
- `tab-bar-ios` - iOS：使用底部 Tab Bar 进行顶级导航（Apple HIG）
- `top-app-bar-android` - Android：使用带导航图标的 Top App Bar 作为主要结构（Material Design）
- `nav-label-icon` - 导航项必须同时有图标和文字标签；仅图标导航会损害可发现性（MD）
- `nav-state-active` - 当前位置必须在导航中视觉高亮显示（颜色、粗细、指示器）（HIG、MD）
- `nav-hierarchy` - 主要导航（tabs/底部栏）与次要导航（drawer/设置）必须清晰分离（MD）
- `modal-escape` - 模态框和 sheet 必须提供清晰的关闭/取消操作；移动端上下滑动关闭（Apple HIG）
- `search-accessible` - 搜索必须易于触及（顶部栏或 tab）；提供最近/建议的查询（MD）
- `breadcrumb-web` - Web：对于 3+ 层深的层次结构使用面包屑以辅助定位（MD）
- `state-preservation` - 返回时必须恢复之前的滚动位置、筛选状态和输入（HIG、MD）
- `gesture-nav-support` - 支持系统手势导航（iOS swipe-back、Android predictive back）不冲突（HIG、MD）
- `tab-badge` - 谨慎使用导航项上的徽章表示未读/待处理；用户访问后清除（HIG、MD）
- `overflow-menu` - 当操作超出可用空间时，使用 overflow/更多菜单而非塞入（MD）
- `bottom-nav-top-level` - 底部导航仅用于顶级屏幕；切勿在其中嵌套子导航（MD）
- `adaptive-navigation` - 大屏幕（≥1024px）优先使用侧边栏；小屏幕使用底部/顶部导航（Material Adaptive）
- `back-stack-integrity` - 切勿静默重置导航栈或意外跳转到首页（HIG、MD）
- `navigation-consistency` - 导航位置必须在所有页面保持一致；不要因页面类型而改变
- `avoid-mixed-patterns` - 不要在同一层次级别混用 Tab + Sidebar + Bottom Nav
- `modal-vs-navigation` - 模态框不得用于主要导航流程；它们会打断用户的路径（HIG）
- `focus-on-route-change` - 页面转换后，将焦点移到主要内容区域以便于屏幕阅读器用户（WCAG）
- `persistent-nav` - 核心导航必须从深层页面保持可触及；不要在子流程中完全隐藏（HIG、MD）
- `destructive-nav-separation` - 危险操作（删除账户、登出）必须与普通导航项在视觉和空间上分离（HIG、MD）
- `empty-nav-state` - 当导航目的地不可用时，解释原因而非静默隐藏（MD）

### 10. 图表与数据（低）

- `chart-type` - 图表类型匹配数据类型（趋势 → 折线、比较 → 柱状、比例 → 饼图/环形图）
- `color-guidance` - 使用无障碍配色方案；避免仅用红绿配对以便于色盲用户（WCAG、MD）
- `data-table` - 提供表格替代方案以便于无障碍；图表本身对屏幕阅读器不友好（WCAG）
- `pattern-texture` - 用图案、纹理或形状补充颜色，以便数据无需颜色也能区分（WCAG、MD）
- `legend-visible` - 始终显示图例；位于图表附近，而非在滚动折叠下方的独立位置（MD）
- `tooltip-on-interact` - 在悬停（Web）或点击（移动端）时提供工具提示/数据标签显示确切值（HIG、MD）
- `axis-labels` - 用单位和可读比例标记坐标轴；避免移动端截断或旋转标签
- `responsive-chart` - 图表必须在小屏幕上重排或简化（例如用水平柱状图替代垂直图，减少刻度）
- `empty-data-state` - 无数据时显示有意义的空状态（"暂无数据"+ 指导），而非空白图表（MD）
- `loading-chart` - 图表数据加载时使用骨架屏或闪烁占位符；不要显示空的坐标轴框架
- `animation-optional` - 图表入场动画必须尊重 prefers-reduced-motion；数据应立即可读（HIG）
- `large-dataset` - 对于 1000+ 数据点，聚合或采样；提供下钻以获取详情而非渲染全部（MD）
- `number-formatting` - 在坐标轴和标签上使用本地化格式的数字、日期、货币（HIG、MD）
- `touch-target-chart` - 交互式图表元素（点、段）必须有 ≥44pt 点击区域或在点击时扩展（Apple HIG）
- `no-pie-overuse` - 避免在 >5 个类别时使用饼图/环形图；为清晰起见切换到柱状图
- `contrast-data` - 数据线/柱与背景 ≥3:1；数据文本标签 ≥4.5:1（WCAG）
- `legend-interactive` - 图例应该是可点击的以切换系列可见性（MD）
- `direct-labeling` - 对于小数据集，直接在图表上标注值以减少眼睛移动
- `tooltip-keyboard` - 工具提示内容必须可通过键盘触及，不依赖悬停（WCAG）
- `sortable-table` - 数据表必须支持排序，aria-sort 指示当前排序状态（WCAG）
- `axis-readability` - 坐标轴刻度不能太拥挤；保持可读间距，小屏幕自动跳过
- `data-density` - 限制每个图表的信息密度以避免认知过载；必要时拆分为多个图表
- `trend-emphasis` - 强调数据趋势而非装饰；避免使用可能遮盖数据的厚重渐变/阴影
- `gridline-subtle` - 网格线应该低对比度（例如 gray-200）以免与数据竞争
- `focusable-elements` - 交互式图表元素（点、柱、切片）必须可键盘导航（WCAG）
- `screen-reader-summary` - 为屏幕阅读器提供描述图表关键洞察的文本摘要或 aria-label（WCAG）
- `error-state-chart` - 数据加载失败必须显示错误消息和重试操作，而非破碎/空白图表
- `export-option` - 对于数据密集型产品，提供图表数据的 CSV/图片导出
- `drill-down-consistency` - 下钻交互必须保持清晰的返回路径和层次面包屑
- `time-scale-clarity` - 时间序列图表必须清晰标注时间粒度（日/周/月）并允许切换

## 如何使用

使用下面的 CLI 工具搜索特定领域。

---

## 前置条件

检查 Python 是否已安装：

```bash
python3 --version || python --version
```

如果 Python 未安装，请根据用户的操作系统安装：

**macOS:**
```bash
brew install python3
```

**Ubuntu/Debian:**
```bash
sudo apt update && sudo apt install python3
```

**Windows:**
```powershell
winget install Python.Python.3.12
```

---

## 如何使用此技能

当用户请求以下任何操作时使用此技能：

| 场景 | 触发示例 | 起始步骤 |
|----------|-----------------|------------|
| **新项目/页面** | "构建着陆页"、"构建仪表盘" | 步骤 1 → 步骤 2（设计系统）|
| **新组件** | "创建定价卡片"、"添加模态框" | 步骤 3（领域搜索：style、ux）|
| **选择风格/颜色/字体** | "什么风格适合金融科技应用？"、"推荐配色方案" | 步骤 2（设计系统）|
| **审查现有 UI** | "审查此页面的 UX 问题"、"检查无障碍" | 上方的快速参考检查清单 |
| **修复 UI bug** | "按钮悬停坏了"、"加载时布局偏移" | 快速参考 → 相关章节 |
| **改进/优化** | "使其更快"、"改进移动端体验" | 步骤 3（领域搜索：ux、react）|
| **实现深色模式** | "添加深色模式支持" | 步骤 3（领域：style "dark mode"）|
| **添加图表/数据可视化** | "添加分析仪表盘图表" | 步骤 3（领域：chart）|
| **技术栈最佳实践** | "React 性能提示"、"SwiftUI 导航" | 步骤 4（技术栈搜索）|

按以下工作流程进行：

### 步骤 1：分析用户需求

从用户请求中提取关键信息：
- **产品类型**：娱乐（社交、视频、音乐、游戏）、工具（扫描仪、编辑器、转换器）、生产力（任务管理器、笔记、日历）或混合型
- **目标受众**：C 端消费者用户；考虑年龄组、使用场景（通勤、休闲、工作）
- **风格关键词**：活泼、鲜艳、简约、深色模式、内容优先、沉浸式等
- **技术栈**：React Native（此项目唯一技术栈）

### 步骤 2：生成设计系统（必需）

**始终使用 `--design-system`** 获取带推理的全面推荐：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system [-p "Project Name"]
```

此命令：
1. 并行搜索领域（product、style、color、landing、typography）
2. 应用来自 `ui-reasoning.csv` 的推理规则选择最佳匹配
3. 返回完整设计系统：模式、风格、颜色、排版、效果
4. 包含要避免的反模式

**示例：**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness service" --design-system -p "Serenity Spa"
```

### 步骤 2b：持久化设计系统（主文件 + 覆盖模式）

要将设计系统**跨会话分层检索**，请添加 `--persist`：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name"
```

这将创建：
- `design-system/MASTER.md` — 包含所有设计规则的全局真理来源
- `design-system/pages/` — 页面特定覆盖文件夹

**带页面特定覆盖：**
```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system --persist -p "Project Name" --page "dashboard"
```

这还将创建：
- `design-system/pages/dashboard.md` — 页面特定偏离主文件的规则

**分层检索工作原理：**
1. 构建特定页面时（例如"Checkout"），首先检查 `design-system/pages/checkout.md`
2. 如果页面文件存在，其规则**覆盖**主文件
3. 如果不存在，仅使用 `design-system/MASTER.md`

**上下文感知检索提示：**
```
I am building the [Page Name] page. Please read design-system/MASTER.md.
Also check if design-system/pages/[page-name].md exists.
If the page file exists, prioritize its rules.
If not, use the Master rules exclusively.
Now, generate the code...
```

### 步骤 3：补充详细搜索（如需要）

获取设计系统后，使用领域搜索获取额外详情：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --domain <domain> [-n <max_results>]
```

**何时使用详细搜索：**

| 需求 | 领域 | 示例 |
|------|--------|---------|
| 产品类型模式 | `product` | `--domain product "entertainment social"` |
| 更多风格选项 | `style` | `--domain style "glassmorphism dark"` |
| 配色方案 | `color` | `--domain color "entertainment vibrant"` |
| 字体搭配 | `typography` | `--domain typography "playful modern"` |
| 图表推荐 | `chart` | `--domain chart "real-time dashboard"` |
| UX 最佳实践 | `ux` | `--domain ux "animation accessibility"` |
| 替代字体 | `typography` | `--domain typography "elegant luxury"` |
| 单个 Google 字体 | `google-fonts` | `--domain google-fonts "sans serif popular variable"` |
| 着陆页结构 | `landing` | `--domain landing "hero social-proof"` |
| React Native 性能 | `react` | `--domain react "rerender memo list"` |
| 应用界面无障碍 | `web` | `--domain web "accessibilityLabel touch safe-areas"` |
| AI 提示词 / CSS 关键词 | `prompt` | `--domain prompt "minimalism"` |

### 步骤 4：技术栈指南（React Native）

获取特定于 React Native 实现的最佳实践：

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "<keyword>" --stack react-native
```

---

## 搜索参考

### 可用领域

| 领域 | 用途 | 示例关键词 |
|--------|---------|------------------|
| `product` | 产品类型推荐 | SaaS、e-commerce、portfolio、healthcare、beauty、service |
| `style` | UI 风格、颜色、效果 | glassmorphism、minimalism、dark mode、brutalism |
| `typography` | 字体搭配、Google 字体 | elegant、playful、professional、modern |
| `color` | 按产品类型的配色方案 | saas、ecommerce、healthcare、beauty、fintech、service |
| `landing` | 页面结构、CTA 策略 | hero、hero-centric、testimonial、pricing、social-proof |
| `chart` | 图表类型、库推荐 | trend、comparison、timeline、funnel、pie |
| `ux` | 最佳实践、反模式 | animation、accessibility、z-index、loading |
| `google-fonts` | 单个 Google 字体查询 | sans serif、monospace、japanese、variable font、popular |
| `react` | React/Next.js 性能 | waterfall、bundle、suspense、memo、rerender、cache |
| `web` | 应用界面指南（iOS/Android/React Native）| accessibilityLabel、touch targets、safe areas、Dynamic Type |
| `prompt` | AI 提示词、CSS 关键词 | （风格名称）|

### 可用技术栈

| 技术栈 | 重点 |
|-------|-------|
| `react-native` | 组件、导航、列表 |

---

## 示例工作流程

**用户请求：** "制作一个 AI 搜索首页。"

### 步骤 1：分析需求
- 产品类型：工具（AI 搜索引擎）
- 目标受众：寻求快速、智能搜索的 C 端用户
- 风格关键词：现代、简约、内容优先、深色模式
- 技术栈：React Native

### 步骤 2：生成设计系统（必需）

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "AI search tool modern minimal" --design-system -p "AI Search"
```

**输出：** 带模式、风格、颜色、排版、效果和反模式的完整设计系统。

### 步骤 3：补充详细搜索（如需要）

```bash
# 获取现代工具产品的风格选项
python3 skills/ui-ux-pro-max/scripts/search.py "minimalism dark mode" --domain style

# 获取搜索交互和加载的 UX 最佳实践
python3 skills/ui-ux-pro-max/scripts/search.py "search loading animation" --domain ux
```

### 步骤 4：技术栈指南

```bash
python3 skills/ui-ux-pro-max/scripts/search.py "list performance navigation" --stack react-native
```

**然后：** 综合设计系统 + 详细搜索并实现设计。

---

## 输出格式

`--design-system` 标志支持两种输出格式：

```bash
# ASCII 框（默认）- 最佳终端显示
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system

# Markdown - 最佳文档格式
python3 skills/ui-ux-pro-max/scripts/search.py "fintech crypto" --design-system -f markdown
```

---

## 获得更好结果的技巧

### 查询策略

- 使用**多维关键词**——结合产品 + 行业 + 语气 + 密度："entertainment social vibrant content-dense" 而不仅仅是 "app"
- 为同一需求尝试不同关键词："playful neon" → "vibrant dark" → "content-first minimal"
- 首先使用 `--design-system` 获取完整推荐，然后使用 `--domain` 深入你不确定的任何维度
- 始终添加 `--stack react-native` 以获取特定于实现的指导

### 常见问题

| 问题 | 解决方案 |
|---------|------------|
| 无法决定风格/颜色 | 使用不同关键词重新运行 `--design-system` |
| 深色模式对比度问题 | 快速参考 §6：`color-dark-mode` + `color-accessible-pairs` |
| 动画感觉不自然 | 快速参考 §7：`spring-physics` + `easing` + `exit-faster-than-enter` |
| 表单 UX 差 | 快速参考 §8：`inline-validation` + `error-clarity` + `focus-management` |
| 导航感觉混乱 | 快速参考 §9：`nav-hierarchy` + `bottom-nav-limit` + `back-behavior` |
| 小屏幕布局破坏 | 快速参考 §5：`mobile-first` + `breakpoint-consistency` |
| 性能/卡顿 | 快速参考 §3：`virtualize-lists` + `main-thread-budget` + `debounce-throttle` |

### 交付前检查清单

- 在实现前运行 `--domain ux "animation accessibility z-index loading"` 作为 UX 验证
- 在最终审查中浏览快速参考 **§1–§3**（关键 + 高优先级）
- 在 375px（小手机）和横屏方向上测试
- 在启用 **reduced-motion** 和 **Dynamic Type** 最大尺寸下验证行为
- 独立检查深色模式对比度（不要假设浅色模式值适用）
- 确认所有点击目标 ≥44pt 且没有内容藏在安全区域后面

---

## 专业 UI 常见规则

这些是经常被忽视的问题，会使 UI 看起来不专业：
范围说明：以下规则适用于应用 UI（iOS/Android/React Native/Flutter），而非桌面 Web 交互模式。

### 图标和视觉元素

| 规则 | 标准 | 避免 | 为什么重要 |
|------|----------|--------|----------------|
| **不用 Emoji 作为结构图标** | 使用基于矢量的图标（例如 Lucide、react-native-vector-icons、@expo/vector-icons）。 | 使用 emoji（🎨 🚀 ⚙️）进行导航、设置或系统控制。 | Emoji 依赖字体，跨平台不一致，且无法通过设计令牌控制。 |
| **仅矢量资源** | 使用 SVG 或平台矢量图标，可清晰缩放并支持主题化。 | 会模糊或像素化的栅格 PNG 图标。 | 确保可扩展性、清晰渲染和深色/浅色模式适应性。 |
| **稳定的交互状态** | 使用颜色、不透明度或 Elevation 过渡进行按下状态，不改变布局边界。 | 会移动周围内容或导致视觉抖动的布局偏移变换。 | 防止不稳定交互并保持移动端流畅动效/感知质量。 |
| **正确的品牌标识** | 使用官方品牌资源并遵循其使用指南（间距、颜色、留白）。 | 猜测标识路径、非官方重新着色或修改比例。 | 防止品牌滥用并确保法律/平台合规。 |
| **一致的图标尺寸** | 将图标尺寸定义为设计令牌（例如 icon-sm、icon-md = 24pt、icon-lg）。 | 随机混用任意值如 20pt / 24pt / 28pt。 | 保持界面的节奏和视觉层次。 |
| **描边一致性** | 在同一视觉层内使用一致的描边宽度（例如 1.5px 或 2px）。 | 任意混用粗细描边样式。 | 不一致的描边会降低感知精致度和凝聚力。 |
| **填充 vs 轮廓规范** | 在同一层次级别使用一种图标风格。 | 在同一层次级别混用填充和轮廓图标。 | 保持语义清晰和风格连贯。 |
| **点击目标最小尺寸** | 最小 44×44pt 交互区域（如果图标较小使用 hitSlop）。 | 没有扩展点击区域的小图标。 | 满足无障碍和平台可用性标准。 |
| **图标对齐** | 将图标对齐到文本基线并保持一致的间距。 | 图标不对齐或周围间距不一致。 | 防止降低感知质量的细微视觉不平衡。 |
| **图标对比度** | 遵循 WCAG 对比度标准：小元素 4.5:1，较大 UI 符号最小 3:1。 | 与背景融合的低对比度图标。 | 确保浅色和深色模式下的无障碍性。 |

### 交互（应用）

| 规则 | 做法 | 避免 |
|------|----|----- |
| **点击反馈** | 在 80-150ms 内提供清晰的按下反馈（涟漪/不透明度/Elevation）| 点击时无视觉响应 |
| **动画时序** | 微交互保持在 150-300ms，使用平台原生缓动 | 即时转场或慢动画（>500ms）|
| **无障碍焦点** | 确保屏幕阅读器焦点顺序匹配视觉顺序且标签具有描述性 | 无标签控件或混乱的焦点遍历 |
| **禁用状态清晰度** | 使用禁用语义（`disabled`/原生 disabled props）、降低强调且无点击操作 | 看起来可点击但什么都不做的控件 |
| **点击目标最小尺寸** | 保持点击区域 >=44x44pt（iOS）或 >=48x48dp（Android），图标较小时扩展点击区域 | 微小的点击目标或没有内边距的仅图标点击区域 |
| **手势冲突预防** | 每个区域保持一个主要手势，避免嵌套点击/拖动冲突 | 导致意外操作的重叠手势 |
| **语义原生控件** | 优先使用原生交互原语（Button、Pressable、平台等效项）并带有适当的 accessibility roles | 用作主要控件的通用容器且无语义 |

### 浅色/深色模式对比度

| 规则 | 做法 | 避免 |
|------|----|----- |
| **表面可读性（浅色）** | 使用足够的不透明度/Elevation 使卡片/表面与背景清晰分离 | 过度透明的表面模糊层次 |
| **文本对比度（浅色）** | 保持正文对比度 >=4.5:1 相对于浅色表面 | 低对比度灰色正文文本 |
| **文本对比度（深色）** | 保持主要文本对比度 >=4.5:1，次要文本 >=3:1 相对于深色表面 | 融入背景的深色模式文本 |
| **边框和分隔线可见性** | 确保分隔线在两种主题下都可见（不只是浅色模式）| 在一种模式下消失的主题特定边框 |
| **状态对比度对等** | 在浅色和深色主题中保持按下/聚焦/禁用状态同样可区分 | 仅定义一种主题的交互状态 |
| **令牌驱动主题** | 使用跨应用表面/文本/图标的语义颜色令牌映射每种主题 | 硬编码的每屏幕十六进制值 |
| **遮罩和模态可读性** | 使用足够强的模态遮罩以隔离前景内容（通常为 40-60% 黑色）| 遮罩太弱导致背景视觉竞争 |

### 布局和间距

| 规则 | 做法 | 避免 |
|------|----|----- |
| **安全区域合规** | 为所有固定页眉、标签栏和 CTA 栏尊重顶部/底部安全区域 | 将固定 UI 放置在刘海、状态栏或手势区域下方 |
| **系统栏间距** | 为状态/导航栏和手势主页指示器添加间距 | 让可点击内容与操作系统界面碰撞 |
| **一致的内容宽度** | 保持每种设备类别（手机/平板）可预测的内容宽度 | 屏幕间混用任意宽度 |
| **8dp 间距节奏** | 使用一致的 4/8dp 间距系统用于 padding/gaps/段落间距 | 无节奏的随机间距增量 |
| **可读文本测量** | 在大设备上保持长文本可读（避免平板上的边到边段落）| 损害可读性的全宽长文本 |
| **段落间距层次** | 通过层次定义清晰的垂直节奏层级（例如 16/24/32/48）| 相似 UI 级别的间距不一致 |
| **按断点自适应 gutter** | 在更大宽度和横屏下增加水平缩进 | 所有设备尺寸/方向使用相同窄 gutter |
| **滚动和固定元素共存** | 添加底部/顶部内容缩进以使列表不被固定栏隐藏 | 滚动内容被固定/粘性页眉/页脚遮挡 |

---

## 交付前检查清单

交付 UI 代码前，验证以下项目：
范围说明：此检查清单适用于应用 UI（iOS/Android/React Native/Flutter）。

### 视觉质量
- [ ] 不用 emoji 作为图标（改用 SVG）
- [ ] 所有图标来自一致的图标家族和风格
- [ ] 使用正确比例和留白的官方品牌资源
- [ ] 按下状态视觉不会偏移布局边界或导致抖动
- [ ] 一致使用语义主题令牌（无临时每屏幕硬编码颜色）

### 交互
- [ ] 所有可点击元素提供清晰的按下反馈（涟漪/不透明度/Elevation）
- [ ] 点击目标满足最小尺寸（iOS >=44x44pt，Android >=48x48dp）
- [ ] 微交互时序保持在 150-300ms 范围内，具有原生感觉的缓动
- [ ] 禁用状态视觉清晰且不可交互
- [ ] 屏幕阅读器焦点顺序匹配视觉顺序，交互标签具有描述性
- [ ] 手势区域避免嵌套/冲突交互（点击/拖动/返回滑动冲突）

### 浅色/深色模式
- [ ] 主要文本对比度在浅色和深色模式下都 >=4.5:1
- [ ] 次要文本对比度在浅色和深色模式下都 >=3:1
- [ ] 分隔线/边框和交互状态在两种模式下都可区分
- [ ] 模态框/drawer 遮罩不透明度足够保持前景可读性（通常 40-60% 黑色）
- [ ] 两种主题都经过测试才交付（而非从单一主题推断）

### 布局
- [ ] 页眉、标签栏和底部 CTA 栏尊重安全区域
- [ ] 滚动内容不被固定/粘性栏遮挡
- [ ] 在小手机、大手机和平板（竖屏 + 横屏）上验证
- [ ] 水平缩进/gutter 按设备尺寸和方向正确自适应
- [ ] 在组件、段落和页面级别保持 4/8dp 间距节奏
- [ ] 长文本在大设备上保持可读性（无边到边段落）

### 无障碍
- [ ] 所有有意义的图片/图标都有无障碍标签
- [ ] 表单字段有标签、提示和清晰的错误消息
- [ ] 颜色不是唯一指示器
- [ ] 支持 reduced motion 和动态文字大小且不会破坏布局
- [ ] 正确宣布无障碍特性/角色/状态（selected、disabled、expanded）
