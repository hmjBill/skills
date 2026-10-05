# LinkedIn 个人资料自动化操作手册

## 会话所有权

LinkedIn 个人资料的各个区块共享同一个已认证账户和发布
界面。为选定的真实 Stable profile 使用一个命名会话/写入方；
不要仅因区块不同就并行执行资料变更。

wrapper 会自动将该通道（lane）挂接到选定的真实 Stable profile：
```bash
agent-browser --session linkedin-exp open https://www.linkedin.com/in/USERNAME
```

## 交互前检查清单

在 LinkedIn 上进行任何交互之前：

1. **先关闭横幅** — LinkedIn 会显示 "Update to our terms" 之类的横幅。先快照，找到关闭/忽略按钮（通常是 "Learn more" 附近一个未标注的 `[button]`），点击它。
2. **使用第二个 "Add section" 链接** — 第一个 "Add profile section" 链接（`[nth=0]`）靠近导航栏，点击常常落到 LinkedIn 的 "For Business" 下拉菜单上。点击前务必先对第二个（`[nth=1]`）执行 `scrollintoview`。
3. **绝不按 Escape** — LinkedIn 的 SPA 会将 Escape 解释为 "Discard changes?"，从而打开确认对话框。要关闭下拉菜单，请点击别处或移到下一个字段。
4. **先导航到个人资料** — `agent-browser open https://www.linkedin.com/in/USERNAME`

## 操作手册：添加经历条目

### 导航
1. 滚动到第二个 "Add profile section" 按钮并点击
2. 在下拉菜单中：点击 "Add position"（位于 "Core" 区块下）
3. 等待模态表单出现，然后快照

### 逐字段参考

| 字段 | 快照类型 | 命令 | 备注 |
|-------|--------------|---------|-------|
| 标题 | `[textbox]` | `fill @ref "Founder & Lead Engineer"` | 标准文本输入 |
| 公司 | `[combobox]` | `fill @ref "MANTIS"` → `wait 1000` → snapshot → click dropdown option | 自动补全——输入部分文本，等待建议出现，点击匹配项。若无匹配，LinkedIn 会创建一个新公司条目。 |
| 雇佣类型 | `[combobox]` | `select @ref "Full-time"` | 选项：Full-time、Part-time、Self-employed、Freelance、Contract、Internship、Apprenticeship、Seasonal |
| 目前在职 | `[checkbox]` | `check @ref`（当前职位）或 `uncheck @ref`（过往职位） | 控制是否出现结束日期字段 |
| 开始月份 | `[combobox]` | `select @ref "January"` | 原生类似 select 的下拉框 |
| 开始年份 | `[combobox]` | `select @ref "2025"` | 原生类似 select 的下拉框 |
| 结束月份 | `[combobox]` | `select @ref "December"` | 仅在取消勾选 "currently working" 时可见 |
| 结束年份 | `[combobox]` | `select @ref "2024"` | 仅在取消勾选 "currently working" 时可见 |
| 地点 | `[combobox]` | `fill @ref "Bali"` → `wait 1000` → snapshot → click option | 自动补全——输入部分文本，等待，点击 |
| 地点类型 | `[combobox]` | `select @ref "Remote"` | 选项：On-site、Hybrid、Remote |
| 描述 | `[contenteditable]` | 使用 eval（见下） | 富文本编辑器——fill/type 不起作用 |

### 描述字段（contenteditable）

```bash
agent-browser eval --stdin <<'EVALEOF'
const el = document.querySelector('[contenteditable="true"]');
el.innerHTML = `Your description text here.

Use line breaks for formatting.
- Bullet points work
- Keep under ~2000 chars`;
el.dispatchEvent(new InputEvent('input', { bubbles: true }));
EVALEOF
```

### 保存之后
1. 点击 Save 按钮
2. 等待模态关闭：`wait --load networkidle`
3. LinkedIn 可能显示后续提示（"Add skills to this position?"、"Notify network?"）——快照并点击 "Skip"、"Not now" 或关闭按钮
4. 添加下一个条目前重新快照

### 多个条目重复操作
保存一个条目后，重新导航到 "Add position" 并重复。每次保存都会关闭模态并返回个人资料页。

## 操作手册：添加技能

### 导航
1. 滚动到第二个 "Add profile section" 按钮 → 点击
2. 点击 "Add skills"（位于 "Core" 区块下）
3. 等待技能模态出现

### 工作流（每项技能）
```
1. snapshot -i                          # 定位
2. fill @search-ref "AI Development"   # 在搜索框输入技能名称
3. wait 1000                           # 等待下拉结果
4. snapshot -i                          # 查看下拉选项
5. click @option-ref                   # 点击匹配的技能选项（通常是 [button] 或 [option]）
```

### 备注
- LinkedIn 有固定分类体系——某些自定义技能名可能无法精确匹配。使用最接近的可用选项。
- 选择技能后，LinkedIn 可能询问 "Where did you use this skill?"——点击 "Skip" 或关闭
- 最多可添加 100 项技能
- 前 3 项技能会突出展示——先添加最重要的技能
- 技能在同一模态中逐个添加（无需重新打开）

### 要添加的技能（按重要性排序）
1. AI Development
2. Claude Code
3. Python
4. AI Governance
5. Browser Automation
6. Full-Stack Development
7. Docker
8. PostgreSQL
9. React
10. Next.js
11. Flask
12. Business Automation
13. WhatsApp API
14. Machine Learning
15. Content Strategy
16. Open Source

## 操作手册：添加精选链接

### 导航
1. 滚动到第二个 "Add profile section" 按钮 → 点击
2. 点击 "Add Featured"（位于 "Recommended" 区块下）
3. 点击 "+" 按钮或 "Add a link" 选项

### 工作流（每条链接）
```
1. snapshot -i                              # 定位
2. fill @url-ref "https://erebora.org"      # 粘贴 URL
3. click @add-button                        # 点击 Add/Submit
4. wait 2000                                # 等待 LinkedIn 抓取 URL 元数据
5. snapshot -i                              # 查看预览表单
6. DO NOT modify title or description       # 关键——见下文
7. click @save-button                       # 使用自动填充的默认值保存
```

### 关键：不要修改自动填充的字段

粘贴 URL 时，LinkedIn 会抓取页面元数据并自动填充 Title 和 Description。**对这些字段使用 `fill` 会破坏 React 的内部状态，导致 "Save failed"。** 这一点经过 3 次失败尝试得到验证。

**可行做法：** 使用 LinkedIn 自动填充的内容保存。如需修改标题/描述，请在保存之后进行（通过已保存精选条目上的铅笔编辑图标）。

### 要添加的链接
1. `https://erebora.org/kittyAI` — MANTIS 落地页
2. `https://github.com/CalebDane7/agent-browser` — Agent-Browser GitHub
3. `https://erebora.org` — Erebora Motorcycles

## 操作手册：编辑 Headline / About 区块

### Headline
LinkedIn 的 headline 是 contenteditable 字段。点击 headline 旁的铅笔/编辑图标，然后：

```bash
agent-browser eval --stdin <<'EVALEOF'
const el = document.querySelector('[contenteditable="true"]');
el.innerHTML = 'Your headline text here';
el.dispatchEvent(new InputEvent('input', { bubbles: true }));
EVALEOF
```

然后点击 Save。

### About 区块
相同模式——点击 About 区块上的 "Edit"，找到 contenteditable div，使用 eval：

```bash
agent-browser eval --stdin <<'EVALEOF'
const el = document.querySelector('[contenteditable="true"]');
el.innerHTML = `Your about section text here.

Multiple paragraphs work.
Keep under 2,600 characters.`;
el.dispatchEvent(new InputEvent('input', { bubbles: true }));
EVALEOF
```

**注意：** 若可见多个 contenteditable 字段，请使用更具体的选择器，定位 About 区块的父容器。

## LinkedIn 已知怪癖

1. **"Add section" 导航栏冲突** — 第一个 "Add profile section" 链接靠近顶部导航栏。不滚动就点击可能命中 LinkedIn 的 "For Business" 下拉按钮。点击前务必对第二个实例执行 `scrollintoview`。

2. **自动填充元数据破坏 React 状态** — 在 Featured Links 中，LinkedIn 抓取 URL 元数据并填充 Title/Description。对这些字段使用 `fill` 会破坏 React 内部状态 → "Save failed"。绝不修改自动填充的元数据字段。

3. **"Update to our terms" 横幅** — LinkedIn 会定期在顶部显示一个带未标注关闭按钮的横幅。该横幅会拦截对其下方元素的点击。先关闭它（寻找 "Learn more" 附近未标注的 `[button]`）。

4. **Escape 触发丢弃对话框** — 在任何模态中按 Escape 都会触发 "Discard changes?" 确认。绝不使用 Escape。要关闭下拉菜单，请点击另一个字段或点击下拉菜单外的区域。

5. **`type` 追加，`fill` 替换** — 对已填充字段使用 `type` 会产生 "Existing TextNew Text"。始终使用 `fill` 先清空再输入。唯一例外是有意追加到现有值。

6. **每次模态/下拉交互后 refs 都会失效** — LinkedIn 的 React 应用频繁重渲染。在任何打开下拉、选择选项、打开模态或关闭模态的点击之后，所有 refs 都会过期。下一次交互前重新快照。

7. **保存后的后续提示** — 保存一条经历条目后，LinkedIn 常显示 "Add skills to this position?"、"Notify your network?" 或建议对话框。这些会阻塞后续交互，直到被关闭。快照并点击 "Skip"/"Not now"/"Close"。

8. **公司自动补全会创建新条目** — 如果输入的公司名与 LinkedIn 数据库不匹配，它会悄悄创建新的公司页面。对于新公司/小公司通常没问题，但意味着不会显示 logo。

9. **跨标签页共享会话** — LinkedIn 使用单一认证会话。agent-browser 中多个 `--session` 标志会创建独立的浏览器上下文，但只要通过 CDP 连接到同一 Chrome 实例，它们就共享相同的 LinkedIn 登录 Cookie。每个会话在用户的 Chrome 中打开自己的标签页。

10. **地点自动补全很慢** — 地点字段的建议可能需要 2-3 秒才出现。输入后使用 `wait 2000`，然后再快照获取下拉选项。
