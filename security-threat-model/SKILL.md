---
name: "security-threat-model"
description: "Repository-grounded threat modeling that enumerates trust boundaries, assets, attacker capabilities, abuse paths, and mitigations, and writes a concise Markdown threat model. Trigger only when the user explicitly asks to threat model a codebase or path, enumerate threats/abuse paths, or perform AppSec threat modeling. Do not trigger for general architecture summaries, code review, or non-security design work."
---

# Threat Model Source Code Repo

交付一份可执行、AppSec 级别的威胁模型，其内容必须针对仓库或项目路径本身，而不是通用检查清单。将每一项架构声明都锚定到仓库中的证据，并保持假设明确。优先关注真实攻击者目标和具体影响，而非泛化清单。

## Quick start

1) 收集（或推断）输入：
- 仓库根路径及任何纳入范围的路径。
- 预期用途、部署模型、互联网暴露面与认证预期（若已知）。
- 现有的仓库摘要或架构规范。
- 使用 `references/prompt-template.md` 中的提示生成仓库摘要。
- 遵循 `references/prompt-template.md` 中要求的输出契约；可行时尽量逐字使用。

## Workflow

### 1) Scope and extract the system model
- 从仓库摘要中识别主要组件、数据存储和外部集成。
- 识别系统运行形态（server、CLI、library、worker）及其入口点。
- 将运行时行为与 CI/构建/开发工具、测试/示例明确分离。
- 将纳入范围的位置映射到这些组件，并明确排除范围外项。
- 没有证据时，不得声明组件、流程或控制措施。

### 2) Derive boundaries, assets, and entry points
- 将 trust boundaries 枚举为组件之间的具体边界连接，并注明协议、认证、加密、校验与限流。
- 列出驱动风险的资产（数据、凭据、模型、配置、计算资源、审计日志）。
- 识别入口点（endpoints、上传面、parsers/decoders、任务触发器、管理工具、日志/错误汇聚点）。

### 3) Calibrate assets and attacker capabilities
- 列出驱动风险的资产（凭据、PII、完整性关键状态、可用性关键组件、构建产物）。
- 基于暴露面和预期用途描述现实的攻击者能力。
- 明确记录非能力项，避免夸大严重性。


### 4) Enumerate threats as abuse paths
- 优先选择可映射到资产和边界的攻击者目标（数据外泄、权限提升、完整性破坏、拒绝服务）。
- 对每个威胁进行分类，并关联其受影响资产。
- 保持威胁数量精简，但确保质量高。

### 5) Prioritize with explicit likelihood and impact reasoning
- 使用定性可能性与影响（low/medium/high），并附简短依据。
- 以可能性 x 影响设定总体优先级（critical/high/medium/low），并结合现有控制措施进行调整。
- 说明哪些假设对排序影响最大。

### 6) Validate service context and assumptions with the user
- 总结会实质影响威胁排序或范围的关键假设，然后请用户确认或修正。
- 提出 1–3 个有针对性的问题以补齐缺失上下文（服务负责人和环境、规模/用户、部署模型、authn/authz、互联网暴露、数据敏感性、多租户）。
- 在产出最终报告前暂停并等待用户反馈。
- 如果用户拒绝回答或无法回答，说明仍保留哪些假设及其对优先级的影响。

### 7) Recommend mitigations and focus paths
- 区分现有缓解措施（附证据）与建议缓解措施。
- 将缓解措施绑定到具体位置（组件、边界或入口点）和控制类型（authZ 检查、输入校验、schema 强制、沙箱化、限流、密钥隔离、审计日志）。
- 优先提供具体实现提示，而非泛化建议（例如“在网关对上传载荷强制 schema”优于“校验输入”）。
- 基于已验证的用户上下文提出建议；若假设仍未解，应将建议标记为有条件项。

### 8) Run a quality check before finalizing
- 确认所有已发现入口点都已覆盖。
- 确认每个 trust boundary 都在威胁中有所体现。
- 确认运行时与 CI/dev 已分离。
- 确认用户澄清信息（或明确未回复）已反映。
- 确认假设与待解决问题已明确写出。
- 确认报告格式与提示模板定义的要求输出格式高度一致：`references/prompt-template.md`
- 将最终 Markdown 写入名为 `<repo-or-dir-name>-threat-model.md` 的文件（使用仓库根目录 basename；若要求建模子路径，则使用该纳入范围目录名）。


## Risk prioritization guidance (illustrative, not exhaustive)
- High：认证前 RCE、认证绕过、跨租户访问、敏感数据外泄、密钥或令牌窃取、模型或配置完整性破坏、沙箱逃逸。
- Medium：针对关键组件的定向 DoS、部分数据暴露、造成可测量影响的限流绕过、影响检测能力的日志/指标投毒。
- Low：低敏信息泄露、易缓解的噪声型 DoS、需要不太可能前置条件的问题。

## References

- 输出契约与完整提示模板：`references/prompt-template.md`
- 可选控制/资产清单：`references/security-controls-and-assets.md`

只加载你实际需要的参考文件。保持最终结果简洁、可溯源且可评审。
