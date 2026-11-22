# 路线图

本文档描述 OpenCodeReview 未来一年的规划方向。这是一份动态文档，将随优先级变化而更新。

欢迎通过 [GitHub Discussions](https://github.com/alibaba/open-code-review/discussions) 或 [Issues](https://github.com/alibaba/open-code-review/issues) 提供反馈。

## 当前状态（2026 年中）

OpenCodeReview 目前提供：

- CLI 工具（`ocr`），用于 AI 驱动的代码审查，采用确定性工程与智能体混合架构。
- 与编码智能体集成：Claude Code（插件/技能）、Codex（插件）、Cursor（插件）和 Kimi Code（插件）。
- VSCode 扩展，用于编辑器内代码审查。
- CI/CD 集成（GitHub Actions、GitLab CI 等）。
- 多提供商 LLM 支持（OpenAI 兼容、Anthropic、Google Gemini、Amazon Bedrock、Azure OpenAI 等）。
- MCP 服务器——通过 [Model Context Protocol](https://modelcontextprotocol.io/) 暴露 OpenCodeReview，使任何兼容 MCP 的客户端都能调用审查能力。
- 审查规则引擎，支持按文件模式匹配。
- 多语言文档（英语、中文、日语、韩语、俄语）。

## 计划——2026 年下半年

### ACP 服务器适配器

- **实验性：仅支持本地源码构建**——通过独立的 ACP v1 stdio 适配器将 OCR 暴露为专用审查智能体，协议处理与核心审查引擎分离。审查/扫描、命令发现、进度、发现项和取消均已实现。配置和支持边界见[适配器文档](acp/README.md)。

### IDE 插件

- **JetBrains 插件**——将 AI 代码审查引入 IntelliJ IDEA、GoLand、PyCharm 及其他 JetBrains IDE，能力与现有 VSCode 扩展相同。

### 委托模式

- **对订阅友好的审查**——一种可选模式，`ocr` 不再依赖单独配置的 LLM 端点。`ocr` 不自行调用 LLM，而是解析审查范围、应用排除规则、加载审查规则、注入背景上下文并收集差异，然后将这些作为结构化审查任务交给宿主编码智能体（如 Claude Code），由其使用自身的智能体循环和所含订阅额度执行——无需独立的 API 密钥。

### 超级模式

- **更高召回率的审查模式**——一种可选模式，以更高的 token 消耗和审查时间换取显著更高的问题召回率。适用于安全敏感或高风险变更集，此类场景下彻底性比速度更重要。

## 计划——2027 年上半年

### 领域特定长期记忆

- **持久化审查知识**——使审查引擎能够随时间积累领域特定知识（重复出现的模式、过往审查决策、项目特定约定）并应用于未来审查，提升相关性并减少重复反馈。

## 不计划

以下内容在可预见的未来明确不在范围内：

- **无人审查的自动代码修复**——OCR 是审查工具，不是自动修复工具。它可以建议修复，但应用更改始终需要人工批准。
- **通用 AI 编码助手**——OCR 专注于代码审查。代码生成、重构或基于聊天的编码辅助等功能不在计划内。
- **自托管 LLM 捆绑**——OCR 连接外部 LLM 提供商，但不捆绑或自行托管模型。