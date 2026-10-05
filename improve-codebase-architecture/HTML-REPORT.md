# HTML 报告格式

架构审查渲染为操作系统临时目录中的单个自包含 HTML 文件。Tailwind 和 Mermaid 都来自 CDN。Mermaid 可靠地处理图形状图示；手工构建的 div 和内联 SVG 处理更编辑性的视觉（质量图、剖面图）。把两者混用：不要什么都依赖 Mermaid，否则会开始显得千篇一律。

## 脚手架

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Architecture review for {{repo name}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      /* small custom layer for things Tailwind doesn't cover cleanly:
         dashed seam lines, hand-drawn-feeling arrow heads, etc. */
      .seam { stroke-dasharray: 4 4; }
      .leak { stroke: #dc2626; }
      .deep { background: linear-gradient(135deg, #0f172a, #1e293b); }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-5xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="candidates" class="space-y-10">...</section>
      <section id="top-recommendation">...</section>
    </main>
  </body>
</html>
```

## 页眉

仓库名、日期，以及一份紧凑图例：实线框 = 模块，虚线 = 接缝，红色箭头 = 泄漏，深色粗框 = 深层模块。没有介绍段落。直接进入候选。

## 候选卡片

图示承担主要分量。文字稀疏、平实，直接使用（来自 `/codebase-design` 技能的）术语表词汇，不事雕琢。

每个候选是一个 `<article>`：

- **标题**：简短，点明深化（例如"合并 Order intake 流水线"）。
- **徽章行**：推荐强度（`Strong` = 翠绿，`Worth exploring` = 琥珀，`Speculative` = 石板灰），外加一个依赖类别标签（`in-process`、`local-substitutable`、`ports & adapters`、`mock`）。
- **文件**：等宽列表，`font-mono text-sm`。
- **Before / After 图**：核心部分。两栏并排。见下方模式。
- **问题**：一句话。哪里疼。
- **解决方案**：一句话。改什么。
- **收益**：项目符号，每条 ≤6 个词。例如"测试只打一个接口""定价逻辑不再泄漏""删掉 4 个浅层包装"。
- **ADR 提示框**（如适用）：一行，放在琥珀色调框中。

不要解释性段落。如果一张图需要一段文字才能被理解，重画这张图。

## 图示模式

选择适合候选的模式。混用它们。不要让每张图看起来都一样。多样性正是要点之一。

### Mermaid 图（依赖 / 调用流的主力）

当要点是"X 调 Y，Y 调 Z，看看这一团乱"时，用 Mermaid `flowchart` 或 `graph`。把它包进 Tailwind 样式的卡片，免得像空降进来的。用 classDef 把泄漏边染红、把深层模块染深色。时序图很适合"before：6 次往返；after：1 次"。

```html
<div class="rounded-lg border border-slate-200 bg-white p-4">
  <pre class="mermaid">
    flowchart LR
      A[OrderHandler] --> B[OrderValidator]
      B --> C[OrderRepo]
      C -.leak.-> D[PricingClient]
      classDef leak stroke:#dc2626,stroke-width:2px;
      class C,D leak
  </pre>
</div>
```

### 手工构建的框与箭头（当 Mermaid 的布局与你较劲时）

模块是带边框和标签的 `<div>`。箭头是绝对定位在相对容器上的内联 SVG `<line>` 或 `<path>`。当你希望 "after" 图看起来像一个粗边框的深层模块、内部变灰时用这个，因为 Mermaid 渲染不出正确的重量感。

### 剖面图（适合分层浅层）

堆叠水平条带（`h-12 border-l-4`）来展示一次调用穿过的各层。Before：6 个薄层，每层什么也没做。After：1 个厚条带，标注合并后的职责。

### 质量图（适合"接口和实现一样宽"）

每个模块两个矩形：一个表示接口表面积，一个表示实现。Before：接口矩形几乎和实现矩形一样高（浅层）。After：接口矩形矮，实现矩形高（深层）。

### 调用图折叠

Before：函数调用树渲染为嵌套盒子。After：同一棵树折叠进一个盒子，现在变成内部的调用在其中以淡化形式显示。

## 样式指导

- 偏编辑性，不要企业仪表盘。大量留白。标题可选用衬线字体（`font-serif` 与 stone/slate 搭配很好）。
- 克制用色：一个强调色（emerald 或 indigo），加上红色表示泄漏、琥珀表示警告。
- 图保持约 320px 高，让 before/after 并排时不需滚动。
- 图内模块标签用 `text-xs uppercase tracking-wider`，让它们读起来像示意图，而不是 UI。
- 唯一的脚本是 Tailwind CDN 和 Mermaid ESM 导入。报告除此之外是静态的：没有应用代码，除 Mermaid 自身渲染外没有交互。

## Top recommendation 部分

一张更大的卡片。候选名称、一句为什么、指向其卡片的锚点链接。就这样。

## 语气

平实中文、简洁，但架构名词和动词直接来自 `/codebase-design` 技能。简洁不是漂移的借口。

**准确使用**：模块、接口、实现、深度、深、浅、接缝、适配器、杠杆效应、局部性。

**禁用词（绝不替换）**：组件、服务、单元（代替模块）· API、签名（代替接口）· 边界（代替接缝）· 层、包装（当你的意思是模块时）。

**符合风格的措辞：**

- "Order intake 模块是浅层的：接口几乎与实现相称。"
- "定价逻辑跨接缝泄漏。"
- "深化：一个接口，一处可测。"
- "两个适配器让接缝成立：生产用 HTTP，测试用内存。"

**收益项目符号**用词汇表术语命名收益：*"局部性：bug 集中在一个模块"*、*"杠杆效应：一个接口，N 个调用点"*、*"接口收缩；实现吸收包装层"*。不要写*"更易维护"*或*"代码更干净"*，因为这些术语不在词汇表中，也配不上位置。

不要含糊其辞、不要清嗓子、不要"值得注意的是……"。如果一句话能变成项目符号，就变成项目符号。如果一条项目符号可以删，就删。如果术语不在 `/codebase-design` 词汇表中，先找一个在表中的，再考虑发明新的。
