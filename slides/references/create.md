# 创建幻灯片

基于用户提供的任务内容（主题、页数、受众、数据要点等）创建策略性 HTML 演示文稿。

## 步骤

1. **解析任务** — 提取主题、目标受众、页数、核心数据与期望语气；信息不足时先向用户确认。
2. **选择策略** — 参考 `references/slide-strategies.md` 确定叙事结构与章节划分。
3. **选用布局与文案** — 参考 `references/layout-patterns.md` 选择每页布局；参考 `references/copywriting-formulas.md` 优化标题与要点文案。
4. **生成 HTML** — 以 `references/html-template.md` 为基础模板，使用 Chart.js 呈现数据图表。
   - 设计令牌：如项目已有设计令牌（如 design-system 生成的 `assets/design-tokens.css`），引入并引用其中的 CSS 变量；没有则使用模板内置样式变量。
5. **产出与交付** — 将 HTML 文件写入用户指定或项目约定的输出位置（未指定时先与用户确认），在浏览器中逐页检查布局与图表后交付。

## 任务

[用户提供的任务内容]
